import path from 'node:path';
import fs from 'fs-extra';
import { ScaffoldConfig } from '../types';

export const CONFIG_FILENAME = 'nest-scaffold.config.json';

export function getConfigPath(projectRoot: string): string {
  return path.join(projectRoot, CONFIG_FILENAME);
}

export async function readConfig(
  projectRoot: string,
): Promise<ScaffoldConfig | null> {
  const configPath = getConfigPath(projectRoot);
  if (!(await fs.pathExists(configPath))) {
    return null;
  }

  const raw = (await fs.readJson(configPath)) as Partial<ScaffoldConfig>;
  return {
    version: 1,
    projectName: raw.projectName ?? path.basename(projectRoot),
    architecture: raw.architecture ?? 'monolith',
    moduleVersioning: raw.moduleVersioning ?? false,
    defaultModuleVersion: raw.defaultModuleVersion ?? '',
    moduleVersions: raw.moduleVersions ?? [],
    swagger: raw.swagger ?? false,
    docker: raw.docker ?? false,
    typeorm: raw.typeorm ?? false,
    responseEnvelope: raw.responseEnvelope ?? false,
    pagination: raw.pagination ?? false,
    auth: raw.auth ?? false,
    usersModule: raw.usersModule ?? false,
    seeds: raw.seeds ?? false,
    e2e: raw.e2e ?? false,
    docs: raw.docs ?? false,
    httpAdapter: raw.httpAdapter ?? 'fastify',
    orm: raw.orm ?? 'typeorm',
    database: raw.database ?? 'postgres',
  };
}

export async function writeConfig(
  projectRoot: string,
  config: ScaffoldConfig,
): Promise<void> {
  await fs.writeJson(getConfigPath(projectRoot), config, { spaces: 2 });
}

export function enforceDependencies(
  config: ScaffoldConfig,
): ScaffoldConfig {
  const next = { ...config };

  next.typeorm = true;
  next.responseEnvelope = true;
  next.pagination = true;
  next.orm = 'typeorm';
  next.database = 'postgres';

  if (next.architecture === 'microservice') {
    next.swagger = false;
  }

  if (!next.usersModule) {
    next.auth = false;
    next.seeds = false;
  }

  return next;
}
