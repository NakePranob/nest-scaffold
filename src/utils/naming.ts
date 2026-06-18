import { ModuleNaming } from '../types';

export function toPascalCase(value: string): string {
  return value
    .replace(/[-_\s]+(.)?/g, (_, char: string) => char.toUpperCase())
    .replace(/^(.)/, (char) => char.toUpperCase());
}

function toCamelCase(value: string): string {
  const pascal = toPascalCase(value);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function resolveModuleNaming(name: string): ModuleNaming {
  const normalized = name.trim().toLowerCase();
  const pascalName = toPascalCase(normalized);

  return {
    name: normalized,
    pascalName,
    camelName: toCamelCase(normalized),
    fileBase: normalized,
    entityName: pascalName,
    entityFile: normalized,
    queryAlias: toCamelCase(normalized),
    moduleClass: `${pascalName}Module`,
    errorPrefix: pascalName.toUpperCase(),
  };
}
