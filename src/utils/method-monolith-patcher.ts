import path from 'node:path';
import fs from 'fs-extra';
import type { Project } from 'ts-morph';
import type {
  ModuleNaming,
  ScaffoldConfig,
} from '../types';
import { resolveModulePathContext } from './module-paths';
import {
  buildMonolithSwaggerHelperName,
  buildMonolithSwaggerHelperStatements,
  ensureMonolithSwaggerSupport,
  getMonolithSwaggerDecoratorImportPaths,
  type MonolithSwaggerSupport,
} from './method-monolith-swagger';
import {
  buildFieldTsType,
  type EntityFieldInfo,
  type MethodContext,
  type ModuleArtifacts,
  type ResolvedPaths,
} from './method-shared';
import {
  ensureNamedImport,
  ensureSourceFile,
  getPrimaryClass,
  inferServicePropertyName,
  relativeImport,
} from './source-file-utils';

function shouldProtectMonolithMethod(method: MethodContext): boolean {
  return method.methodType !== 'post';
}

async function ensureDirectory(filePath: string): Promise<void> {
  await fs.ensureDir(path.dirname(filePath));
}

async function ensureFileContent(filePath: string, content: string): Promise<void> {
  if (await fs.pathExists(filePath)) {
    return;
  }
  await ensureDirectory(filePath);
  await fs.writeFile(filePath, content);
}

async function ensureMonolithDtoFile(
  config: ScaffoldConfig,
  artifacts: ModuleArtifacts,
  kind: 'create' | 'update' | 'search',
): Promise<string> {
  const filePath = kind === 'create'
    ? artifacts.createDtoPath
    : kind === 'update'
      ? artifacts.updateDtoPath
      : artifacts.searchDtoPath;

  if (kind === 'search') {
    const pathContext = resolveModulePathContext(
      config.moduleVersioning,
      config.moduleVersioning ? 'v1' : '',
    );
    await ensureFileContent(
      filePath,
      `import { PaginationDto } from '${pathContext.commonFromNested}/dto/pagination.dto';\n\nexport class ${artifacts.searchDtoName} extends PaginationDto {\n  // TODO: define query fields\n}\n`,
    );
  } else {
    const className = kind === 'create'
      ? artifacts.createDtoName
      : artifacts.updateDtoName;
    await ensureFileContent(
      filePath,
      `export class ${className} {\n  // TODO: define request fields\n}\n`,
    );
  }

  return filePath;
}

function buildMonolithControllerMethod(
  method: MethodContext,
  config: ScaffoldConfig,
  artifacts: ModuleArtifacts,
  swaggerHelperName: string | undefined,
  servicePropertyName: string,
  lookupFieldInfo: EntityFieldInfo | undefined,
  useSearchDto: boolean,
): {
  decorators: Array<{ name: string; args: string[] }>;
  parameters: Array<{ name: string; type?: string; decorator: { name: string; args: string[] } }>;
  statements: string[];
} {
  const decorators: Array<{ name: string; args: string[] }> = [];

  if (config.auth && shouldProtectMonolithMethod(method)) {
    decorators.push({ name: 'UseGuards', args: ['JwtAuthGuard'] });
  }

  if (config.swagger && swaggerHelperName) {
    decorators.push({ name: swaggerHelperName, args: [] });
  }

  if (method.methodType === 'get' && method.getMode === 'all') {
    decorators.unshift({ name: 'Get', args: [] });
    return {
      decorators,
      parameters: useSearchDto
        ? [{
            name: 'dto',
            type: artifacts.searchDtoName,
            decorator: { name: 'Query', args: [] },
          }]
        : [],
      statements: [`return this.${servicePropertyName}.${method.methodName}(${useSearchDto ? 'dto' : ''});`],
    };
  }

  if (method.methodType === 'get') {
    const field = method.lookupField ?? 'id';
    const route = field === 'id' ? ':id' : `${field}/:${field}`;

    decorators.unshift({ name: 'Get', args: [`'${route}'`] });

    return {
      decorators,
      parameters: [{
        name: field,
        type: buildFieldTsType(lookupFieldInfo?.type ?? 'string'),
        decorator: { name: 'Param', args: [`'${field}'`] },
      }],
      statements: [`return this.${servicePropertyName}.${method.methodName}(${field});`],
    };
  }

  if (method.methodType === 'post') {
    decorators.unshift({ name: 'Post', args: [] });

    return {
      decorators,
      parameters: [{
        name: 'dto',
        type: artifacts.createDtoName,
        decorator: { name: 'Body', args: [] },
      }],
      statements: [`return this.${servicePropertyName}.${method.methodName}(dto);`],
    };
  }

  if (method.methodType === 'delete') {
    decorators.unshift({ name: 'Delete', args: [`':id'`] });

    return {
      decorators,
      parameters: [{
        name: 'id',
        type: 'string',
        decorator: { name: 'Param', args: [`'id'`] },
      }],
      statements: [`return this.${servicePropertyName}.${method.methodName}(id);`],
    };
  }

  return {
    decorators: [
      {
        name: method.methodType === 'put' ? 'Put' : 'Patch',
        args: [`':id'`],
      },
      ...decorators,
    ],
    parameters: [
      {
        name: 'id',
        type: 'string',
        decorator: { name: 'Param', args: [`'id'`] },
      },
      {
        name: 'dto',
        type: artifacts.updateDtoName,
        decorator: { name: 'Body', args: [] },
      },
    ],
    statements: [`return this.${servicePropertyName}.${method.methodName}(id, dto);`],
  };
}

function buildMonolithServiceStatements(method: MethodContext): string[] {
  if (method.methodType === 'get' && method.getMode === 'all') {
    return ['// TODO: implement list use case', 'return [];'];
  }
  if (method.methodType === 'get') {
    const field = method.lookupField ?? 'id';
    return [`// TODO: implement lookup by ${field}`, `return { ${field} };`];
  }
  if (method.methodType === 'post') {
    return ['// TODO: implement create use case', 'return dto;'];
  }
  if (method.methodType === 'delete') {
    return ['// TODO: implement delete use case', 'return { id };'];
  }
  return ['// TODO: implement write use case', 'return { id, ...dto };'];
}

function ensureMonolithCommonImports(
  controllerFilePath: string,
  controllerFile: ReturnType<typeof ensureSourceFile>,
  config: ScaffoldConfig,
  method: MethodContext,
  moduleVersion: string,
  useSearchDto: boolean,
): void {
  const commonImports: string[] = [];
  if (method.methodType === 'get') commonImports.push('Get');
  if (method.methodType === 'post') commonImports.push('Post', 'Body');
  if (method.methodType === 'put') commonImports.push('Put', 'Param', 'Body');
  if (method.methodType === 'patch') commonImports.push('Patch', 'Param', 'Body');
  if (method.methodType === 'delete') commonImports.push('Delete', 'Param');
  if (method.methodType === 'get' && method.getMode === 'one') commonImports.push('Param');
  if (useSearchDto) commonImports.push('Query');
  if (config.auth && shouldProtectMonolithMethod(method)) commonImports.push('UseGuards');

  ensureNamedImport(controllerFile, '@nestjs/common', [...new Set(commonImports)]);

  if (config.auth && shouldProtectMonolithMethod(method)) {
    const pathContext = resolveModulePathContext(config.moduleVersioning, moduleVersion);
    ensureNamedImport(
      controllerFile,
      `${pathContext.commonFromModule}/guards/jwt-auth.guard`,
      ['JwtAuthGuard'],
    );
  }
}

function ensureSwaggerHelper(
  project: Project,
  config: ScaffoldConfig,
  moduleVersion: string,
  method: MethodContext,
  naming: ModuleNaming,
  artifacts: ModuleArtifacts,
  paths: ResolvedPaths,
  swaggerSupport: MonolithSwaggerSupport,
  useSearchDto: boolean,
  controllerFile: ReturnType<typeof ensureSourceFile>,
): string {
  const swaggerHelperName = buildMonolithSwaggerHelperName(method.methodName);
  const swaggerFile = ensureSourceFile(project, swaggerSupport.decoratorFilePath);
  const decoratorImportPaths = getMonolithSwaggerDecoratorImportPaths(config, moduleVersion);

  ensureNamedImport(swaggerFile, '@nestjs/common', ['applyDecorators']);
  ensureNamedImport(swaggerFile, '@nestjs/swagger', ['ApiBearerAuth', 'ApiBody', 'ApiOperation', 'ApiParam']);
  ensureNamedImport(
    swaggerFile,
    decoratorImportPaths.successPath,
    ['ApiArraySuccessResponse', 'ApiEmptySuccessResponse', 'ApiPaginatedSuccessResponse', 'ApiSuccessResponse'],
  );
  ensureNamedImport(
    swaggerFile,
    decoratorImportPaths.errorPath,
    ['ApiConflictError', 'ApiDefaultErrors', 'ApiNotFoundError', 'ApiProtectedErrors'],
  );
  ensureNamedImport(
    swaggerFile,
    relativeImport(swaggerSupport.decoratorFilePath, swaggerSupport.responseDtoPath),
    [swaggerSupport.responseDtoName],
  );
  if (method.methodType === 'post') {
    ensureNamedImport(
      swaggerFile,
      relativeImport(swaggerSupport.decoratorFilePath, artifacts.createDtoPath),
      [artifacts.createDtoName],
    );
  }
  if (method.methodType === 'put' || method.methodType === 'patch') {
    ensureNamedImport(
      swaggerFile,
      relativeImport(swaggerSupport.decoratorFilePath, artifacts.updateDtoPath),
      [artifacts.updateDtoName],
    );
  }
  if (swaggerSupport.hasErrorCatalog) {
    ensureNamedImport(
      swaggerFile,
      relativeImport(swaggerSupport.decoratorFilePath, swaggerSupport.errorCatalogPath),
      [swaggerSupport.errorCatalogConstantName],
    );
  }

  const helperExists = swaggerFile.getFunction(swaggerHelperName);
  if (!helperExists) {
    swaggerFile.addFunction({
      isExported: true,
      name: swaggerHelperName,
      statements: buildMonolithSwaggerHelperStatements(
        config,
        method,
        naming,
        artifacts,
        swaggerSupport,
        useSearchDto,
      ),
    });
  }

  ensureNamedImport(
    controllerFile,
    relativeImport(paths.controllerPath, swaggerSupport.decoratorFilePath),
    [swaggerHelperName],
  );

  return swaggerHelperName;
}

export async function patchMonolith(
  project: Project,
  config: ScaffoldConfig,
  naming: ModuleNaming,
  artifacts: ModuleArtifacts,
  paths: ResolvedPaths,
  moduleVersion: string,
  method: MethodContext,
  entityFields: EntityFieldInfo[],
): Promise<string[]> {
  const controllerFile = ensureSourceFile(project, paths.controllerPath);
  const serviceFile = ensureSourceFile(project, paths.servicePath);
  const controllerClass = getPrimaryClass(controllerFile);
  const serviceClass = getPrimaryClass(serviceFile);
  const servicePropertyName = inferServicePropertyName(controllerClass, `${naming.camelName}Service`);

  const useSearchDto = method.methodType === 'get'
    && method.getMode === 'all'
    && config.pagination;
  const touchedFiles = new Set<string>();
  const swaggerSupport = config.swagger
    ? await ensureMonolithSwaggerSupport(config, paths, artifacts, moduleVersion, entityFields)
    : undefined;

  if (swaggerSupport) {
    touchedFiles.add(swaggerSupport.responseDtoPath);
    touchedFiles.add(swaggerSupport.decoratorFilePath);
  }

  ensureMonolithCommonImports(paths.controllerPath, controllerFile, config, method, moduleVersion, useSearchDto);

  let swaggerHelperName: string | undefined;
  if (config.swagger && swaggerSupport) {
    swaggerHelperName = ensureSwaggerHelper(
      project,
      config,
      moduleVersion,
      method,
      naming,
      artifacts,
      paths,
      swaggerSupport,
      useSearchDto,
      controllerFile,
    );
  }

  if (method.methodType === 'post') {
    const dtoPath = await ensureMonolithDtoFile(config, artifacts, 'create');
    touchedFiles.add(dtoPath);
    ensureNamedImport(controllerFile, relativeImport(paths.controllerPath, dtoPath), [artifacts.createDtoName]);
    ensureNamedImport(serviceFile, relativeImport(paths.servicePath, dtoPath), [artifacts.createDtoName]);
  }

  if (method.methodType === 'put' || method.methodType === 'patch') {
    const dtoPath = await ensureMonolithDtoFile(config, artifacts, 'update');
    touchedFiles.add(dtoPath);
    ensureNamedImport(controllerFile, relativeImport(paths.controllerPath, dtoPath), [artifacts.updateDtoName]);
    ensureNamedImport(serviceFile, relativeImport(paths.servicePath, dtoPath), [artifacts.updateDtoName]);
  }

  if (useSearchDto) {
    const dtoPath = await ensureMonolithDtoFile(config, artifacts, 'search');
    touchedFiles.add(dtoPath);
    ensureNamedImport(controllerFile, relativeImport(paths.controllerPath, dtoPath), [artifacts.searchDtoName]);
    ensureNamedImport(serviceFile, relativeImport(paths.servicePath, dtoPath), [artifacts.searchDtoName]);
  }

  const lookupFieldInfo = entityFields.find((field) => field.name === method.lookupField);
  const controllerMethod = buildMonolithControllerMethod(
    method,
    config,
    artifacts,
    swaggerHelperName,
    servicePropertyName,
    lookupFieldInfo,
    useSearchDto,
  );

  controllerClass.addMethod({
    name: method.methodName,
    decorators: controllerMethod.decorators.map((decorator) => ({
      name: decorator.name,
      arguments: decorator.args,
    })),
    parameters: controllerMethod.parameters.map((parameter) => ({
      name: parameter.name,
      type: parameter.type,
      decorators: [{
        name: parameter.decorator.name,
        arguments: parameter.decorator.args,
      }],
    })),
    statements: controllerMethod.statements,
  });

  const serviceParameters =
    method.methodType === 'get' && method.getMode === 'all'
      ? (useSearchDto ? [{ name: 'dto', type: artifacts.searchDtoName }] : [])
      : method.methodType === 'get'
        ? [{ name: method.lookupField ?? 'id', type: buildFieldTsType(lookupFieldInfo?.type ?? 'string') }]
        : method.methodType === 'post'
          ? [{ name: 'dto', type: artifacts.createDtoName }]
          : method.methodType === 'delete'
            ? [{ name: 'id', type: 'string' }]
            : [
                { name: 'id', type: 'string' },
                { name: 'dto', type: artifacts.updateDtoName },
              ];

  serviceClass.addMethod({
    name: method.methodName,
    parameters: serviceParameters,
    statements: buildMonolithServiceStatements(method),
  });

  return [...touchedFiles];
}
