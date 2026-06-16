export function toProtoPackage(value: string): string {
  return value.trim().toLowerCase().replace(/-/g, '_');
}
