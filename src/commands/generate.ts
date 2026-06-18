import path from 'node:path';
import fs from 'fs-extra';
import pc from 'picocolors';
import { readConfig, writeConfig } from '../utils/config';
import { detectConfig } from '../utils/detector';
import { resolveModuleNaming } from '../utils/naming';
import {
  applyTemplateEntries,
  buildTemplateContext,
  renderTemplateFile,
  getTemplatesRoot,
} from '../utils/template-renderer';
import { registerModuleInAppModule } from '../utils/app-module-patcher';
import { registerModuleGrpcProto } from '../utils/grpc-options-patcher';
import { getGenerateModuleEntries } from '../templates/generate-manifest';
import {
  promptModuleVersion,
  promptGenerateOptions,
} from '../prompts/generate-wizard';
import {
  moduleFeaturePath,
  moduleImportPath,
} from '../utils/module-paths';

async function resolveProjectConfig(projectRoot: string) {
  return (await readConfig(projectRoot)) ?? (await detectConfig(projectRoot));
}

export async function generateServiceCommand(
  name: string,
  options?: { moduleVersion?: string },
): Promise<void> {
  const projectRoot = process.cwd();
  const naming = resolveModuleNaming(name);
  let config = await resolveProjectConfig(projectRoot);

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

  const servicePath = config.architecture === 'microservice'
    ? path.join(moduleDir, 'application', `${naming.fileBase}.service.ts`)
    : path.join(moduleDir, `${naming.fileBase}.service.ts`);
  const controllerPath = config.architecture === 'microservice'
    ? path.join(moduleDir, 'infrastructure', `${naming.fileBase}.controller.grpc.ts`)
    : path.join(moduleDir, `${naming.fileBase}.controller.ts`);
  const modulePath2 = path.join(moduleDir, `${naming.fileBase}.module.ts`);

  if (await fs.pathExists(servicePath)) {
    throw new Error(`Service "${naming.name}" already exists. Aborting.`);
  }

  const versionLabel = moduleVersion ? `${moduleVersion}/` : '';
  console.log(pc.cyan(`\nGenerating service "${versionLabel}${naming.name}"...\n`));

  const hasController = await fs.pathExists(controllerPath);

  const context = buildTemplateContext(config, naming, moduleVersion, {
    includeEntity: false,
    hasService: true,
    hasController,
  });

  const moduleExists = await fs.pathExists(modulePath2);
  if (!moduleExists || hasController) {
    const moduleContent = await renderTemplateFile(
      path.join(getTemplatesRoot(), 'generate/module/shared/module.ts.hbs'),
      context,
    );
    await fs.ensureDir(moduleDir);
    await fs.writeFile(modulePath2, moduleContent);

    if (!moduleExists) {
      const importPath = moduleImportPath(
        config.moduleVersioning,
        moduleVersion,
        naming.name,
        naming.fileBase,
      );
      await registerModuleInAppModule(projectRoot, naming.moduleClass, importPath);
    }
  } else {
    await fs.ensureDir(moduleDir);
  }

  await fs.ensureDir(path.dirname(servicePath));
  await fs.writeFile(servicePath, await renderTemplateFile(
    path.join(
      getTemplatesRoot(),
      config.architecture === 'microservice'
        ? 'generate/module/microservice/service.ts.hbs'
        : 'generate/service/service.ts.hbs',
    ),
    context,
  ));

  console.log(pc.green(`\n✓ Service "${versionLabel}${naming.name}" generated successfully!\n`));
}

export async function generateControllerCommand(
  name: string,
  options?: { moduleVersion?: string },
): Promise<void> {
  const projectRoot = process.cwd();
  const naming = resolveModuleNaming(name);
  let config = await resolveProjectConfig(projectRoot);

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

  const controllerPath = config.architecture === 'microservice'
    ? path.join(moduleDir, 'infrastructure', `${naming.fileBase}.controller.grpc.ts`)
    : path.join(moduleDir, `${naming.fileBase}.controller.ts`);
  const servicePath = config.architecture === 'microservice'
    ? path.join(moduleDir, 'application', `${naming.fileBase}.service.ts`)
    : path.join(moduleDir, `${naming.fileBase}.service.ts`);
  const modulePath2 = path.join(moduleDir, `${naming.fileBase}.module.ts`);

  if (await fs.pathExists(controllerPath)) {
    throw new Error(`Controller "${naming.name}" already exists. Aborting.`);
  }

  const versionLabel = moduleVersion ? `${moduleVersion}/` : '';
  console.log(pc.cyan(`\nGenerating controller "${versionLabel}${naming.name}"...\n`));

  const hasService = await fs.pathExists(servicePath);

  const context = buildTemplateContext(config, naming, moduleVersion, {
    includeEntity: false,
    hasController: true,
    hasService,
  });

  const moduleExists = await fs.pathExists(modulePath2);
  if (!moduleExists || hasService) {
    const moduleContent = await renderTemplateFile(
      path.join(getTemplatesRoot(), 'generate/module/shared/module.ts.hbs'),
      context,
    );
    await fs.ensureDir(moduleDir);
    await fs.writeFile(modulePath2, moduleContent);

    if (!moduleExists) {
      const importPath = moduleImportPath(
        config.moduleVersioning,
        moduleVersion,
        naming.name,
        naming.fileBase,
      );
      await registerModuleInAppModule(projectRoot, naming.moduleClass, importPath);
    }
  } else {
    await fs.ensureDir(moduleDir);
  }

  const controllerTemplate = config.architecture === 'microservice'
    ? 'generate/module/microservice/controller.ts.hbs'
    : 'generate/controller/monolith/controller.ts.hbs';

  await fs.ensureDir(path.dirname(controllerPath));
  await fs.writeFile(controllerPath, await renderTemplateFile(
    path.join(getTemplatesRoot(), controllerTemplate),
    context,
  ));

  if (config.architecture === 'microservice') {
    const protoDir = path.join(moduleDir, 'infrastructure', 'proto');
    await fs.ensureDir(protoDir);
    const protoPath = path.join(protoDir, `${naming.fileBase}.proto`);
    if (!(await fs.pathExists(protoPath))) {
      await fs.writeFile(protoPath, await renderTemplateFile(
        path.join(getTemplatesRoot(), 'generate/module/microservice/proto.hbs'),
        context,
      ));
    }
    await registerModuleGrpcProto(projectRoot, config, moduleVersion ?? '', naming, { infraLayer: true });
  }

  console.log(pc.green(`\n✓ Controller "${versionLabel}${naming.name}" generated successfully!\n`));
}

export async function generateModuleCommand(
  name: string,
  options?: { moduleVersion?: string; full?: boolean },
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

  const { isFull, includeEntity } = await promptGenerateOptions({
    presetFull: options?.full,
  });

  const versionLabel = moduleVersion ? `${moduleVersion}/` : '';
  const fullLabel = isFull ? 'full CRUD' : 'minimal';
  console.log(
    pc.cyan(`\nGenerating ${fullLabel} module "${versionLabel}${naming.name}"...\n`),
  );

  const context = buildTemplateContext(config, naming, moduleVersion, {
    includeEntity,
    hasService: isFull,
    hasController: isFull,
  });
  const entries = getGenerateModuleEntries(config, isFull, includeEntity);

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

  if (config.architecture === 'microservice' && isFull) {
    await registerModuleGrpcProto(projectRoot, config, moduleVersion ?? '', naming, { infraLayer: true });
  }

  console.log(
    pc.green(`\n✓ Module "${versionLabel}${naming.name}" generated successfully!\n`),
  );
}
