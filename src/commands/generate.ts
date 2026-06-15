import path from 'node:path';
import fs from 'fs-extra';
import pc from 'picocolors';
import { readConfig, writeConfig } from '../utils/config';
import { detectConfig } from '../utils/detector';
import { resolveModuleNaming } from '../utils/naming';
import {
  applyTemplateEntries,
  buildTemplateContext,
} from '../utils/template-renderer';
import { registerModuleInAppModule } from '../utils/app-module-patcher';
import { getGenerateModuleEntries } from '../templates/manifest';
import { promptModuleVersion } from '../prompts/generate-wizard';
import {
  moduleFeaturePath,
  moduleImportPath,
} from '../utils/module-paths';

export async function generateModuleCommand(
  name: string,
  options?: { moduleVersion?: string },
): Promise<void> {
  const projectRoot = process.cwd();
  const naming = resolveModuleNaming(name);

  let config = (await readConfig(projectRoot)) ?? (await detectConfig(projectRoot));
  const moduleVersion = await promptModuleVersion(
    projectRoot,
    config,
    options?.moduleVersion,
  );

  if (moduleVersion && !config.moduleVersions.includes(moduleVersion)) {
    config = {
      ...config,
      moduleVersioning: true,
      moduleVersions: [...config.moduleVersions, moduleVersion].sort(),
      defaultModuleVersion: config.defaultModuleVersion || moduleVersion,
    };
    await writeConfig(projectRoot, config);
  }

  const moduleDir = path.join(
    projectRoot,
    moduleFeaturePath(config.moduleVersioning, moduleVersion, naming.name),
  );

  if (await fs.pathExists(moduleDir)) {
    throw new Error(
      `Module "${naming.name}" already exists at ${moduleDir}. Aborting.`,
    );
  }

  const versionLabel = moduleVersion ? `${moduleVersion}/` : '';
  console.log(
    pc.cyan(`\nGenerating module "${versionLabel}${naming.name}"...\n`),
  );

  const context = buildTemplateContext(config, naming, moduleVersion);
  const entries = getGenerateModuleEntries(config);

  await applyTemplateEntries(projectRoot, entries, context);

  const importPath = moduleImportPath(
    config.moduleVersioning,
    moduleVersion,
    naming.name,
    naming.fileBase,
  );
  await registerModuleInAppModule(
    projectRoot,
    naming.moduleClass,
    importPath,
  );

  console.log(
    pc.green(`\n✓ Module "${versionLabel}${naming.name}" generated successfully!\n`),
  );
}
