import type { ModulePathContext } from './utils/module-paths';

export type Architecture = 'monolith' | 'microservice';

export interface ScaffoldConfig {
  version: 1;
  projectName: string;
  architecture: Architecture;
  moduleVersioning: boolean;
  defaultModuleVersion: string;
  moduleVersions: string[];
  swagger: boolean;
  docker: boolean;
  typeorm: boolean;
  responseEnvelope: boolean;
  pagination: boolean;
  auth: boolean;
  usersModule: boolean;
  seeds: boolean;
  e2e: boolean;
  docs: boolean;
  httpAdapter: 'fastify';
  orm: 'typeorm';
  database: 'postgres';
}

export interface ModuleNaming {
  name: string;
  pascalName: string;
  camelName: string;
  fileBase: string;
  entityName: string;
  entityFile: string;
  queryAlias: string;
  moduleClass: string;
  errorPrefix: string;
}

export interface StackVersionsContext {
  stack: Record<string, string | number>;
  stackLabel: string;
}

export interface TemplateContext
  extends ScaffoldConfig,
    ModuleNaming,
    StackVersionsContext,
    ModulePathContext {
  hasAuth: boolean;
  hasSwagger: boolean;
  hasTypeorm: boolean;
  hasPagination: boolean;
  hasEnvelope: boolean;
  hasUsersModule: boolean;
  hasService: boolean;
  hasController: boolean;
  isMonolith: boolean;
  isMicroservice: boolean;
  protoPackage: string;
}

export type { ModulePathContext };
