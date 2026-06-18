const IDENTIFIER_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export function isValidTypeScriptIdentifier(value: string): boolean {
  return IDENTIFIER_PATTERN.test(value.trim());
}

export function normalizeIdentifier(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${label} is required`);
  }
  if (!isValidTypeScriptIdentifier(normalized)) {
    throw new Error(`${label} must be a valid TypeScript identifier`);
  }
  return normalized;
}
