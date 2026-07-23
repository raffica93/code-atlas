export const DEFAULT_LAYERS = [
  'Presentation',
  'Application',
  'Domain',
  'Infrastructure',
  'External'
] as const;

export function inferLayer(file: string, explicit?: string): string {
  if (explicit) return titleCase(explicit);
  const normalized = file.toLowerCase();
  if (/frontend|component|page|ui|presentation/.test(normalized)) return 'Presentation';
  if (/application|handler|usecase|facade|service/.test(normalized)) return 'Application';
  if (/domain|entity|specification|model/.test(normalized)) return 'Domain';
  if (/infrastructure|repository|persistence|data/.test(normalized)) return 'Infrastructure';
  return 'Application';
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
