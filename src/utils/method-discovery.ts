import path from 'node:path';
import fs from 'fs-extra';
import {
  Project,
  PropertyDeclaration,
} from 'ts-morph';
import { moduleFeaturePath } from './module-paths';
import { getPrimaryClass } from './source-file-utils';
import type {
  ModuleNaming,
  ScaffoldConfig,
} from '../types';
import {
  mapPrimitiveType,
  type EntityFieldInfo,
  type ModuleArtifacts,
  type ResolvedPaths,
  type SearchDtoFieldInfo,
} from './method-shared';

export function buildPaths(
  projectRoot: string,
  config: ScaffoldConfig,
  moduleVersion: string,
  naming: ModuleNaming,
): ResolvedPaths {
  const moduleDir = path.join(
    projectRoot,
    moduleFeaturePath(config.moduleVersioning, moduleVersion, naming.name),
  );

  if (config.architecture === 'microservice') {
    return {
      moduleDir,
      controllerPath: path.join(moduleDir, 'infrastructure', `${naming.fileBase}.controller.grpc.ts`),
      servicePath: path.join(moduleDir, 'application', `${naming.fileBase}.service.ts`),
      entityDir: path.join(moduleDir, 'domain', 'entities'),
      dtoDir: path.join(moduleDir, 'dto'),
      protoPath: path.join(moduleDir, 'infrastructure', 'proto', `${naming.fileBase}.proto`),
    };
  }

  return {
    moduleDir,
    controllerPath: path.join(moduleDir, `${naming.fileBase}.controller.ts`),
    servicePath: path.join(moduleDir, `${naming.fileBase}.service.ts`),
    entityDir: path.join(moduleDir, 'entities'),
    dtoDir: path.join(moduleDir, 'dto'),
  };
}

function isEntityFieldCandidate(property: PropertyDeclaration): property is PropertyDeclaration {
  const name = property.getName();
  if (['createdAt', 'updatedAt'].includes(name)) {
    return false;
  }
  return mapPrimitiveType(property.getTypeNode()?.getText()) !== null;
}

async function findFirstMatchingFile(
  dir: string,
  pattern: RegExp,
): Promise<string | null> {
  if (!(await fs.pathExists(dir))) {
    return null;
  }

  const entries = await fs.readdir(dir);
  const match = entries.find((entry) => pattern.test(entry));
  return match ? path.join(dir, match) : null;
}

async function getClassNameFromFile(filePath: string): Promise<string | null> {
  if (!(await fs.pathExists(filePath))) {
    return null;
  }

  const project = new Project({
    skipAddingFilesFromTsConfig: true,
  });
  const sourceFile = project.addSourceFileAtPath(filePath);
  return sourceFile.getClasses()[0]?.getName() ?? null;
}

export async function discoverEntityFields(entityPath: string): Promise<EntityFieldInfo[]> {
  if (!(await fs.pathExists(entityPath))) {
    return [{ name: 'id', type: 'string' }];
  }

  const project = new Project({
    skipAddingFilesFromTsConfig: true,
  });
  const sourceFile = project.addSourceFileAtPath(entityPath);
  const classDecl = getPrimaryClass(sourceFile);

  const fields = classDecl
    .getProperties()
    .filter(isEntityFieldCandidate)
    .map((property) => ({
      name: property.getName(),
      type: mapPrimitiveType(property.getTypeNode()?.getText())!,
    }));

  if (!fields.some((field) => field.name === 'id')) {
    fields.unshift({ name: 'id', type: 'string' });
  }

  return fields;
}

export async function discoverClassFields(filePath: string): Promise<SearchDtoFieldInfo[]> {
  if (!(await fs.pathExists(filePath))) {
    return [];
  }

  const project = new Project({
    skipAddingFilesFromTsConfig: true,
  });
  const sourceFile = project.addSourceFileAtPath(filePath);
  const classDecl = sourceFile.getClasses()[0];

  if (!classDecl) {
    return [];
  }

  return classDecl
    .getProperties()
    .map((property) => ({
      name: property.getName(),
      type: mapPrimitiveType(property.getTypeNode()?.getText()),
    }))
    .filter((field): field is SearchDtoFieldInfo => field.type !== null);
}

export async function resolveModuleArtifacts(
  paths: ResolvedPaths,
  naming: ModuleNaming,
): Promise<ModuleArtifacts> {
  const entityPath = (await findFirstMatchingFile(paths.entityDir, /\.entity\.ts$/))
    ?? path.join(paths.entityDir, `${naming.entityFile}.entity.ts`);
  const entityFile = path.basename(entityPath).replace(/\.entity\.ts$/, '');
  const entityName = (await getClassNameFromFile(entityPath)) ?? naming.entityName;
  const createDtoPath = (await findFirstMatchingFile(paths.dtoDir, /^create-.*\.dto\.ts$/))
    ?? path.join(paths.dtoDir, `create-${entityFile}.dto.ts`);
  const updateDtoPath = (await findFirstMatchingFile(paths.dtoDir, /^update-.*\.dto\.ts$/))
    ?? path.join(paths.dtoDir, `update-${entityFile}.dto.ts`);
  const searchDtoPath = (await findFirstMatchingFile(paths.dtoDir, /^search-.*\.dto\.ts$/))
    ?? path.join(paths.dtoDir, `search-${entityFile}.dto.ts`);

  return {
    entityPath,
    entityName,
    entityFile,
    createDtoPath,
    createDtoName: (await getClassNameFromFile(createDtoPath)) ?? `Create${entityName}Dto`,
    updateDtoPath,
    updateDtoName: (await getClassNameFromFile(updateDtoPath)) ?? `Update${entityName}Dto`,
    searchDtoPath,
    searchDtoName: (await getClassNameFromFile(searchDtoPath)) ?? `Search${entityName}Dto`,
  };
}
