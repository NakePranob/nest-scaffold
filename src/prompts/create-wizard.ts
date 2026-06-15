import { confirm, input, select } from '@inquirer/prompts';
import { ScaffoldConfig } from '../types';
import { enforceDependencies } from '../utils/config';

export async function runCreateWizard(
  projectName: string,
): Promise<ScaffoldConfig> {
  console.log('\nConfigure your NestJS project:\n');

  const swagger = await confirm({
    message: 'Include Swagger API documentation?',
    default: true,
  });

  const docker = await confirm({
    message: 'Include Docker + PostgreSQL?',
    default: true,
  });

  let typeorm = false;
  if (docker) {
    typeorm = await confirm({
      message: 'Include TypeORM?',
      default: true,
    });
  }

  const responseEnvelope = await confirm({
    message: 'Include response envelope (interceptor + exception filter)?',
    default: true,
  });

  const pagination = await confirm({
    message: 'Include pagination helpers?',
    default: true,
  });

  let usersModule = false;
  let auth = false;

  if (typeorm) {
    usersModule = await confirm({
      message: 'Include example Users module (CRUD + QueryService)?',
      default: true,
    });

    if (usersModule) {
      auth = await confirm({
        message: 'Include Auth module (JWT)?',
        default: true,
      });
    }
  }

  const seeds =
    typeorm &&
    (await confirm({
      message: 'Include database seed script?',
      default: false,
    }));

  const e2e = await confirm({
    message: 'Include E2E test scaffold?',
    default: false,
  });

  const docs = await confirm({
    message: 'Include docs/architect/ documentation?',
    default: true,
  });

  const moduleVersioning = await confirm({
    message: 'Organize modules under a version folder (e.g. src/modules/v1)?',
    default: false,
  });

  const defaultModuleVersion = moduleVersioning ? 'v1' : '';
  const moduleVersions = moduleVersioning ? ['v1'] : [];

  const config = enforceDependencies({
    version: 1,
    projectName,
    moduleVersioning,
    defaultModuleVersion,
    moduleVersions,
    swagger,
    docker,
    typeorm,
    responseEnvelope,
    pagination,
    auth,
    usersModule,
    seeds,
    e2e,
    docs,
    httpAdapter: 'fastify',
    orm: 'typeorm',
    database: 'postgres',
  });

  console.log('\nSummary:');
  console.log(`  Project: ${config.projectName}`);
  console.log(`  Swagger: ${config.swagger ? 'yes' : 'no'}`);
  console.log(`  Docker: ${config.docker ? 'yes' : 'no'}`);
  console.log(`  TypeORM: ${config.typeorm ? 'yes' : 'no'}`);
  console.log(`  Response envelope: ${config.responseEnvelope ? 'yes' : 'no'}`);
  console.log(`  Pagination: ${config.pagination ? 'yes' : 'no'}`);
  console.log(`  Auth: ${config.auth ? 'yes' : 'no'}`);
  console.log(`  Users module: ${config.usersModule ? 'yes' : 'no'}`);
  console.log(`  Seeds: ${config.seeds ? 'yes' : 'no'}`);
  console.log(`  E2E: ${config.e2e ? 'yes' : 'no'}`);
  console.log(`  Docs: ${config.docs ? 'yes' : 'no'}`);
  console.log(
    `  Module versioning: ${config.moduleVersioning ? config.defaultModuleVersion : 'no'}`,
  );

  const proceed = await select({
    message: 'Create project with these settings?',
    choices: [
      { name: 'Yes, create project', value: true },
      { name: 'No, cancel', value: false },
    ],
  });

  if (!proceed) {
    throw new Error('Project creation cancelled');
  }

  return config;
}

export async function promptProjectName(
  initialName?: string,
): Promise<string> {
  const projectName = await input({
    message: 'Project name:',
    default: initialName,
    validate: (value) => {
      if (!value?.trim()) return 'Project name is required';
      if (!/^[a-z0-9-]+$/i.test(value)) {
        return 'Use letters, numbers, and hyphens only';
      }
      return true;
    },
  });

  return projectName.trim();
}
