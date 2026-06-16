import { confirm, input, select, Separator } from '@inquirer/prompts';
import { Architecture, ScaffoldConfig } from '../types';
import { enforceDependencies } from '../utils/config';

interface WizardStep {
  key: string;
  message: string;
  default: boolean;
  when: (answers: Record<string, boolean>, architecture: Architecture) => boolean;
}

const ARCHITECTURE_CHOICES: { name: string; value: Architecture; description: string }[] = [
  {
    name: 'Monolith (HTTP REST)',
    value: 'monolith',
    description: 'Traditional HTTP server with Fastify',
  },
  {
    name: 'Microservice (gRPC)',
    value: 'microservice',
    description: 'gRPC microservice with @nestjs/microservices',
  },
];

const STEPS: WizardStep[] = [
  {
    key: 'swagger',
    message: 'Include Swagger API documentation?',
    default: true,
    when: (_, arch) => arch === 'monolith',
  },
  {
    key: 'usersModule',
    message: 'Include example Users module (CRUD)?',
    default: true,
    when: (_, arch) => arch === 'monolith',
  },
  {
    key: 'auth',
    message: 'Include Auth module (JWT)?',
    default: false,
    when: (a, arch) => a.usersModule && arch === 'monolith',
  },
  {
    key: 'seeds',
    message: 'Include database seed script?',
    default: false,
    when: (a) => a.usersModule,
  },
  {
    key: 'moduleVersioning',
    message: 'Organize modules under version folder (e.g. v1)?',
    default: false,
    when: () => true,
  },
  {
    key: 'e2e',
    message: 'Include E2E test scaffold?',
    default: false,
    when: () => true,
  },
  {
    key: 'docs',
    message: 'Include architecture docs?',
    default: true,
    when: () => true,
  },
  {
    key: 'docker',
    message: 'Include Docker + PostgreSQL?',
    default: true,
    when: () => true,
  },
];

export async function runCreateWizard(
  projectName: string,
): Promise<ScaffoldConfig> {
  console.log('\nConfigure your NestJS project:\n');

  const architecture = await select<Architecture>({
    message: 'Architecture type:',
    choices: ARCHITECTURE_CHOICES,
    default: 'monolith',
  });

  console.log(`  Selected: ${architecture === 'monolith' ? 'Monolith (HTTP REST)' : 'Microservice (gRPC)'}\n`);

  const answers: Record<string, boolean> = {};
  for (const step of STEPS) {
    if (!step.when(answers, architecture)) continue;
    answers[step.key] = await confirm({
      message: step.message,
      default: step.default,
    });
  }

  const config = enforceDependencies({
    version: 1,
    projectName,
    architecture,
    moduleVersioning: answers.moduleVersioning,
    defaultModuleVersion: answers.moduleVersioning ? 'v1' : '',
    moduleVersions: answers.moduleVersioning ? ['v1'] : [],
    swagger: answers.swagger,
    docker: answers.docker,
    typeorm: true,
    responseEnvelope: true,
    pagination: true,
    auth: answers.auth ?? false,
    usersModule: answers.usersModule,
    seeds: answers.seeds ?? false,
    e2e: answers.e2e,
    docs: answers.docs,
    httpAdapter: 'fastify',
    orm: 'typeorm',
    database: 'postgres',
  });

  const archLabel = config.architecture === 'monolith' ? 'Monolith (HTTP)' : 'Microservice (gRPC)';

  console.log('\nSummary:');
  console.log(`  Architecture: ${archLabel}`);
  if (config.architecture === 'monolith') {
    console.log(`  Swagger: ${config.swagger ? 'yes' : 'no'}`);
  }
  if (config.architecture === 'monolith') {
    console.log(`  Users module: ${config.usersModule ? 'yes' : 'no'}`);
    console.log(`  Auth: ${config.auth ? 'yes' : 'no'}`);
    console.log(`  Seeds: ${config.seeds ? 'yes' : 'no'}`);
  }
  console.log(`  Version folder: ${config.moduleVersioning ? config.defaultModuleVersion : 'no'}`);
  console.log(`  E2E tests: ${config.e2e ? 'yes' : 'no'}`);
  console.log(`  Architecture docs: ${config.docs ? 'yes' : 'no'}`);
  console.log(`  Docker: ${config.docker ? 'yes' : 'no'}`);

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
