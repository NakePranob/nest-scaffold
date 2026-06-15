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

  const raw = await fs.readJson(configPath);
  return raw as ScaffoldConfig;
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

  if (!next.docker) {
    next.typeorm = false;
  }

  if (!next.typeorm) {
    next.seeds = false;
    next.usersModule = false;
  }

  if (!next.usersModule && next.auth) {
    next.auth = false;
  }

  return next;
}
