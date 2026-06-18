import path from 'node:path';
import fs from 'fs-extra';
import { toPascalCase } from './naming';
import {
  ensureNamedImport,
  ensureSourceFile,
  getPrimaryClass,
  inferServicePropertyName,
  relativeImport,
} from './source-file-utils';
import type { ModuleNaming } from '../types';
import type {
  EntityFieldInfo,
  MethodContextLike,
  ModuleArtifacts,
  ResolvedPaths,
} from './method-shared';
import type { Project } from 'ts-morph';

export interface MicroRequestField {
  name: string;
  type: string;
}

function toKebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

function buildMicroDtoFileBase(requestName: string): string {
  return `${toKebabCase(requestName)}.dto.ts`;
}

function buildMicroDtoClassName(requestName: string): string {
  return `${requestName}Dto`;
}

function buildFieldTsType(type: EntityFieldInfo['type']): string {
  return type;
}

function buildProtoFieldType(type: string): string {
  if (type === 'number') return 'int32';
  if (type === 'boolean') return 'bool';
  return 'string';
}

export function buildMicroserviceRpcName(
  methodType: MethodContextLike['methodType'],
  naming: ModuleNaming,
  entityName: string,
  getMode?: MethodContextLike['getMode'],
  lookupField?: string,
): string {
  const entityBase = getMode === 'all' && methodType === 'get'
    ? naming.pascalName
    : entityName;

  switch (methodType) {
    case 'get':
      if (getMode === 'all') return `Get${toPascalCase(entityBase)}`;
      return lookupField === 'id'
        ? `Get${entityName}`
        : `Get${entityName}By${toPascalCase(lookupField ?? naming.entityFile)}`;
    case 'post':
      return `Create${entityName}`;
    case 'put':
      return `Replace${entityName}`;
    case 'patch':
      return `Update${entityName}`;
    case 'delete':
      return `Delete${entityName}`;
  }
}

export function buildMicroserviceRequestName(rpcName: string): string {
  return `${rpcName}Request`;
}

export function buildMicroserviceRpcNameFromMethodName(methodName: string): string {
  return toPascalCase(methodName);
}

export function buildMicroserviceRequestFields(
  method: MethodContextLike,
  entityFields: EntityFieldInfo[],
  lookupFieldInfo: EntityFieldInfo | undefined,
): MicroRequestField[] {
  const mutableEntityFields = entityFields
    .filter((field) => !['id', 'createdAt', 'updatedAt'].includes(field.name))
    .map((field) => ({
      name: field.name,
      type: buildFieldTsType(field.type),
    }));

  if (method.methodType === 'get' && method.getMode === 'all') {
    return [];
  }

  if (method.methodType === 'get') {
    return [{
      name: method.lookupField ?? 'id',
      type: buildFieldTsType(lookupFieldInfo?.type ?? 'string'),
    }];
  }

  if (method.methodType === 'post') {
    return mutableEntityFields;
  }

  if (method.methodType === 'delete') {
    return [{ name: 'id', type: 'string' }];
  }

  return [
    { name: 'id', type: 'string' },
    ...mutableEntityFields,
  ];
}

export async function ensureMicroRequestDto(
  dtoDir: string,
  requestName: string,
  fields: MicroRequestField[],
): Promise<{ className: string; filePath: string }> {
  const className = buildMicroDtoClassName(requestName);
  const filePath = path.join(dtoDir, buildMicroDtoFileBase(requestName));
  const body = fields.length > 0
    ? fields.map((field) => `  ${field.name}!: ${field.type};`).join('\n')
    : '  // TODO: define request fields';

  if (!(await fs.pathExists(filePath))) {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(
      filePath,
      `export class ${className} {\n${body}\n}\n`,
    );
  }

  return { className, filePath };
}

export async function discoverExistingGrpcRpcNames(
  controllerPath: string,
  protoPath?: string,
): Promise<Set<string>> {
  const names = new Set<string>();

  if (await fs.pathExists(controllerPath)) {
    const controllerContent = await fs.readFile(controllerPath, 'utf8');
    for (const match of controllerContent.matchAll(/@GrpcMethod\(\s*['"`][^'"`]+['"`]\s*,\s*['"`]([^'"`]+)['"`]\s*\)/g)) {
      if (match[1]) {
        names.add(match[1]);
      }
    }
  }

  if (protoPath && await fs.pathExists(protoPath)) {
    const protoContent = await fs.readFile(protoPath, 'utf8');
    for (const match of protoContent.matchAll(/\brpc\s+(\w+)\s*\(/g)) {
      if (match[1]) {
        names.add(match[1]);
      }
    }
  }

  return names;
}

export async function patchProtoFile(
  protoPath: string,
  naming: Pick<ModuleNaming, 'pascalName'> & Pick<ModuleArtifacts, 'entityName'>,
  method: MethodContextLike,
  requestFields: MicroRequestField[],
): Promise<void> {
  if (!(await fs.pathExists(protoPath))) {
    return;
  }

  let content = await fs.readFile(protoPath, 'utf8');
  const rpcName = method.rpcName!;
  const requestMessageName = method.requestName ?? buildMicroserviceRequestName(rpcName);
  const responseMessageName = method.methodType === 'delete'
    ? 'DeleteResponse'
    : `${naming.entityName}Response`;
  const rpcLine = `  rpc ${rpcName} (${requestMessageName}) returns (${responseMessageName});`;

  if (!content.includes(rpcLine)) {
    content = content.replace(
      /service\s+\w+\s*\{([\s\S]*?)\n\}/,
      (_match, inner) => `service ${naming.pascalName}Service {${inner}\n${rpcLine}\n}`,
    );
  }

  if (!content.includes(`message ${requestMessageName} {`)) {
    const fields = requestFields.length === 0
      ? '  // TODO: define request fields\n'
      : `${requestFields
          .map((field, index) => `  ${buildProtoFieldType(field.type)} ${field.name} = ${index + 1};`)
          .join('\n')}\n`;
    content = `${content.trimEnd()}\n\nmessage ${requestMessageName} {\n${fields}}\n`;
  }

  await fs.writeFile(protoPath, `${content.trimEnd()}\n`);
}

export function buildMicroserviceServiceStatements(
  method: MethodContextLike,
): string[] {
  if (method.methodType === 'get' && method.getMode === 'all') {
    return ['// TODO: implement list RPC use case', 'return [];'];
  }
  if (method.methodType === 'post') {
    return ['// TODO: implement create RPC use case', 'return request;'];
  }
  if (method.methodType === 'delete') {
    return ['// TODO: implement delete RPC use case', 'return { success: true };'];
  }
  if (method.methodType === 'get') {
    return [
      `// TODO: implement lookup RPC by ${method.lookupField ?? 'id'}`,
      `return { ${method.lookupField ?? 'id'}: request.${method.lookupField ?? 'id'} };`,
    ];
  }
  return ['// TODO: implement write RPC use case', 'return request;'];
}

export async function patchMicroservice(
  project: Project,
  naming: ModuleNaming,
  artifacts: ModuleArtifacts,
  paths: ResolvedPaths,
  method: MethodContextLike,
  entityFields: EntityFieldInfo[],
  lookupFieldInfo: EntityFieldInfo | undefined,
): Promise<string[]> {
  const controllerFile = ensureSourceFile(project, paths.controllerPath);
  const serviceFile = ensureSourceFile(project, paths.servicePath);
  const controllerClass = getPrimaryClass(controllerFile);
  const serviceClass = getPrimaryClass(serviceFile);
  const servicePropertyName = inferServicePropertyName(controllerClass, `${naming.camelName}Service`);
  const rpcName = method.rpcName!;
  const requestName = method.requestName ?? buildMicroserviceRequestName(rpcName);

  ensureNamedImport(controllerFile, '@nestjs/microservices', ['GrpcMethod', 'Payload']);

  const dtoFields = buildMicroserviceRequestFields(method, entityFields, lookupFieldInfo);
  const dtoNaming = {
    ...naming,
    entityName: artifacts.entityName,
    entityFile: artifacts.entityFile,
  };
  const requestDto = await ensureMicroRequestDto(paths.dtoDir, requestName, dtoFields);

  ensureNamedImport(
    controllerFile,
    relativeImport(paths.controllerPath, requestDto.filePath),
    [requestDto.className],
  );
  ensureNamedImport(
    serviceFile,
    relativeImport(paths.servicePath, requestDto.filePath),
    [requestDto.className],
  );

  controllerClass.addMethod({
    name: method.methodName,
    decorators: [{
      name: 'GrpcMethod',
      arguments: [`'${naming.pascalName}Service'`, `'${rpcName}'`],
    }],
    parameters: [{
      name: 'request',
      type: requestDto.className,
      decorators: [{
        name: 'Payload',
        arguments: [],
      }],
    }],
    statements: [`return this.${servicePropertyName}.${method.methodName}(request);`],
  });

  serviceClass.addMethod({
    name: method.methodName,
    parameters: [{ name: 'request', type: requestDto.className }],
    statements: buildMicroserviceServiceStatements(method),
  });

  if (paths.protoPath) {
    await patchProtoFile(paths.protoPath, dtoNaming, method, dtoFields);
  }

  return [requestDto.filePath];
}
