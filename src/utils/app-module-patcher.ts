import path from 'node:path';
import fs from 'fs-extra';
import { Project, SyntaxKind } from 'ts-morph';
import pc from 'picocolors';

export async function registerModuleInAppModule(
  projectRoot: string,
  moduleClass: string,
  importPath: string,
): Promise<void> {
  const appModulePath = path.join(projectRoot, 'src', 'app.module.ts');
  if (!(await fs.pathExists(appModulePath))) {
    throw new Error(`Could not find ${appModulePath}`);
  }

  const project = new Project({
    tsConfigFilePath: path.join(projectRoot, 'tsconfig.json'),
    skipAddingFilesFromTsConfig: true,
  });

  const sourceFile = project.addSourceFileAtPath(appModulePath);
  const moduleClassDecl = sourceFile.getClass('AppModule');
  if (!moduleClassDecl) {
    throw new Error('AppModule class not found');
  }

  const existingImports = sourceFile
    .getImportDeclarations()
    .map((decl) => decl.getModuleSpecifierValue());

  if (!existingImports.includes(importPath)) {
    sourceFile.addImportDeclaration({
      moduleSpecifier: importPath,
      namedImports: [moduleClass],
    });
  }

  const decorator = moduleClassDecl.getDecorator('Module');
  if (!decorator) {
    throw new Error('@Module decorator not found on AppModule');
  }

  const args = decorator.getArguments();
  const configArg = args[0];
  if (!configArg || !configArg.isKind(SyntaxKind.ObjectLiteralExpression)) {
    throw new Error('AppModule @Module config must be an object literal');
  }

  const configObject = configArg.asKindOrThrow(
    SyntaxKind.ObjectLiteralExpression,
  );
  const importsProp = configObject.getProperty('imports');
  if (!importsProp?.isKind(SyntaxKind.PropertyAssignment)) {
    throw new Error('AppModule imports property not found');
  }

  const importsInitializer = importsProp
    .getInitializerIfKindOrThrow(SyntaxKind.ArrayLiteralExpression);

  const hasModule = importsInitializer
    .getElements()
    .some((element) => element.getText() === moduleClass);

  if (hasModule) {
    console.log(
      pc.yellow(
        `⚠ ${moduleClass} already imported in app.module.ts — skipped`,
      ),
    );
  } else {
    importsInitializer.addElement(moduleClass);
    console.log(pc.green(`✓ Registered ${moduleClass} in app.module.ts`));
  }

  await sourceFile.save();
}
