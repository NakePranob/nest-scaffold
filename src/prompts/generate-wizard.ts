import { confirm, input, select } from '@inquirer/prompts';
import { GetMethodMode, MethodType, ScaffoldConfig } from '../types';
import { isValidTypeScriptIdentifier } from '../utils/identifiers';
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

export async function promptMethodType(
  preset?: MethodType,
): Promise<MethodType> {
  if (preset) {
    return preset;
  }

  return select({
    message: 'Which method type?',
    choices: [
      { name: 'Get', value: 'get' },
      { name: 'Post', value: 'post' },
      { name: 'Put', value: 'put' },
      { name: 'Patch', value: 'patch' },
      { name: 'Delete', value: 'delete' },
    ],
  });
}

export async function promptGetMethodMode(): Promise<GetMethodMode> {
  return select({
    message: 'GET should fetch which shape?',
    choices: [
      { name: 'All', value: 'all' },
      { name: 'One', value: 'one' },
    ],
  });
}

export async function promptLookupField(
  candidates: string[],
  preset?: string,
  customExamples?: string[],
): Promise<string> {
  if (preset?.trim()) {
    return preset.trim();
  }

  const unique = [...new Set(candidates)];

  if (unique.length === 0) {
    return input({
      message: 'Lookup field name:',
      validate: (value) => {
        if (!value.trim()) return 'Field is required';
        if (!isValidTypeScriptIdentifier(value)) {
          return 'Field must be a valid TypeScript identifier, e.g. email, slug, username';
        }
        return true;
      },
    });
  }

  const selected = await select({
    message: 'Which field should this lookup use?',
    choices: [
      ...unique.map((field) => ({ name: field, value: field })),
      { name: 'Enter a custom field', value: '__custom__' },
    ],
  });

  if (selected !== '__custom__') {
    return selected;
  }

  return input({
    message:
      customExamples && customExamples.length > 0
        ? `Custom field name (e.g. ${customExamples.join(', ')}):`
        : 'Custom field name:',
    validate: (value) => {
      if (!value.trim()) return 'Field is required';
      if (!isValidTypeScriptIdentifier(value)) {
        return 'Field must be a valid TypeScript identifier, e.g. email, slug, username';
      }
      return true;
    },
  });
}

export async function promptMethodName(
  defaultValue: string,
  examples?: string[],
): Promise<string> {
  return input({
    message:
      examples && examples.length > 0
        ? `Method name (e.g. ${examples.join(', ')}):`
        : 'Method name:',
    default: defaultValue,
    validate: (value) => {
      if (!value.trim()) return 'Method name is required';
      if (!isValidTypeScriptIdentifier(value)) {
        return 'Method name must be a valid TypeScript identifier, e.g. findByEmail';
      }
      return true;
    },
  });
}
