import path from 'node:path';
import fs from 'fs-extra';
import pc from 'picocolors';
import { input } from '@inquirer/prompts';
import {
  IndentationText,
  Project,
  QuoteKind,
} from 'ts-morph';
import { readConfig, writeConfig, resolveProjectConfig, ensureModuleVersion } from '../utils/config';
import { resolveModuleNaming } from '../utils/naming';
import { normalizeIdentifier } from '../utils/identifiers';
import { registerModuleGrpcProto } from '../utils/grpc-options-patcher';
import {
  promptGetMethodMode,
  promptLookupField,
  promptMethodType,
  promptModuleVersion,
} from '../prompts/generate-wizard';
import {
  generateControllerCommand,
  generateServiceCommand,
} from './generate';
import {
  buildPaths,
  discoverClassFields,
  discoverEntityFields,
  resolveModuleArtifacts,
} from '../utils/method-discovery';
import {
  buildDefaultMethodName,
  buildLookupFieldExamples,
  resolveMethodName,
} from '../utils/method-prompting';
import { patchMonolith } from '../utils/method-monolith-patcher';
import {
  buildMicroserviceRequestName,
  buildMicroserviceRpcNameFromMethodName,
  discoverExistingGrpcRpcNames,
  patchMicroservice,
} from '../utils/method-microservice';
import { getLookupCandidateFields, type MethodContext } from '../utils/method-shared';
import type {
  GetMethodMode,
  MethodType,
  ModuleNaming,
  ScaffoldConfig,
} from '../types';
import {
  loadPrettierFromProject,
  formatFilesWithPrettier as formatFiles,
} from '../utils/prettier-formatter';

function normalizeMethodName(value: string): string {
  return normalizeIdentifier(value, 'Method name');
}

function normalizeLookupField(value: string): string {
  return normalizeIdentifier(value, 'Field name');
}

function normalizeGetMode(value?: string): GetMethodMode | undefined {
  if (!value) {
    return undefined;
  }
  if (value !== 'all' && value !== 'one') {
    throw new Error('GET mode must be "all" or "one"');
  }
  return value;
}

function normalizeMethodType(value?: string): MethodType | undefined {
  if (!value) {
    return undefined;
  }
  if (!['get', 'post', 'put', 'patch', 'delete'].includes(value)) {
    throw new Error('Method type must be one of: get, post, put, patch, delete');
  }
  return value as MethodType;
}

async function ensureMethodScaffold(
  naming: ModuleNaming,
  config: ScaffoldConfig,
  paths: ReturnType<typeof buildPaths>,
  moduleVersion: string,
): Promise<void> {
  const hasController = await fs.pathExists(paths.controllerPath);
  const hasService = await fs.pathExists(paths.servicePath);

  if (hasController && hasService) {
    return;
  }

  const versionLabel = moduleVersion ? `${moduleVersion}/` : '';

  if (!hasService) {
    console.log(
      pc.cyan(`\nService missing for "${versionLabel}${naming.name}". Generating it first...\n`),
    );
    await generateServiceCommand(naming.name, {
      moduleVersion: config.architecture === 'microservice' ? undefined : moduleVersion,
    });
  }

  if (!hasController) {
    console.log(
      pc.cyan(`\nController missing for "${versionLabel}${naming.name}". Generating it first...\n`),
    );
    await generateControllerCommand(naming.name, {
      moduleVersion: config.architecture === 'microservice' ? undefined : moduleVersion,
    });
  }
}

async function formatFilesWithPrettier(
  projectRoot: string,
  filePaths: string[],
): Promise<void> {
  const prettier = loadPrettierFromProject(projectRoot);
  if (!prettier) {
    return;
  }
  await formatFiles(filePaths, prettier);
}

export async function generateMethodCommand(
  moduleNameArg?: string,
  methodNameArg?: string,
  options?: {
    moduleVersion?: string;
    type?: MethodType;
    getMode?: GetMethodMode;
    field?: string;
  },
): Promise<void> {
  const projectRoot = process.cwd();
  const moduleName = moduleNameArg?.trim() || await input({
    message: 'Module name (e.g. users, orders):',
    validate: (value) => value.trim() ? true : 'Module name is required',
  });
  const naming = resolveModuleNaming(moduleName);
  let config = await resolveProjectConfig(projectRoot);

  const moduleVersion = await promptModuleVersion(
    projectRoot,
    config,
    options?.moduleVersion,
  );

  config = await ensureModuleVersion(projectRoot, config, moduleVersion);

  const paths = buildPaths(projectRoot, config, moduleVersion, naming);
  if (!(await fs.pathExists(paths.moduleDir))) {
    throw new Error(`Module "${naming.name}" not found at ${paths.moduleDir}`);
  }
  await ensureMethodScaffold(naming, config, paths, moduleVersion);

  const methodType = await promptMethodType(normalizeMethodType(options?.type));
  const presetGetMode = normalizeGetMode(options?.getMode);
  if (presetGetMode && methodType !== 'get') {
    throw new Error('--get-mode can only be used with --type get');
  }

  const presetField = options?.field ? normalizeLookupField(options.field) : undefined;
  if (presetField && (methodType !== 'get' || presetGetMode !== 'one')) {
    throw new Error('--field can only be used with --type get --get-mode one');
  }

  const getMode = methodType === 'get'
    ? (presetGetMode ?? await promptGetMethodMode())
    : undefined;
  const artifacts = await resolveModuleArtifacts(paths, naming);
  const entityFields = await discoverEntityFields(artifacts.entityPath);
  const searchFields = await discoverClassFields(artifacts.searchDtoPath);
  const lookupField = methodType === 'get' && getMode === 'one'
    ? normalizeLookupField(
        await promptLookupField(
          getLookupCandidateFields(entityFields).map((field) => field.name),
          presetField,
          buildLookupFieldExamples(config.architecture, entityFields),
        ),
      )
    : undefined;
  const defaultMethodName = buildDefaultMethodName(
    methodType,
    naming,
    config.architecture,
    artifacts.entityName,
    getMode,
    lookupField,
  );

  const project = new Project({
    tsConfigFilePath: path.join(projectRoot, 'tsconfig.json'),
    skipAddingFilesFromTsConfig: true,
    manipulationSettings: {
      indentationText: IndentationText.TwoSpaces,
      quoteKind: QuoteKind.Single,
    },
  });

  const existingRpcNames = config.architecture === 'microservice'
    ? await discoverExistingGrpcRpcNames(paths.controllerPath, paths.protoPath)
    : undefined;

  const resolvedMethod = await resolveMethodName(
    [
      project.addSourceFileAtPath(paths.controllerPath),
      project.addSourceFileAtPath(paths.servicePath),
    ],
    methodNameArg ? normalizeMethodName(methodNameArg) : undefined,
    defaultMethodName,
    methodType,
    entityFields,
    searchFields,
    config.architecture,
    artifacts.entityName,
    naming.pascalName,
    getMode,
    existingRpcNames,
    lookupField,
  );
  const methodName = resolvedMethod.methodName;
  const resolvedLookupField = resolvedMethod.lookupField;

  const microserviceRpcName = config.architecture === 'microservice'
    ? buildMicroserviceRpcNameFromMethodName(methodName)
    : undefined;

  const method: MethodContext = {
    methodType,
    getMode,
    lookupField: resolvedLookupField,
    methodName,
    rpcName: microserviceRpcName,
    requestName: microserviceRpcName
      ? buildMicroserviceRequestName(microserviceRpcName)
      : undefined,
  };

  const versionLabel = moduleVersion ? `${moduleVersion}/` : '';
  console.log(pc.cyan(`\nAdding method "${methodName}" to "${versionLabel}${naming.name}"...\n`));

  let extraFormattedFiles: string[] = [];
  if (config.architecture === 'microservice') {
    extraFormattedFiles = await patchMicroservice(
      project,
      naming,
      artifacts,
      paths,
      method,
      entityFields,
      entityFields.find((field) => field.name === resolvedLookupField),
    );
    await registerModuleGrpcProto(projectRoot, config, moduleVersion ?? '', naming, { infraLayer: true });
  } else {
    extraFormattedFiles = await patchMonolith(
      project,
      config,
      naming,
      artifacts,
      paths,
      moduleVersion,
      method,
      entityFields,
    );
  }

  const sourceFiles = project.getSourceFiles();
  await Promise.all(sourceFiles.map(async (sourceFile) => {
    await sourceFile.save();
  }));
  await formatFilesWithPrettier(
    projectRoot,
    [...sourceFiles.map((sourceFile) => sourceFile.getFilePath()), ...extraFormattedFiles],
  );

  console.log(pc.green(`\n✓ Method "${methodName}" added successfully!\n`));
}
