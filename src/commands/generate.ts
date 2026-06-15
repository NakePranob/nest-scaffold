import path from 'node:path';
import fs from 'fs-extra';
import pc from 'picocolors';
import { readConfig } from '../utils/config';
import { detectConfig } from '../utils/detector';
import { resolveModuleNaming } from '../utils/naming';
import {
  applyTemplateEntries,
  buildTemplateContext,
} from '../utils/template-renderer';
import { registerModuleInAppModule } from '../utils/app-module-patcher';
import { getGenerateModuleEntries } from '../templates/manifest';

export async function generateModuleCommand(name: string): Promise<void> {
  const projectRoot = process.cwd();
  const naming = resolveModuleNaming(name);
  const moduleDir = path.join(
    projectRoot,
    'src',
    'modules',
    naming.name,
  );

  if (await fs.pathExists(moduleDir)) {
    throw new Error(
      `Module "${naming.name}" already exists at ${moduleDir}. Aborting.`,
    );
  }

  const config = (await readConfig(projectRoot)) ?? (await detectConfig(projectRoot));

  console.log(pc.cyan(`\nGenerating module "${naming.name}"...\n`));

  const context = buildTemplateContext(config, naming);
  const entries = getGenerateModuleEntries(config);

  await applyTemplateEntries(projectRoot, entries, context);

  const importPath = `./modules/${naming.name}/${naming.fileBase}.module`;
  await registerModuleInAppModule(
    projectRoot,
    naming.moduleClass,
    importPath,
  );

  console.log(pc.green(`\n✓ Module "${naming.name}" generated successfully!\n`));
}
