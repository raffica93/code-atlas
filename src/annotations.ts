export interface AtlasAnnotations {
  capability?: string;
  useCase?: string;
  layer?: string;
  summary?: string;
}

const patterns: Record<keyof AtlasAnnotations, RegExp> = {
  capability: /@atlas\s+capability\s*:\s*(.+)/i,
  useCase: /@atlas\s+use-?case\s*:\s*(.+)/i,
  layer: /@atlas\s+layer\s*:\s*(.+)/i,
  summary: /@atlas\s+summary\s*:\s*(.+)/i
};

export function parseAnnotations(text: string): AtlasAnnotations {
  const result: AtlasAnnotations = {};
  for (const [key, pattern] of Object.entries(patterns) as [keyof AtlasAnnotations, RegExp][]) {
    const match = text.match(pattern);
    if (match?.[1]) result[key] = match[1].trim();
  }
  return result;
}

export function slug(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
