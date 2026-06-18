import path from 'node:path';
import { createRequire } from 'node:module';
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

interface PrettierModule {
  resolveConfig(filePath: string): Promise<Record<string, unknown> | null>;
  getFileInfo(filePath: string): Promise<{ ignored: boolean; inferredParser?: string | null }>;
  format(source: string, options: Record<string, unknown>): Promise<string>;
}

function normalizeArchitecture(
  value?: string,
): ScaffoldConfig['architecture'] | undefined {
  if (!value) {
    return undefined;
  }
  if (value !== 'monolith' && value !== 'microservice') {
    throw new Error('Architecture must be "monolith" or "microservice"');
  }
  return value;
}

const FORMATTABLE_EXTENSIONS = new Set([
  '.ts',
  '.js',
  '.mjs',
  '.json',
  '.md',
  '.yml',
  '.yaml',
]);

async function listFormattableFiles(rootDir: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(currentDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git') {
          continue;
        }
        await walk(fullPath);
        continue;
      }

      if (FORMATTABLE_EXTENSIONS.has(path.extname(entry.name))) {
        files.push(fullPath);
      }
    }
  }

  await walk(rootDir);
  return files;
}

async function formatProjectWithPrettier(projectRoot: string): Promise<void> {
  const requireFromCli = createRequire(path.join(__dirname, '..', '..', 'package.json'));
  const prettier = requireFromCli('prettier') as PrettierModule;
  const filePaths = await listFormattableFiles(projectRoot);

  await Promise.all(filePaths.map(async (filePath) => {
    const fileInfo = await prettier.getFileInfo(filePath);
    if (fileInfo.ignored || !fileInfo.inferredParser) {
      return;
    }

    const source = await fs.readFile(filePath, 'utf8');
    const config = await prettier.resolveConfig(filePath);
    const formatted = await prettier.format(source, {
      ...config,
      filepath: filePath,
    });

    if (formatted !== source) {
      await fs.writeFile(filePath, formatted);
    }
  }));
}

export async function createCommand(
  projectNameArg?: string,
  options?: { directory?: string; defaults?: boolean; architecture?: ScaffoldConfig['architecture'] },
): Promise<void> {
  const architecture = normalizeArchitecture(options?.architecture);
  const requestedPath = projectNameArg
    ? projectNameArg.trim()
    : await promptProjectName();
  const targetDir = path.resolve(
    options?.directory ?? process.cwd(),
    requestedPath,
  );
  const projectName = path.basename(targetDir);

  const config = options?.defaults
    ? getDefaultConfig(projectName, architecture)
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
  await formatProjectWithPrettier(targetDir);

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

function getDefaultConfig(
  projectName: string,
  architecture: ScaffoldConfig['architecture'] = 'monolith',
): ScaffoldConfig {
  return enforceDependencies({
    version: 1,
    projectName,
    architecture,
    moduleVersioning: false,
    defaultModuleVersion: '',
    moduleVersions: [],
    swagger: architecture === 'monolith',
    docker: true,
    typeorm: true,
    responseEnvelope: architecture === 'monolith',
    pagination: true,
    auth: architecture === 'monolith',
    usersModule: architecture === 'monolith',
    seeds: false,
    e2e: false,
    docs: true,
    httpAdapter: 'fastify',
    orm: 'typeorm',
    database: 'postgres',
  });
}
