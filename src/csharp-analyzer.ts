import path from 'node:path';
import type { AtlasEdge, AtlasNode } from './schema.js';
import type { AtlasAnnotations } from './annotations.js';
import { inferLayer } from './layers.js';
import type { LanguageAnalysis, PendingCall } from './typescript-analyzer.js';

export function analyzeCSharpFile(
  root: string,
  absoluteFile: string,
  content: string,
  annotations: AtlasAnnotations
): LanguageAnalysis {
  const rel = normalize(path.relative(root, absoluteFile));
  const layer = inferLayer(rel, annotations.layer);
  const nodes: AtlasNode[] = [];
  const edges: AtlasEdge[] = [];
  const pendingCalls: PendingCall[] = [];
  const symbolIds: string[] = [];
  const fileId = `file:${rel}`;

  nodes.push({
    id: fileId,
    kind: 'File',
    name: path.basename(rel),
    language: 'csharp',
    layer,
    source: { file: rel, line: 1 },
    summary: annotations.summary
  });

  const classMatch = content.match(/\bclass\s+(\w+)/);
  if (!classMatch) return { nodes, edges, pendingCalls, symbolIds };

  const className = classMatch[1];
  const classLine = lineOf(content, classMatch.index ?? 0);
  const classId = `cs:${rel}#${className}`;
  nodes.push({
    id: classId,
    kind: 'Class',
    name: className,
    language: 'csharp',
    layer,
    source: { file: rel, line: classLine },
    summary: annotations.summary
  });
  symbolIds.push(classId);
  edges.push(edge(fileId, classId, 'CONTAINS', 1, 'C# declaration'));

  const fields = new Map<string, string>();
  for (const match of content.matchAll(/(?:private|protected|public)\s+(?:readonly\s+)?([\w<>.,?]+)\s+(_?\w+)\s*;/g)) {
    fields.set(match[2], stripGeneric(match[1]));
  }

  const classRoute = content.match(/\[Route\("([^"]+)"\)\]/)?.[1]?.replace('[controller]', className.replace(/Controller$/, '').toLowerCase());
  const methodRegex = /(?:\[(HttpGet|HttpPost|HttpPut|HttpDelete)(?:\("([^"]*)"\))?\]\s*)?(?:public|private|protected|internal)\s+(?:async\s+)?[\w<>,?.\[\]\s]+\s+(\w+)\s*\([^)]*\)\s*\{/g;

  for (const match of content.matchAll(methodRegex)) {
    const methodName = match[3];
    if (methodName === className) continue;
    const methodId = `cs:${rel}#${className}.${methodName}`;
    const start = match.index ?? 0;
    const body = extractBraceBody(content, content.indexOf('{', start));
    const line = lineOf(content, start);
    nodes.push({
      id: methodId,
      kind: 'Method',
      name: `${className}.${methodName}()`,
      language: 'csharp',
      layer,
      source: { file: rel, line },
      summary: leadingSummary(content, start) ?? annotations.summary,
      metadata: { className, methodName }
    });
    symbolIds.push(methodId);
    edges.push(edge(classId, methodId, 'CONTAINS', 1, 'C# declaration'));

    if (match[1]) {
      const verb = match[1].replace('Http', '').toUpperCase();
      const suffix = match[2] ?? '';
      const route = joinRoute(classRoute ?? `api/${className.replace(/Controller$/, '').toLowerCase()}`, suffix);
      const endpointId = `endpoint:${verb}:${route}`;
      nodes.push({
        id: endpointId,
        kind: 'Endpoint',
        name: `${verb} ${route}`,
        language: 'semantic',
        layer: 'Application',
        source: { file: rel, line },
        metadata: { verb, route }
      });
      edges.push(edge(classId, endpointId, 'EXPOSES', 1, 'ASP.NET route attribute'));
      edges.push(edge(endpointId, methodId, 'DISPATCHES_TO', 1, 'ASP.NET route attribute'));
    }

    for (const call of body.text.matchAll(/(_?\w+)\.(\w+)\s*\(/g)) {
      const receiver = call[1];
      const calledMethod = call[2];
      pendingCalls.push({
        from: methodId,
        receiverType: fields.get(receiver),
        method: calledMethod,
        text: call[0],
        file: rel,
        line: lineOf(content, body.start + (call.index ?? 0))
      });
    }

    for (const access of body.text.matchAll(/(_?\w+)\.\w+\.(?:Where|SearchAsync|ToListAsync|FirstOrDefaultAsync|SaveChangesAsync)\s*\(/g)) {
      const receiverType = fields.get(access[1]);
      if (!receiverType || !/DbContext$/i.test(receiverType)) continue;
      const databaseId = 'external:database';
      nodes.push({
        id: databaseId,
        kind: 'ExternalSystem',
        name: 'Database',
        language: 'semantic',
        layer: 'External',
        summary: 'Sistema di persistenza raggiunto dal repository.'
      });
      edges.push(edge(methodId, databaseId, /SaveChangesAsync/.test(access[0]) ? 'WRITES' : 'READS', 0.9, `${rel}:${lineOf(content, body.start + (access.index ?? 0))} DbContext access`));
    }
  }

  return { nodes: dedupeNodes(nodes), edges, pendingCalls, symbolIds };
}

function extractBraceBody(content: string, braceStart: number): { text: string; start: number } {
  if (braceStart < 0) return { text: '', start: 0 };
  let depth = 0;
  for (let index = braceStart; index < content.length; index++) {
    if (content[index] === '{') depth++;
    if (content[index] === '}') depth--;
    if (depth === 0) return { text: content.slice(braceStart + 1, index), start: braceStart + 1 };
  }
  return { text: content.slice(braceStart + 1), start: braceStart + 1 };
}

function leadingSummary(content: string, index: number): string | undefined {
  const prefix = content.slice(Math.max(0, index - 300), index);
  const match = prefix.match(/@atlas\s+summary\s*:\s*(.+)\s*$/im);
  return match?.[1]?.trim();
}

function lineOf(content: string, index: number): number {
  return content.slice(0, index).split('\n').length;
}

function stripGeneric(value: string): string {
  return value.replace(/<.*>/g, '').replace(/\?$/, '').trim();
}

function joinRoute(base: string, suffix: string): string {
  return `/${[base, suffix].join('/').replace(/\/+/g, '/').replace(/^\//, '').replace(/\/$/, '')}`;
}

function edge(source: string, target: string, kind: AtlasEdge['kind'], confidence: number, evidence: string): AtlasEdge {
  return { id: `${kind}:${source}->${target}`, source, target, kind, confidence, evidence };
}

function normalize(value: string): string {
  return value.split(path.sep).join('/');
}

function dedupeNodes(nodes: AtlasNode[]): AtlasNode[] {
  return [...new Map(nodes.map(node => [node.id, node])).values()];
}
