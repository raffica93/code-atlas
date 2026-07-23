import ts from 'typescript';
import path from 'node:path';
import type { AtlasEdge, AtlasNode } from './schema.js';
import type { AtlasAnnotations } from './annotations.js';
import { inferLayer } from './layers.js';

export interface PendingCall {
  from: string;
  receiverType?: string;
  method: string;
  text: string;
  file: string;
  line: number;
}

export interface LanguageAnalysis {
  nodes: AtlasNode[];
  edges: AtlasEdge[];
  pendingCalls: PendingCall[];
  symbolIds: string[];
}

export function analyzeTypeScriptFile(
  root: string,
  absoluteFile: string,
  content: string,
  annotations: AtlasAnnotations
): LanguageAnalysis {
  const rel = normalize(path.relative(root, absoluteFile));
  const source = ts.createSourceFile(rel, content, ts.ScriptTarget.Latest, true);
  const nodes: AtlasNode[] = [];
  const edges: AtlasEdge[] = [];
  const pendingCalls: PendingCall[] = [];
  const symbolIds: string[] = [];
  const layer = inferLayer(rel, annotations.layer);
  const fileId = `file:${rel}`;

  nodes.push({
    id: fileId,
    kind: 'File',
    name: path.basename(rel),
    language: 'typescript',
    layer,
    source: { file: rel, line: 1 },
    summary: annotations.summary
  });

  const classTypes = new Map<string, Map<string, string>>();

  for (const statement of source.statements) {
    if (!ts.isClassDeclaration(statement) || !statement.name) continue;
    const className = statement.name.text;
    const classId = `ts:${rel}#${className}`;
    const line = source.getLineAndCharacterOfPosition(statement.getStart()).line + 1;
    nodes.push({
      id: classId,
      kind: 'Class',
      name: className,
      language: 'typescript',
      layer,
      source: { file: rel, line },
      summary: annotations.summary
    });
    symbolIds.push(classId);
    edges.push(edge(fileId, classId, 'CONTAINS', 1, 'TypeScript AST'));

    const properties = new Map<string, string>();
    for (const member of statement.members) {
      if (ts.isConstructorDeclaration(member)) {
        for (const parameter of member.parameters) {
          const paramName = parameter.name.getText(source).replace(/^this\./, '');
          const type = parameter.type?.getText(source);
          if (type) properties.set(paramName, stripGeneric(type));
        }
      }
      if (ts.isPropertyDeclaration(member) && member.name && member.type) {
        properties.set(member.name.getText(source), stripGeneric(member.type.getText(source)));
      }
    }
    classTypes.set(className, properties);

    for (const member of statement.members) {
      if (!ts.isMethodDeclaration(member) || !member.name) continue;
      const methodName = member.name.getText(source);
      const methodId = `ts:${rel}#${className}.${methodName}`;
      const methodLine = source.getLineAndCharacterOfPosition(member.getStart()).line + 1;
      nodes.push({
        id: methodId,
        kind: 'Method',
        name: `${className}.${methodName}()`,
        language: 'typescript',
        layer,
        source: { file: rel, line: methodLine },
        summary: extractLeadingComment(source, member) ?? annotations.summary,
        metadata: { className, methodName }
      });
      symbolIds.push(methodId);
      edges.push(edge(classId, methodId, 'CONTAINS', 1, 'TypeScript AST'));
      collectCalls(source, member, methodId, properties, pendingCalls, rel);
    }
  }

  for (const statement of source.statements) {
    if (!ts.isFunctionDeclaration(statement) || !statement.name) continue;
    const name = statement.name.text;
    const id = `ts:${rel}#${name}`;
    const line = source.getLineAndCharacterOfPosition(statement.getStart()).line + 1;
    nodes.push({ id, kind: 'Function', name: `${name}()`, language: 'typescript', layer, source: { file: rel, line } });
    symbolIds.push(id);
    edges.push(edge(fileId, id, 'CONTAINS', 1, 'TypeScript AST'));
    collectCalls(source, statement, id, new Map(), pendingCalls, rel);
  }

  return { nodes, edges, pendingCalls, symbolIds };
}

function collectCalls(
  source: ts.SourceFile,
  node: ts.Node,
  from: string,
  properties: Map<string, string>,
  pending: PendingCall[],
  file: string
): void {
  const visit = (child: ts.Node): void => {
    if (ts.isCallExpression(child)) {
      const expression = child.expression;
      if (ts.isPropertyAccessExpression(expression)) {
        const method = expression.name.text;
        const receiverText = expression.expression.getText(source);
        const normalizedReceiver = receiverText.replace(/^this\./, '');
        const receiverType = properties.get(normalizedReceiver);
        const line = source.getLineAndCharacterOfPosition(child.getStart()).line + 1;
        pending.push({ from, receiverType, method, text: child.getText(source), file, line });
      } else if (ts.isIdentifier(expression)) {
        const line = source.getLineAndCharacterOfPosition(child.getStart()).line + 1;
        pending.push({ from, method: expression.text, text: child.getText(source), file, line });
      }
    }
    ts.forEachChild(child, visit);
  };
  if ('body' in node && (node as ts.MethodDeclaration | ts.FunctionDeclaration).body) {
    ts.forEachChild((node as ts.MethodDeclaration | ts.FunctionDeclaration).body!, visit);
  }
}

function extractLeadingComment(source: ts.SourceFile, node: ts.Node): string | undefined {
  const ranges = ts.getLeadingCommentRanges(source.text, node.getFullStart()) ?? [];
  const raw = ranges.map(range => source.text.slice(range.pos, range.end)).join('\n');
  const match = raw.match(/@atlas\s+summary\s*:\s*(.+)/i);
  return match?.[1]?.trim();
}

function stripGeneric(type: string): string {
  return type.replace(/<.*>/g, '').replace(/\[\]$/, '').trim();
}

function edge(source: string, target: string, kind: AtlasEdge['kind'], confidence: number, evidence: string): AtlasEdge {
  return { id: `${kind}:${source}->${target}`, source, target, kind, confidence, evidence };
}

function normalize(value: string): string {
  return value.split(path.sep).join('/');
}
