import fs from 'node:fs/promises';
import path from 'node:path';
import type { AnalyzeOptions, AtlasEdge, AtlasFlow, AtlasGraph, AtlasNode } from './schema.js';
import { parseAnnotations, slug } from './annotations.js';
import { analyzeTypeScriptFile, type PendingCall } from './typescript-analyzer.js';
import { analyzeCSharpFile } from './csharp-analyzer.js';
import { DEFAULT_LAYERS } from './layers.js';

const DEFAULT_INCLUDE = ['**/*.ts', '**/*.tsx', '**/*.cs'];
const DEFAULT_EXCLUDE = ['**/node_modules/**', '**/dist/**', '**/bin/**', '**/obj/**', '**/*.spec.ts', '**/*.test.ts'];

export async function analyzeProject(rootInput: string, options: AnalyzeOptions = {}): Promise<AtlasGraph> {
  const root = path.resolve(rootInput);
  const files = await discoverSourceFiles(root, options);

  const nodes: AtlasNode[] = [];
  const edges: AtlasEdge[] = [];
  const pendingCalls: PendingCall[] = [];
  const fileSymbols = new Map<string, string[]>();
  const fileAnnotations = new Map<string, ReturnType<typeof parseAnnotations>>();

  for (const absoluteFile of files.sort()) {
    const content = await fs.readFile(absoluteFile, 'utf8');
    const annotations = parseAnnotations(content);
    const rel = normalize(path.relative(root, absoluteFile));
    fileAnnotations.set(rel, annotations);
    const result = absoluteFile.endsWith('.cs')
      ? analyzeCSharpFile(root, absoluteFile, content, annotations)
      : analyzeTypeScriptFile(root, absoluteFile, content, annotations);
    nodes.push(...result.nodes);
    edges.push(...result.edges);
    pendingCalls.push(...result.pendingCalls);
    fileSymbols.set(rel, result.symbolIds);
  }

  addSemanticNodes(nodes, edges, fileSymbols, fileAnnotations);
  addLayerNodes(nodes, edges);
  const unresolvedCalls = resolveCalls(nodes, edges, pendingCalls);
  bridgeHttpEndpoints(nodes, edges, pendingCalls);

  const dedupedNodes = dedupeNodes(nodes);
  const dedupedEdges = dedupeEdges(edges);
  const flows = deriveFlows(dedupedNodes, dedupedEdges);
  const projectName = options.projectName ?? path.basename(root);

  return {
    version: '0.1',
    project: { name: projectName, root, analyzedAt: new Date().toISOString() },
    stats: {
      files: files.length,
      nodes: dedupedNodes.length,
      edges: dedupedEdges.length,
      unresolvedCalls
    },
    nodes: dedupedNodes,
    edges: dedupedEdges,
    flows,
    diagnostics: unresolvedCalls > 0 ? [`${unresolvedCalls} calls could not be resolved statically.`] : []
  };
}

async function discoverSourceFiles(root: string, options: AnalyzeOptions): Promise<string[]> {
  const extensions = new Set(['.ts', '.tsx', '.cs']);
  const excludedDirectories = new Set(['node_modules', 'dist', 'bin', 'obj', '.git']);
  const customExcludes = options.exclude ?? [];
  const result: string[] = [];

  async function walk(directory: string): Promise<void> {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      const rel = normalize(path.relative(root, absolute));
      if (entry.isDirectory()) {
        if (!excludedDirectories.has(entry.name) && !matchesAny(rel, customExcludes)) await walk(absolute);
        continue;
      }
      if (!entry.isFile() || !extensions.has(path.extname(entry.name))) continue;
      if (/\.(spec|test)\.tsx?$/.test(entry.name) || matchesAny(rel, customExcludes)) continue;
      result.push(absolute);
    }
  }

  await walk(root);
  return result.sort();
}

function matchesAny(file: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    const normalized = pattern.replace(/^\*\*\//, '').replace(/\/\*\*$/, '');
    return normalized.length > 0 && file.includes(normalized);
  });
}

function addSemanticNodes(
  nodes: AtlasNode[],
  edges: AtlasEdge[],
  fileSymbols: Map<string, string[]>,
  annotations: Map<string, ReturnType<typeof parseAnnotations>>
): void {
  for (const [file, annotation] of annotations) {
    if (!annotation.capability && !annotation.useCase) continue;
    let capabilityId: string | undefined;
    let useCaseId: string | undefined;

    if (annotation.capability) {
      capabilityId = `capability:${slug(annotation.capability)}`;
      nodes.push({ id: capabilityId, kind: 'Capability', name: annotation.capability, language: 'semantic' });
    }
    if (annotation.useCase) {
      useCaseId = `usecase:${slug(annotation.useCase)}`;
      nodes.push({ id: useCaseId, kind: 'UseCase', name: annotation.useCase, language: 'semantic' });
      if (capabilityId) edges.push(edge(capabilityId, useCaseId, 'IMPLEMENTS', 1, '@atlas annotation'));
    }

    const target = useCaseId ?? capabilityId;
    if (!target) continue;
    for (const symbolId of fileSymbols.get(file) ?? []) {
      edges.push(edge(target, symbolId, 'REALIZED_BY', 0.98, `@atlas annotation in ${file}`));
    }
  }
}

function addLayerNodes(nodes: AtlasNode[], edges: AtlasEdge[]): void {
  const used = new Set(nodes.map(node => node.layer).filter(Boolean) as string[]);
  for (const layer of DEFAULT_LAYERS) {
    if (!used.has(layer)) continue;
    const layerId = `layer:${slug(layer)}`;
    nodes.push({ id: layerId, kind: 'Layer', name: layer, language: 'semantic' });
    for (const node of nodes.filter(candidate => candidate.layer === layer && candidate.kind !== 'Layer')) {
      edges.push(edge(node.id, layerId, 'BELONGS_TO', 1, 'Layer inference'));
    }
  }
}

function resolveCalls(nodes: AtlasNode[], edges: AtlasEdge[], calls: PendingCall[]): number {
  const classMethod = new Map<string, string>();
  const byMethod = new Map<string, string[]>();
  for (const node of nodes) {
    const className = node.metadata?.className;
    const methodName = node.metadata?.methodName;
    if (typeof className === 'string' && typeof methodName === 'string') {
      classMethod.set(`${className}.${methodName}`.toLowerCase(), node.id);
      const list = byMethod.get(methodName.toLowerCase()) ?? [];
      list.push(node.id);
      byMethod.set(methodName.toLowerCase(), list);
    }
  }

  let unresolved = 0;
  for (const call of calls) {
    if (isHttpCall(call)) continue;
    let target: string | undefined;
    if (call.receiverType) target = classMethod.get(`${call.receiverType}.${call.method}`.toLowerCase());
    if (!target) {
      const candidates = byMethod.get(call.method.toLowerCase()) ?? [];
      if (candidates.length === 1) target = candidates[0];
    }
    if (target && target !== call.from) {
      edges.push(edge(call.from, target, 'CALLS', call.receiverType ? 0.96 : 0.68, `${call.file}:${call.line} ${call.text}`));
    } else {
      unresolved++;
    }
  }
  return unresolved;
}

function bridgeHttpEndpoints(nodes: AtlasNode[], edges: AtlasEdge[], calls: PendingCall[]): void {
  for (const call of calls) {
    if (!isHttpCall(call)) continue;
    const verb = call.method.toUpperCase();
    const match = call.text.match(/["'`]([^"'`]+)["'`]/);
    if (!match) continue;
    const route = normalizeRoute(match[1]);
    const endpointId = `endpoint:${verb}:${route}`;
    nodes.push({
      id: endpointId,
      kind: 'Endpoint',
      name: `${verb} ${route}`,
      language: 'semantic',
      layer: 'Application',
      source: { file: call.file, line: call.line },
      metadata: { verb, route }
    });
    edges.push(edge(call.from, endpointId, 'CALLS', 1, `${call.file}:${call.line} HTTP client call`));
  }
}

function deriveFlows(nodes: AtlasNode[], edges: AtlasEdge[]): AtlasFlow[] {
  const useCases = nodes.filter(node => node.kind === 'UseCase');
  const outgoing = groupBy(edges.filter(edge => ['CALLS', 'DISPATCHES_TO', 'READS', 'WRITES'].includes(edge.kind)), edge => edge.source);
  const incoming = groupBy(edges.filter(edge => ['CALLS', 'DISPATCHES_TO', 'READS', 'WRITES'].includes(edge.kind)), edge => edge.target);
  const realized = groupBy(edges.filter(edge => edge.kind === 'REALIZED_BY'), edge => edge.source);
  const nodeMap = new Map(nodes.map(node => [node.id, node]));
  const flows: AtlasFlow[] = [];

  for (const useCase of useCases) {
    const related = new Set((realized.get(useCase.id) ?? []).map(edge => edge.target));
    const startCandidates = [...related].filter(id => {
      const node = nodeMap.get(id);
      if (!node || (node.kind !== 'Method' && node.kind !== 'Function')) return false;
      return !(incoming.get(id) ?? []).some(edge => related.has(edge.source));
    });
    const starts = startCandidates.length > 0 ? startCandidates : [...related].filter(id => nodeMap.get(id)?.kind === 'Method').slice(0, 1);
    let best: string[] = [];
    for (const start of starts) {
      const candidate = longestPath(start, outgoing, nodeMap, 16);
      if (candidate.length > best.length) best = candidate;
    }
    if (best.length > 0) {
      flows.push({ id: `flow:${slug(useCase.name)}`, name: useCase.name, useCaseId: useCase.id, steps: best });
    }
  }
  return flows;
}

function longestPath(
  start: string,
  outgoing: Map<string, AtlasEdge[]>,
  nodeMap: Map<string, AtlasNode>,
  maxDepth: number
): string[] {
  const visit = (node: string, path: string[]): string[] => {
    if (path.length >= maxDepth) return path;
    const candidates = (outgoing.get(node) ?? []).filter(edge => !path.includes(edge.target));
    if (candidates.length === 0) return path;
    return candidates
      .map(edge => visit(edge.target, [...path, edge.target]))
      .sort((a, b) => scorePath(b, nodeMap) - scorePath(a, nodeMap))[0];
  };
  return visit(start, [start]);
}

function scorePath(pathIds: string[], nodeMap: Map<string, AtlasNode>): number {
  const layerWeight: Record<string, number> = {
    Presentation: 1,
    Application: 2,
    Domain: 3,
    Infrastructure: 5,
    External: 6
  };
  return pathIds.length * 100 + pathIds.reduce((score, id) => score + (layerWeight[nodeMap.get(id)?.layer ?? ''] ?? 0), 0);
}

function isHttpCall(call: PendingCall): boolean {
  return ['get', 'post', 'put', 'delete', 'patch'].includes(call.method.toLowerCase()) && /["'`]\/?api\//.test(call.text);
}

function normalizeRoute(route: string): string {
  const prefixed = route.startsWith('/') ? route : `/${route}`;
  return prefixed.replace(/\/+/g, '/').replace(/\/$/, '');
}

function normalize(value: string): string {
  return value.split(path.sep).join('/');
}

function dedupeNodes(nodes: AtlasNode[]): AtlasNode[] {
  return [...new Map(nodes.map(node => [node.id, node])).values()];
}

function dedupeEdges(edges: AtlasEdge[]): AtlasEdge[] {
  return [...new Map(edges.map(edge => [edge.id, edge])).values()];
}

function edge(source: string, target: string, kind: AtlasEdge['kind'], confidence: number, evidence: string): AtlasEdge {
  return { id: `${kind}:${source}->${target}`, source, target, kind, confidence, evidence };
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const result = new Map<string, T[]>();
  for (const item of items) {
    const value = key(item);
    result.set(value, [...(result.get(value) ?? []), item]);
  }
  return result;
}
