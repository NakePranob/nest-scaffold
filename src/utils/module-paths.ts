import path from 'node:path';
import fs from 'fs-extra';

const VERSION_DIR_PATTERN = /^v\d+$/;

export interface ModulePathContext {
  moduleVersioning: boolean;
  moduleVersion: string;
  modulesPrefix: string;
  modulesImportPrefix: string;
  commonFromModule: string;
  commonFromNested: string;
  usersEntityFromSeeds: string;
}

export function resolveModulePathContext(
  moduleVersioning: boolean,
  moduleVersion: string,
): ModulePathContext {
  const version = moduleVersioning ? moduleVersion : '';
  const modulesPrefix = version ? `modules/${version}` : 'modules';

  return {
    moduleVersioning,
    moduleVersion: version,
    modulesPrefix,
    modulesImportPrefix: `./${modulesPrefix}`,
    commonFromModule: moduleVersioning ? '../../../common' : '../../common',
    commonFromNested: moduleVersioning ? '../../../../common' : '../../../common',
    usersEntityFromSeeds: `../../${modulesPrefix}/users/entities/user.entity`,
  };
}

export function moduleFeaturePath(
  moduleVersioning: boolean,
  moduleVersion: string,
  feature: string,
  ...rest: string[]
): string {
  const segments = ['src', 'modules'];
  if (moduleVersioning) {
    segments.push(moduleVersion);
  }
  segments.push(feature, ...rest);
  return segments.join('/');
}

export function errorCatalogImportPathFromCommon(
  moduleVersioning: boolean,
  moduleVersion: string,
  feature: string,
  fileBase: string,
): string {
  const version = moduleVersioning ? moduleVersion : '';
  const modulesPrefix = version ? `modules/${version}` : 'modules';
  return `../../${modulesPrefix}/${feature}/${fileBase}-error-catalog`;
}

export function moduleImportPath(
  moduleVersioning: boolean,
  moduleVersion: string,
  feature: string,
  fileBase: string,
): string {
  const segments = ['.', 'modules'];
  if (moduleVersioning) {
    segments.push(moduleVersion);
  }
  segments.push(feature, `${fileBase}.module`);
  return segments.join('/');
}

export async function listModuleVersions(projectRoot: string): Promise<string[]> {
  const modulesDir = path.join(projectRoot, 'src', 'modules');
  if (!(await fs.pathExists(modulesDir))) {
    return [];
  }

  const entries = await fs.readdir(modulesDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && VERSION_DIR_PATTERN.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

export async function detectModuleVersioning(projectRoot: string): Promise<{
  moduleVersioning: boolean;
  defaultModuleVersion: string;
  moduleVersions: string[];
}> {
  const versions = await listModuleVersions(projectRoot);
  if (versions.length > 0) {
    return {
      moduleVersioning: true,
      defaultModuleVersion: versions[0],
      moduleVersions: versions,
    };
  }

  return {
    moduleVersioning: false,
    defaultModuleVersion: '',
    moduleVersions: [],
  };
}

export function normalizeModuleVersion(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!VERSION_DIR_PATTERN.test(normalized)) {
    throw new Error('Module version must match v1, v2, v3, ...');
  }
  return normalized;
}
