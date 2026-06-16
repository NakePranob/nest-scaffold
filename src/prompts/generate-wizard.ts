import { confirm, input, select } from '@inquirer/prompts';
import { ScaffoldConfig } from '../types';
import {
  listModuleVersions,
  normalizeModuleVersion,
} from '../utils/module-paths';

export interface GenerateOptions {
  isFull: boolean;
  includeEntity: boolean;
}

export async function promptModuleVersion(
  projectRoot: string,
  config: ScaffoldConfig,
  preset?: string,
): Promise<string> {
  if (config.architecture === 'microservice') {
    return '';
  }

  const versions = await listModuleVersions(projectRoot);
  const versioned = config.moduleVersioning || versions.length > 0;

  if (!versioned) {
    return '';
  }

  if (preset) {
    return normalizeModuleVersion(preset);
  }

  const choices = versions.map((version) => ({
    name: version,
    value: version,
  }));

  choices.push({
    name: 'Create a new version folder (e.g. v2)',
    value: '__new__',
  });

  const selected = await select({
    message: 'Which module version folder?',
    choices,
    default: config.defaultModuleVersion || versions[0],
  });

  if (selected === '__new__') {
    const nextVersion = versions.reduce((max, v) => {
      const num = parseInt(v.slice(1), 10);
      return isNaN(num) ? max : Math.max(max, num);
    }, 0) + 1;

    const value = await input({
      message: 'New version folder name:',
      default: `v${nextVersion}`,
      validate: (answer) => {
        try {
          normalizeModuleVersion(answer);
          return true;
        } catch (error) {
          return (error as Error).message;
        }
      },
    });

    return normalizeModuleVersion(value);
  }

  return selected;
}

export async function promptGenerateOptions(options?: {
  presetFull?: boolean;
}): Promise<GenerateOptions> {
  const isFull =
    options?.presetFull ??
    (await confirm({
      message: 'Generate full CRUD (controller + service + DTOs)?',
      default: true,
    }));

  return { isFull, includeEntity: isFull };
}
