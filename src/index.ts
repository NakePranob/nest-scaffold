#!/usr/bin/env node
import { Command } from 'commander';
import pc from 'picocolors';
import { select, input } from '@inquirer/prompts';
import pkg from '../package.json';
import { createCommand } from './commands/create';
import {
  generateModuleCommand,
  generateServiceCommand,
  generateControllerCommand,
} from './commands/generate';
import { generateMethodCommand } from './commands/method';

async function promptName(type: string): Promise<string> {
  return input({
    message: `${type} name (e.g. orders, order):`,
    validate: (value) => (value.trim() ? true : 'Name is required'),
  });
}

const program = new Command();

program
  .name('nest-scaffold')
  .description('Scaffold NestJS modular backend projects')
  .version(pkg.version);

program
  .command('create')
  .alias('c')
  .argument('[project-name]', 'project directory name')
  .option('--defaults', 'use default options without wizard (for CI)')
  .option('--architecture <type>', 'default architecture: monolith or microservice')
  .description('Create a new NestJS project with interactive wizard')
  .action(async (
    projectName?: string,
    options?: { defaults?: boolean; architecture?: 'monolith' | 'microservice' },
  ) => {
    try {
      await createCommand(projectName, options);
    } catch (error) {
      console.error(pc.red(`\n✗ ${(error as Error).message}\n`));
      process.exit(1);
    }
  });

const generate = program
  .command('generate')
  .alias('g')
  .description('Generate code in an existing project')
  .action(async () => {
    try {
      const type = await select({
        message: 'What do you want to generate?',
        choices: [
          { name: 'Module (with full CRUD or minimal)', value: 'module' },
          { name: 'Service (standalone)', value: 'service' },
          { name: 'Controller (standalone)', value: 'controller' },
          { name: 'Method (add to existing module)', value: 'method' },
        ],
      });

      if (type === 'module') {
        const name = await promptName(type);
        await generateModuleCommand(name);
      } else if (type === 'service') {
        const name = await promptName(type);
        await generateServiceCommand(name);
      } else if (type === 'controller') {
        const name = await promptName(type);
        await generateControllerCommand(name);
      } else {
        await generateMethodCommand();
      }
    } catch (error) {
      console.error(pc.red(`\n✗ ${(error as Error).message}\n`));
      process.exit(1);
    }
  });

generate
  .command('module')
  .alias('m')
  .argument('[name]', 'module name (e.g. orders, order)')
  .option(
    '--module-version <version>',
    'target version folder (e.g. v1) — skips prompt when project uses versioning',
  )
  .option('--full', 'generate full CRUD with entity (controller + service + DTOs)')
  .description('Generate a feature module (alias: m)')
  .action(
    async (
      name: string | undefined,
      options?: { moduleVersion?: string; full?: boolean },
    ) => {
      try {
        await generateModuleCommand(name || await promptName('module'), options);
      } catch (error) {
        console.error(pc.red(`\n✗ ${(error as Error).message}\n`));
        process.exit(1);
      }
    },
  );

generate
  .command('service')
  .alias('s')
  .argument('[name]', 'service name (e.g. orders, order)')
  .option(
    '--module-version <version>',
    'target version folder (e.g. v1) — skips prompt when project uses versioning',
  )
  .description('Generate a standalone service (alias: s)')
  .action(
    async (name: string | undefined, options?: { moduleVersion?: string }) => {
      try {
        await generateServiceCommand(name || await promptName('service'), options);
      } catch (error) {
        console.error(pc.red(`\n✗ ${(error as Error).message}\n`));
        process.exit(1);
      }
    },
  );

generate
  .command('controller')
  .alias('c')
  .argument('[name]', 'controller name (e.g. orders, order)')
  .option(
    '--module-version <version>',
    'target version folder (e.g. v1) — skips prompt when project uses versioning',
  )
  .description('Generate a standalone controller (alias: c)')
  .action(
    async (name: string | undefined, options?: { moduleVersion?: string }) => {
      try {
        await generateControllerCommand(name || await promptName('controller'), options);
      } catch (error) {
        console.error(pc.red(`\n✗ ${(error as Error).message}\n`));
        process.exit(1);
      }
    },
  );

generate
  .command('method')
  .alias('me')
  .argument('[module-name]', 'module name (e.g. users, orders)')
  .argument('[method-name]', 'method name (e.g. findByEmail, create)')
  .option(
    '--module-version <version>',
    'target version folder (e.g. v1) — skips prompt when project uses versioning',
  )
  .option('--type <type>', 'method type: get, post, put, patch, delete')
  .option('--get-mode <mode>', 'for GET only: all or one; monolith routes and microservice RPCs adapt to this')
  .option('--field <name>', 'for GET one: lookup field such as email, slug, username')
  .description('Add a method to an existing module controller + service / gRPC handler (alias: me)')
  .action(
    async (
      moduleName: string | undefined,
      methodName: string | undefined,
      options?: {
        moduleVersion?: string;
        type?: 'get' | 'post' | 'put' | 'patch' | 'delete';
        getMode?: 'all' | 'one';
        field?: string;
      },
    ) => {
      try {
        await generateMethodCommand(moduleName, methodName, options);
      } catch (error) {
        console.error(pc.red(`\n✗ ${(error as Error).message}\n`));
        process.exit(1);
      }
    },
  );

program.parse();
