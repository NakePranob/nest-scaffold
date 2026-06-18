import path from 'node:path';
import {
  ClassDeclaration,
  SourceFile,
  Project,
} from 'ts-morph';

export function ensureSourceFile(
  project: Project,
  filePath: string,
): SourceFile {
  return project.addSourceFileAtPath(filePath);
}

export function getPrimaryClass(sourceFile: SourceFile): ClassDeclaration {
  const classDecl = sourceFile.getClasses()[0];
  if (!classDecl) {
    throw new Error(`No class found in ${sourceFile.getBaseName()}`);
  }
  return classDecl;
}

export function hasMethod(classDecl: ClassDeclaration, methodName: string): boolean {
  return classDecl.getInstanceMethod(methodName) !== undefined;
}

export function inferServicePropertyName(
  controllerClass: ClassDeclaration,
  fallback: string,
): string {
  const ctor = controllerClass.getConstructors()[0];
  const param = ctor?.getParameters()[0];
  return param?.getName() ?? fallback;
}

export function ensureNamedImport(
  sourceFile: SourceFile,
  moduleSpecifier: string,
  names: string[],
): void {
  const existing = sourceFile.getImportDeclaration(
    (decl) => decl.getModuleSpecifierValue() === moduleSpecifier,
  );

  if (!existing) {
    sourceFile.addImportDeclaration({
      moduleSpecifier,
      namedImports: names,
    });
    return;
  }

  const current = new Set(existing.getNamedImports().map((item) => item.getName()));
  const missing = names.filter((name) => !current.has(name));
  if (missing.length > 0) {
    existing.addNamedImports(missing);
  }

  const namedImports = existing.getNamedImports().map((item) => item.getName());
  const importText = existing.getText();
  const shouldExpandMultiline = namedImports.length >= 6 || importText.length > 100;

  if (
    shouldExpandMultiline &&
    !existing.getDefaultImport() &&
    !existing.getNamespaceImport()
  ) {
    existing.replaceWithText(
      [
        'import {',
        ...namedImports.map((name) => `  ${name},`),
        `} from '${moduleSpecifier}';`,
      ].join('\n'),
    );
  }
}

export function relativeImport(fromFile: string, toFile: string): string {
  const value = path.relative(path.dirname(fromFile), toFile).replace(/\\/g, '/');
  return value.startsWith('.') ? value.replace(/\.ts$/, '') : `./${value.replace(/\.ts$/, '')}`;
}
