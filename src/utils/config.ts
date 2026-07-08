import path from 'node:path';
import fs from 'fs-extra';
import { ScaffoldConfig } from '../types';
import { detectConfig } from './detector';

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
    // auth/usersModule/seeds/e2e aren't persisted (see writeConfig) — always false here.
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
  // ponytail: auth/usersModule/docker/seeds/e2e are create-time-only choices —
  // no generate/method code path reads them back, so they're not persisted.
  const { auth: _auth, usersModule: _usersModule, docker: _docker, seeds: _seeds, e2e: _e2e, ...persisted } = config;
  await fs.writeJson(getConfigPath(projectRoot), persisted, { spaces: 2 });
}

export function enforceDependencies(
  config: ScaffoldConfig,
): ScaffoldConfig {
  const next = { ...config };

  next.typeorm = true;
  next.responseEnvelope = config.architecture === 'monolith';
  next.pagination = true;
  next.orm = 'typeorm';
  next.database = 'postgres';

  if (next.architecture === 'microservice') {
    next.swagger = false;
    next.usersModule = false;
    next.auth = false;
    next.seeds = false;
  }

  if (!next.usersModule) {
    next.auth = false;
    next.seeds = false;
  }

  return next;
}

/**
 * Resolve the ScaffoldConfig for a project.
 * Tries reading the config file first, falls back to auto-detection.
 */
export async function resolveProjectConfig(
  projectRoot: string,
): Promise<ScaffoldConfig> {
  return (await readConfig(projectRoot)) ?? (await detectConfig(projectRoot));
}

/**
 * Register a module version and persist to config if it's new.
 * Returns the (possibly updated) config.
 */
export async function ensureModuleVersion(
  projectRoot: string,
  config: ScaffoldConfig,
  moduleVersion?: string,
): Promise<ScaffoldConfig> {
  if (!moduleVersion || config.moduleVersions.includes(moduleVersion)) {
    return config;
  }

  const updated: ScaffoldConfig = {
    ...config,
    moduleVersioning: true,
    moduleVersions: [...config.moduleVersions, moduleVersion].sort(),
    defaultModuleVersion: config.defaultModuleVersion || moduleVersion,
  };
  await writeConfig(projectRoot, updated);
  return updated;
}
