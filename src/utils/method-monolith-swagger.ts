import path from 'node:path';
import fs from 'fs-extra';
import {
  IndentationText,
  Project,
  QuoteKind,
} from 'ts-morph';
import type {
  ModuleNaming,
  ScaffoldConfig,
} from '../types';
import { toPascalCase } from './naming';
import { resolveModulePathContext } from './module-paths';
import type {
  EntityFieldInfo,
  MethodContextLike,
  ModuleArtifacts,
  ResolvedPathsLike,
} from './method-shared';

export interface MonolithSwaggerSupport {
  responseDtoPath: string;
  responseDtoName: string;
  decoratorFilePath: string;
  errorCodePrefix: string;
  hasErrorCatalog: boolean;
  errorCatalogPath: string;
  errorCatalogConstantName: string;
  notFoundErrorKey?: string;
  conflictErrorKey?: string;
}

function toConstantCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toUpperCase();
}

function buildErrorCatalogConstantName(entityFile: string): string {
  return `${toConstantCase(entityFile)}_ERRORS`;
}

function buildResponseFieldExample(field: EntityFieldInfo): string | number | boolean {
  if (field.type === 'boolean') {
    return field.name.startsWith('is') ? true : false;
  }
  if (field.type === 'number') {
    return field.name.toLowerCase().includes('price') ? 999 : 1;
  }

  const lowerName = field.name.toLowerCase();
  if (lowerName === 'id') return '3f0f4d2d-2b99-4f0f-9f4f-2f54e3acb3a1';
  if (lowerName.includes('email')) return 'user@example.com';
  if (lowerName.includes('slug')) return 'sample-slug';
  if (lowerName.includes('name')) return 'John';
  if (lowerName.includes('role')) return 'admin';
  if (lowerName.includes('phone')) return '0812345678';
  if (lowerName.includes('createdat') || lowerName.includes('updatedat')) return '2026-06-15T12:00:00.000Z';
  return `sample-${field.name}`;
}

function buildResponseDtoContent(responseDtoName: string, fields: EntityFieldInfo[]): string {
  const safeFields = fields.filter((field) => field.name !== 'password');
  const normalizedFields = [...safeFields];

  if (!normalizedFields.some((field) => field.name === 'id')) {
    normalizedFields.unshift({ name: 'id', type: 'string' });
  }
  if (!normalizedFields.some((field) => field.name === 'createdAt')) {
    normalizedFields.push({ name: 'createdAt', type: 'string' });
  }
  if (!normalizedFields.some((field) => field.name === 'updatedAt')) {
    normalizedFields.push({ name: 'updatedAt', type: 'string' });
  }

  const usesOptional = normalizedFields.some((field) => field.optional);
  const importNames = usesOptional
    ? ['ApiProperty', 'ApiPropertyOptional']
    : ['ApiProperty'];
  const body = normalizedFields.length > 0
    ? normalizedFields.map((field) => {
        const decoratorName = field.optional ? 'ApiPropertyOptional' : 'ApiProperty';
        const example = JSON.stringify(buildResponseFieldExample(field));
        const optionalToken = field.optional ? '?' : '';
        return [
          `  @${decoratorName}({ example: ${example} })`,
          `  ${field.name}${optionalToken}: ${field.type === 'string' && (field.name === 'createdAt' || field.name === 'updatedAt') ? 'Date' : field.type};`,
        ].join('\n');
      }).join('\n\n')
    : [
        "  @ApiProperty({ example: 'uuid' })",
        '  id: string;',
        '',
        "  @ApiProperty({ example: '2026-06-15T12:00:00.000Z' })",
        '  createdAt: Date;',
        '',
        "  @ApiProperty({ example: '2026-06-15T12:00:00.000Z' })",
        '  updatedAt: Date;',
      ].join('\n');

  return [
    `import { ${importNames.join(', ')} } from '@nestjs/swagger';`,
    '',
    `export class ${responseDtoName} {`,
    body,
    '}',
    '',
  ].join('\n');
}

function getResponseDtoFields(fields: EntityFieldInfo[]): EntityFieldInfo[] {
  const safeFields = fields.filter((field) => field.name !== 'password');
  const normalizedFields = [...safeFields];

  if (!normalizedFields.some((field) => field.name === 'id')) {
    normalizedFields.unshift({ name: 'id', type: 'string' });
  }
  if (!normalizedFields.some((field) => field.name === 'createdAt')) {
    normalizedFields.push({ name: 'createdAt', type: 'string' });
  }
  if (!normalizedFields.some((field) => field.name === 'updatedAt')) {
    normalizedFields.push({ name: 'updatedAt', type: 'string' });
  }

  return normalizedFields;
}

async function syncResponseDtoFile(
  responseDtoPath: string,
  responseDtoName: string,
  fields: EntityFieldInfo[],
): Promise<void> {
  if (!(await fs.pathExists(responseDtoPath))) {
    await fs.writeFile(responseDtoPath, buildResponseDtoContent(responseDtoName, fields));
    return;
  }

  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    manipulationSettings: {
      indentationText: IndentationText.TwoSpaces,
      quoteKind: QuoteKind.Single,
    },
  });
  const sourceFile = project.addSourceFileAtPath(responseDtoPath);
  const classDecl =
    sourceFile.getClass(responseDtoName)
    ?? sourceFile.getClasses()[0];

  if (!classDecl) {
    await fs.writeFile(responseDtoPath, buildResponseDtoContent(responseDtoName, fields));
    return;
  }

  const responseFields = getResponseDtoFields(fields);
  const needsOptionalDecorator = responseFields.some((field) => field.optional);
  const swaggerImport = sourceFile.getImportDeclaration(
    (declaration) => declaration.getModuleSpecifierValue() === '@nestjs/swagger',
  );

  if (!swaggerImport) {
    sourceFile.addImportDeclaration({
      moduleSpecifier: '@nestjs/swagger',
      namedImports: needsOptionalDecorator
        ? ['ApiProperty', 'ApiPropertyOptional']
        : ['ApiProperty'],
    });
  } else {
    const existingNames = new Set(
      swaggerImport.getNamedImports().map((namedImport) => namedImport.getName()),
    );
    const requiredNames = ['ApiProperty', ...(needsOptionalDecorator ? ['ApiPropertyOptional'] : [])];
    const missingNames = requiredNames.filter((name) => !existingNames.has(name));
    if (missingNames.length > 0) {
      swaggerImport.addNamedImports(missingNames);
    }
  }

  for (const field of responseFields) {
    if (classDecl.getProperty(field.name)) {
      continue;
    }

    const decoratorName = field.optional ? 'ApiPropertyOptional' : 'ApiProperty';
    classDecl.addProperty({
      name: field.name,
      hasQuestionToken: Boolean(field.optional),
      type:
        field.type === 'string' && (field.name === 'createdAt' || field.name === 'updatedAt')
          ? 'Date'
          : field.type,
      decorators: [{
        name: decoratorName,
        arguments: [`{ example: ${JSON.stringify(buildResponseFieldExample(field))} }`],
      }],
    });
  }

  await sourceFile.save();
}

export async function ensureMonolithSwaggerSupport(
  config: ScaffoldConfig,
  paths: ResolvedPathsLike,
  artifacts: ModuleArtifacts,
  moduleVersion: string,
  entityFields: EntityFieldInfo[],
): Promise<MonolithSwaggerSupport> {
  const swaggerDir = path.join(paths.moduleDir, 'swagger');
  const responseDtoName = `${artifacts.entityName}ResponseDto`;
  const responseDtoPath = path.join(swaggerDir, `${artifacts.entityFile}-response.dto.ts`);
  const decoratorFilePath = path.join(swaggerDir, `${artifacts.entityFile}-swagger.decorator.ts`);

  await fs.ensureDir(swaggerDir);
  await syncResponseDtoFile(responseDtoPath, responseDtoName, entityFields);

  if (!(await fs.pathExists(decoratorFilePath))) {
    await fs.writeFile(
      decoratorFilePath,
      [
        "import { applyDecorators } from '@nestjs/common';",
        "import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';",
        '',
      ].join('\n'),
    );
  }

  const errorCatalogPath = path.join(paths.moduleDir, `${artifacts.entityFile}-error-catalog.ts`);
  const errorCatalogConstantName = buildErrorCatalogConstantName(artifacts.entityFile);
  const hasErrorCatalog = await fs.pathExists(errorCatalogPath);
  const errorCatalogContent = hasErrorCatalog ? await fs.readFile(errorCatalogPath, 'utf8') : '';
  const errorCatalogKeys = [...errorCatalogContent.matchAll(/^\s+([A-Z0-9_]+):\s*\{/gm)].map((match) => match[1]);
  const notFoundErrorKey = errorCatalogKeys.find((key) => key.includes('NOT_FOUND'));
  const conflictErrorKey = errorCatalogKeys.find((key) => key.includes('ALREADY') || key.includes('CONFLICT'));

  return {
    responseDtoPath,
    responseDtoName,
    decoratorFilePath,
    errorCodePrefix: toConstantCase(artifacts.entityFile),
    hasErrorCatalog,
    errorCatalogPath,
    errorCatalogConstantName,
    notFoundErrorKey,
    conflictErrorKey,
  };
}

export type {
  EntityFieldInfo,
  MethodContextLike,
  ModuleArtifacts,
  ResolvedPathsLike,
} from './method-shared';

function buildMonolithSwaggerSummary(
  method: MethodContextLike,
  naming: ModuleNaming,
  artifacts: ModuleArtifacts,
): string {
  if (method.methodType === 'get' && method.getMode === 'all') {
    return `Search ${naming.name} with pagination`;
  }

  if (method.methodType === 'get') {
    const field = method.lookupField ?? 'id';
    return field === 'id'
      ? `Get ${artifacts.entityFile} by ID`
      : `Get ${artifacts.entityFile} by ${toPascalCase(field)}`;
  }

  if (method.methodType === 'post') return `Create ${artifacts.entityFile}`;
  if (method.methodType === 'put') return `Replace ${artifacts.entityFile}`;
  if (method.methodType === 'patch') return `Update ${artifacts.entityFile}`;
  return `Delete ${artifacts.entityFile}`;
}

export function buildMonolithSwaggerHelperName(methodName: string): string {
  return `Api${toPascalCase(methodName)}Docs`;
}

export function buildMonolithSwaggerHelperStatements(
  config: ScaffoldConfig,
  method: MethodContextLike,
  naming: ModuleNaming,
  artifacts: ModuleArtifacts,
  swaggerSupport: MonolithSwaggerSupport,
  useSearchDto: boolean,
): string[] {
  const helperCalls: string[] = [
    `ApiOperation({ summary: '${buildMonolithSwaggerSummary(method, naming, artifacts)}' })`,
  ];

  if (config.auth && method.methodType !== 'post') {
    helperCalls.push('ApiBearerAuth()');
  }

  if (method.methodType === 'get' && method.getMode !== 'all') {
    helperCalls.push(`ApiParam({ name: '${method.lookupField ?? 'id'}' })`);
  }

  if (method.methodType === 'put' || method.methodType === 'patch' || method.methodType === 'delete') {
    helperCalls.push(`ApiParam({ name: 'id' })`);
  }

  if (method.methodType === 'post') {
    helperCalls.push(`ApiBody({ type: ${artifacts.createDtoName} })`);
  }

  if (method.methodType === 'put' || method.methodType === 'patch') {
    helperCalls.push(`ApiBody({ type: ${artifacts.updateDtoName} })`);
  }

  if (method.methodType === 'get' && method.getMode === 'all') {
    helperCalls.push(
      `${useSearchDto ? 'ApiPaginatedSuccessResponse' : 'ApiArraySuccessResponse'}(${swaggerSupport.responseDtoName})`,
    );
    if (config.auth) helperCalls.push('ApiProtectedErrors()');
    helperCalls.push('ApiDefaultErrors()');
  } else if (method.methodType === 'post') {
    helperCalls.push(`ApiSuccessResponse(${swaggerSupport.responseDtoName})`);
    if (swaggerSupport.hasErrorCatalog) {
      helperCalls.push(
        `ApiConflictError(${swaggerSupport.errorCatalogConstantName}.${swaggerSupport.conflictErrorKey ?? `${swaggerSupport.errorCodePrefix}_ALREADY_EXISTS`}.code, ${swaggerSupport.errorCatalogConstantName}.${swaggerSupport.conflictErrorKey ?? `${swaggerSupport.errorCodePrefix}_ALREADY_EXISTS`}.message)`,
      );
    } else {
      helperCalls.push(`ApiConflictError('${swaggerSupport.errorCodePrefix}_ALREADY_EXISTS', '${artifacts.entityName} already exists')`);
    }
    helperCalls.push('ApiDefaultErrors()');
  } else if (method.methodType === 'delete') {
    helperCalls.push('ApiEmptySuccessResponse()');
    if (swaggerSupport.hasErrorCatalog) {
      helperCalls.push(
        `ApiNotFoundError(${swaggerSupport.errorCatalogConstantName}.${swaggerSupport.notFoundErrorKey ?? `${swaggerSupport.errorCodePrefix}_NOT_FOUND`}.code, ${swaggerSupport.errorCatalogConstantName}.${swaggerSupport.notFoundErrorKey ?? `${swaggerSupport.errorCodePrefix}_NOT_FOUND`}.message)`,
      );
    } else {
      helperCalls.push(`ApiNotFoundError('${swaggerSupport.errorCodePrefix}_NOT_FOUND', '${artifacts.entityName} not found')`);
    }
    if (config.auth) helperCalls.push('ApiProtectedErrors()');
    helperCalls.push('ApiDefaultErrors()');
  } else {
    helperCalls.push(`ApiSuccessResponse(${swaggerSupport.responseDtoName})`);
    if (swaggerSupport.hasErrorCatalog) {
      helperCalls.push(
        `ApiNotFoundError(${swaggerSupport.errorCatalogConstantName}.${swaggerSupport.notFoundErrorKey ?? `${swaggerSupport.errorCodePrefix}_NOT_FOUND`}.code, ${swaggerSupport.errorCatalogConstantName}.${swaggerSupport.notFoundErrorKey ?? `${swaggerSupport.errorCodePrefix}_NOT_FOUND`}.message)`,
      );
    } else {
      helperCalls.push(`ApiNotFoundError('${swaggerSupport.errorCodePrefix}_NOT_FOUND', '${artifacts.entityName} not found')`);
    }
    if (config.auth) helperCalls.push('ApiProtectedErrors()');
    helperCalls.push('ApiDefaultErrors()');
  }

  return [
    'return applyDecorators(',
    ...helperCalls.map((call) => `  ${call},`),
    ');',
  ];
}

export function getMonolithSwaggerDecoratorImportPaths(
  config: ScaffoldConfig,
  moduleVersion: string,
): { successPath: string; errorPath: string } {
  const pathContext = resolveModulePathContext(config.moduleVersioning, moduleVersion);
  return {
    successPath: `${pathContext.commonFromNested}/swagger/decorators/api-success-response.decorator`,
    errorPath: `${pathContext.commonFromNested}/swagger/decorators/api-error-responses.decorator`,
  };
}
