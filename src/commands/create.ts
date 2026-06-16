import path from 'node:path';
import fs from 'fs-extra';
import pc from 'picocolors';
import { promptProjectName, runCreateWizard } from '../prompts/create-wizard';
import { enforceDependencies, writeConfig } from '../utils/config';
import { ScaffoldConfig } from '../types';
import {
  applyTemplateEntries,
  buildTemplateContext,
} from '../utils/template-renderer';
import { getCreateTemplateEntries } from '../templates/create-manifest';

export async function createCommand(
  projectNameArg?: string,
  options?: { directory?: string; defaults?: boolean },
): Promise<void> {
  const requestedPath = projectNameArg
    ? projectNameArg.trim()
    : await promptProjectName();
  const targetDir = path.resolve(
    options?.directory ?? process.cwd(),
    requestedPath,
  );
  const projectName = path.basename(targetDir);

  const config = options?.defaults
    ? getDefaultConfig(projectName)
    : await runCreateWizard(projectName);

  if (await fs.pathExists(targetDir)) {
    const files = await fs.readdir(targetDir);
    if (files.length > 0) {
      throw new Error(
        `Directory "${targetDir}" already exists and is not empty`,
      );
    }
  }

  await fs.ensureDir(targetDir);

  const context = buildTemplateContext(config);
  const entries = getCreateTemplateEntries();

  console.log(pc.cyan(`\nCreating project in ${targetDir}...\n`));

  await applyTemplateEntries(targetDir, entries, context);
  await writeConfig(targetDir, config);

  console.log(pc.green('\n✓ Project created successfully!\n'));
  console.log('Next steps:');
  console.log(`  cd ${targetDir}`);
  if (config.docker) {
    console.log('  docker compose up -d');
  }
  console.log('  cp .env.example .env');
  console.log('  pnpm install');
  if (config.architecture === 'microservice') {
    console.log('  pnpm run start:dev');
    console.log('\n  gRPC server: 0.0.0.0:50051');
  } else {
    console.log('  pnpm run start:dev');
    if (config.swagger) {
      console.log('\n  Swagger: http://localhost:3000/api');
    }
  }
  console.log('');
}

function getDefaultConfig(projectName: string): ScaffoldConfig {
  return enforceDependencies({
    version: 1,
    projectName,
    architecture: 'monolith',
    moduleVersioning: false,
    defaultModuleVersion: '',
    moduleVersions: [],
    swagger: true,
    docker: true,
    typeorm: true,
    responseEnvelope: true,
    pagination: true,
    auth: true,
    usersModule: true,
    seeds: false,
    e2e: false,
    docs: true,
    httpAdapter: 'fastify',
    orm: 'typeorm',
    database: 'postgres',
  });
}
