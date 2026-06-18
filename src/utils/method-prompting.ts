import { input, select } from '@inquirer/prompts';
import { promptMethodName } from '../prompts/generate-wizard';
import { normalizeIdentifier } from './identifiers';
import { toPascalCase } from './naming';
import { buildMicroserviceRpcName, buildMicroserviceRpcNameFromMethodName } from './method-microservice';
import { getPrimaryClass, hasMethod } from './source-file-utils';
import {
  getLookupCandidateFields,
  type EntityFieldInfo,
  type MethodKind,
  type MethodResolution,
  type SearchDtoFieldInfo,
} from './method-shared';
import type {
  GetMethodMode,
  ModuleNaming,
  ScaffoldConfig,
} from '../types';
import type { SourceFile } from 'ts-morph';

function toCamelCase(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function buildFieldSuffix(fieldName: string): string {
  if (fieldName === 'id') {
    return 'ById';
  }
  return `By${toPascalCase(fieldName)}`;
}

function buildEntityBasedSuggestions(
  prefix: string,
  fields: EntityFieldInfo[],
  options?: { excludeId?: boolean },
): string[] {
  return fields
    .filter((field) => !(options?.excludeId && field.name === 'id'))
    .map((field) => `${prefix}${buildFieldSuffix(field.name)}`);
}

function buildGetAllSuggestions(
  fields: SearchDtoFieldInfo[],
  baseMethodName: string,
): string[] {
  const derived = fields
    .filter((field) => !['page', 'limit', 'search'].includes(field.name))
    .map((field) => `${baseMethodName}${buildFieldSuffix(field.name)}`);
  return [...new Set(derived)];
}

export function buildDefaultMethodName(
  methodType: MethodKind,
  naming: ModuleNaming,
  architecture: ScaffoldConfig['architecture'],
  entityName: string,
  getMode?: GetMethodMode,
  lookupField?: string,
): string {
  if (architecture === 'microservice') {
    return toCamelCase(
      buildMicroserviceRpcName(
        methodType,
        naming,
        entityName,
        getMode,
        lookupField,
      ),
    );
  }

  switch (methodType) {
    case 'get':
      if (getMode === 'all') return 'findAll';
      return lookupField === 'id'
        ? 'findById'
        : `findBy${toPascalCase(lookupField ?? naming.entityFile)}`;
    case 'post':
      return 'create';
    case 'put':
      return 'replace';
    case 'patch':
      return 'update';
    case 'delete':
      return 'delete';
  }
}

export function buildMethodNameExamples(
  methodType: MethodKind,
  architecture: ScaffoldConfig['architecture'],
  entityName: string,
  modulePascalName: string,
  getMode?: GetMethodMode,
): string[] {
  return architecture === 'microservice'
    ? methodType === 'get' && getMode === 'all'
      ? [`get${modulePascalName}ByRole`, `get${modulePascalName}ByStatus`]
      : methodType === 'get'
        ? [`get${entityName}ByEmail`, `get${entityName}BySlug`]
        : methodType === 'post'
          ? [`create${entityName}Draft`, `create${entityName}FromInvite`]
          : methodType === 'put'
            ? [`replace${entityName}Profile`, `replace${entityName}Settings`]
            : methodType === 'patch'
              ? [`update${entityName}Status`, `update${entityName}Profile`]
              : [`delete${entityName}ByEmail`, `delete${entityName}BySlug`]
    : methodType === 'get' && getMode === 'all'
      ? ['findAllByRole', 'findAllByIsActive']
      : methodType === 'get'
        ? ['findByEmail', 'findBySlug']
        : methodType === 'post'
          ? ['createAdmin', 'createDraft']
          : methodType === 'put'
            ? ['replaceProfile', 'replaceSettings']
            : methodType === 'patch'
              ? ['updateStatus', 'updateProfile']
              : ['deleteByEmail', 'deleteBySlug'];
}

export function buildLookupFieldExamples(
  architecture: ScaffoldConfig['architecture'],
  entityFields: EntityFieldInfo[],
): string[] {
  const preferredExamples = entityFields
    .map((field) => field.name)
    .filter((field) => !['id', 'createdAt', 'updatedAt', 'password'].includes(field))
    .slice(0, 3);

  if (preferredExamples.length > 0) {
    return preferredExamples;
  }

  return architecture === 'microservice'
    ? ['email', 'slug', 'externalId']
    : ['email', 'slug', 'username'];
}

function buildMethodSuggestions(
  methodType: MethodKind,
  methodName: string,
  fields: EntityFieldInfo[],
  searchFields: SearchDtoFieldInfo[],
  architecture: ScaffoldConfig['architecture'],
  entityName: string,
  modulePascalName: string,
  getMode?: GetMethodMode,
): string[] {
  const semanticSuggestions = architecture === 'microservice'
    ? methodType === 'put'
      ? [`replace${entityName}Profile`, `replace${entityName}Settings`]
      : methodType === 'patch'
        ? [`update${entityName}Status`, `update${entityName}Profile`]
        : []
    : methodType === 'put'
      ? ['replaceProfile', 'replaceSettings']
      : methodType === 'patch'
        ? ['updateStatus', 'updateProfile']
        : [];

  if (architecture === 'microservice') {
    if (methodType === 'get' && getMode === 'one') {
      return buildEntityBasedSuggestions(`get${entityName}`, getLookupCandidateFields(fields), {
        excludeId: true,
      });
    }

    switch (methodType) {
      case 'get':
        return getMode === 'all'
          ? buildGetAllSuggestions(searchFields, methodName)
          : [];
      case 'post':
        return [];
      case 'put':
        return semanticSuggestions;
      case 'patch':
        return semanticSuggestions;
      case 'delete':
        return [];
    }
  }

  if (methodType === 'get' && getMode === 'one') {
    return buildEntityBasedSuggestions('find', getLookupCandidateFields(fields), { excludeId: true });
  }

  switch (methodType) {
    case 'get':
      return getMode === 'all'
        ? buildGetAllSuggestions(searchFields, methodName)
        : [];
    case 'post':
      return [];
    case 'put':
      return semanticSuggestions;
    case 'patch':
      return semanticSuggestions;
    case 'delete':
      return [];
  }
}

function resolveLookupFieldFromSuggestion(
  suggestion: string,
  methodType: MethodKind,
  architecture: ScaffoldConfig['architecture'],
  entityName: string,
  fields: EntityFieldInfo[],
  getMode?: GetMethodMode,
): string | undefined {
  if (methodType !== 'get' || getMode !== 'one') {
    return undefined;
  }

  const prefixes = architecture === 'microservice'
    ? [`get${entityName}By`]
    : ['findBy'];

  for (const prefix of prefixes) {
    if (!suggestion.startsWith(prefix)) {
      continue;
    }

    const suffix = suggestion.slice(prefix.length);
    if (!suffix) {
      continue;
    }

    const matchedField = fields.find((field) => toPascalCase(field.name) === suffix);
    if (matchedField) {
      return matchedField.name;
    }
  }

  return undefined;
}

function buildCustomMethodNamePrompt(
  methodType: MethodKind,
  architecture: ScaffoldConfig['architecture'],
  entityName: string,
  modulePascalName: string,
  getMode?: GetMethodMode,
): string {
  const examples = buildMethodNameExamples(
    methodType,
    architecture,
    entityName,
    modulePascalName,
    getMode,
  );

  return `New method name (e.g. ${examples.join(', ')}):`;
}

export async function resolveMethodName(
  sourceFiles: SourceFile[],
  preferredName: string | undefined,
  fallbackName: string,
  methodType: MethodKind,
  fields: EntityFieldInfo[],
  searchFields: SearchDtoFieldInfo[],
  architecture: ScaffoldConfig['architecture'],
  entityName: string,
  modulePascalName: string,
  getMode?: GetMethodMode,
  existingRpcNames?: Set<string>,
  initialLookupField?: string,
): Promise<MethodResolution> {
  let candidate =
    preferredName?.trim()
    || await promptMethodName(
      fallbackName,
      buildMethodNameExamples(
        methodType,
        architecture,
        entityName,
        modulePascalName,
        getMode,
      ),
    );
  candidate = normalizeIdentifier(candidate, 'Method name');
  let resolvedLookupField = initialLookupField;
  const classes = sourceFiles.map(getPrimaryClass);

  while (true) {
    const hasMethodCollision = classes.some((classDecl) => hasMethod(classDecl, candidate));
    const nextRpcName = architecture === 'microservice'
      ? buildMicroserviceRpcNameFromMethodName(candidate)
      : null;
    const hasRpcCollision = nextRpcName !== null && existingRpcNames?.has(nextRpcName);

    if (!hasMethodCollision && !hasRpcCollision) {
      break;
    }

    const conflictMessage = hasRpcCollision
      ? `Method "${candidate}" would create duplicate RPC "${nextRpcName}". What should we use instead?`
      : `Method "${candidate}" already exists. What should we use instead?`;
    const suggestions = buildMethodSuggestions(
      methodType,
      candidate,
      fields,
      searchFields,
      architecture,
      entityName,
      modulePascalName,
      getMode,
    );
    const suggestion = await select({
      message: conflictMessage,
      choices: [
        { name: 'Type a custom name', value: '__custom__' },
        ...[...new Set(suggestions)]
          .filter((value) => value !== candidate)
          .map((value) => ({ name: value, value })),
      ],
    });

    candidate = suggestion === '__custom__'
      ? normalizeIdentifier(await input({
          message: buildCustomMethodNamePrompt(
            methodType,
            architecture,
            entityName,
            modulePascalName,
            getMode,
          ),
          validate: (value) => value.trim() ? true : 'Method name is required',
        }), 'Method name')
      : suggestion;

    const suggestionLookupField = resolveLookupFieldFromSuggestion(
      candidate,
      methodType,
      architecture,
      entityName,
      fields,
      getMode,
    );
    if (suggestionLookupField) {
      resolvedLookupField = suggestionLookupField;
    }
  }

  return {
    methodName: candidate,
    lookupField: resolvedLookupField,
  };
}
