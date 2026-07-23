export type NodeKind =
  | 'Capability'
  | 'UseCase'
  | 'Layer'
  | 'File'
  | 'Class'
  | 'Method'
  | 'Function'
  | 'Endpoint'
  | 'ExternalSystem';

export type EdgeKind =
  | 'CONTAINS'
  | 'IMPLEMENTS'
  | 'REALIZED_BY'
  | 'BELONGS_TO'
  | 'CALLS'
  | 'IMPORTS'
  | 'EXPOSES'
  | 'DISPATCHES_TO'
  | 'READS'
  | 'WRITES';

export interface SourceLocation {
  file: string;
  line: number;
  endLine?: number;
}

export interface AtlasNode {
  id: string;
  kind: NodeKind;
  name: string;
  summary?: string;
  language?: 'typescript' | 'csharp' | 'semantic';
  layer?: string;
  source?: SourceLocation;
  metadata?: Record<string, string | number | boolean | string[]>;
}

export interface AtlasEdge {
  id: string;
  source: string;
  target: string;
  kind: EdgeKind;
  confidence: number;
  evidence?: string;
}

export interface AtlasFlow {
  id: string;
  name: string;
  useCaseId: string;
  steps: string[];
}

export interface AtlasGraph {
  version: '0.1';
  project: {
    name: string;
    root: string;
    analyzedAt: string;
  };
  stats: {
    files: number;
    nodes: number;
    edges: number;
    unresolvedCalls: number;
  };
  nodes: AtlasNode[];
  edges: AtlasEdge[];
  flows: AtlasFlow[];
  diagnostics: string[];
}

export interface AnalyzeOptions {
  projectName?: string;
  include?: string[];
  exclude?: string[];
}
