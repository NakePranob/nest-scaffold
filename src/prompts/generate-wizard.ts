import { input, select } from '@inquirer/prompts';
import { ScaffoldConfig } from '../types';
import {
  listModuleVersions,
  normalizeModuleVersion,
} from '../utils/module-paths';

export async function promptModuleVersion(
  projectRoot: string,
  config: ScaffoldConfig,
  preset?: string,
): Promise<string> {
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
    const value = await input({
      message: 'New version folder name:',
      default: 'v2',
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
