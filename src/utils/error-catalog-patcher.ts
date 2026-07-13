import path from 'node:path';
import fs from 'fs-extra';
import { Project, SyntaxKind } from 'ts-morph';
import pc from 'picocolors';

// Registers a newly generated module's error-code enum into the project's
// central ALL_ERROR_CODES list (src/common/errors/app-error-catalog.ts), so
// ErrorResponseDto.code stays a closed OpenAPI enum instead of drifting back
// to a plain string as modules are added. No-ops on projects created before
// this feature existed (no ALL_ERROR_CODES to patch).
export async function registerErrorCodeInAppCatalog(
  projectRoot: string,
  enumName: string,
  importPath: string,
): Promise<void> {
  const catalogPath = path.join(projectRoot, 'src', 'common', 'errors', 'app-error-catalog.ts');
  if (!(await fs.pathExists(catalogPath))) {
    return;
  }

  const project = new Project({ skipAddingFilesFromTsConfig: true });
  const sourceFile = project.addSourceFileAtPath(catalogPath);

  const allErrorCodes = sourceFile.getVariableDeclaration('ALL_ERROR_CODES');
  if (!allErrorCodes) {
    return;
  }

  // Initializer is `[...] as const`, so unwrap the AsExpression to reach the
  // actual array literal.
  let initializer = allErrorCodes.getInitializer();
  if (initializer?.isKind(SyntaxKind.AsExpression)) {
    initializer = initializer.getExpression();
  }
  const arrayLiteral = initializer?.asKind(SyntaxKind.ArrayLiteralExpression);
  if (!arrayLiteral) {
    return;
  }

  const spreadText = `...Object.values(${enumName})`;
  const alreadyRegistered = arrayLiteral
    .getElements()
    .some((element) => element.getText() === spreadText);

  if (alreadyRegistered) {
    console.log(
      pc.yellow(`⚠ ${enumName} already registered in app-error-catalog.ts — skipped`),
    );
    return;
  }

  const existingImports = sourceFile
    .getImportDeclarations()
    .map((decl) => decl.getModuleSpecifierValue());
  if (!existingImports.includes(importPath)) {
    sourceFile.addImportDeclaration({
      moduleSpecifier: importPath,
      namedImports: [enumName],
    });
  }

  arrayLiteral.addElement(spreadText);
  console.log(pc.green(`✓ Registered ${enumName} in app-error-catalog.ts`));

  await sourceFile.save();
}
