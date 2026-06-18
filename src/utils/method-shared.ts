import type {
  GetMethodMode,
  MethodType,
} from '../types';

export type MethodKind = MethodType;

export interface EntityFieldInfo {
  name: string;
  type: 'string' | 'number' | 'boolean';
  optional?: boolean;
}

export interface ModuleArtifacts {
  entityPath: string;
  entityName: string;
  entityFile: string;
  createDtoPath: string;
  createDtoName: string;
  updateDtoPath: string;
  updateDtoName: string;
  searchDtoPath: string;
  searchDtoName: string;
}

export interface MethodContextLike {
  methodType: MethodKind;
  getMode?: GetMethodMode;
  lookupField?: string;
  methodName: string;
  rpcName?: string;
  requestName?: string;
}

export interface MethodContext extends MethodContextLike {}

export interface MethodResolution {
  methodName: string;
  lookupField?: string;
}

export interface ResolvedPathsLike {
  moduleDir: string;
}

export interface ResolvedPaths extends ResolvedPathsLike {
  controllerPath: string;
  servicePath: string;
  entityDir: string;
  dtoDir: string;
  protoPath?: string;
}

export interface SearchDtoFieldInfo {
  name: string;
  type: 'string' | 'number' | 'boolean';
}

export function mapPrimitiveType(typeText: string | undefined): EntityFieldInfo['type'] | null {
  const normalized = typeText?.replace(/\s/g, '');
  if (!normalized) return null;
  if (normalized === 'string') return 'string';
  if (normalized === 'number') return 'number';
  if (normalized === 'boolean') return 'boolean';
  return null;
}

export function buildFieldTsType(type: EntityFieldInfo['type']): string {
  return type;
}

export function getLookupCandidateFields(fields: EntityFieldInfo[]): EntityFieldInfo[] {
  return fields.filter((field) => !['password', 'createdAt', 'updatedAt'].includes(field.name));
}
