#!/usr/bin/env node
import { Command } from 'commander';
import pc from 'picocolors';
import { select, input } from '@inquirer/prompts';
import { createCommand } from './commands/create';
import {
  generateModuleCommand,
  generateServiceCommand,
  generateControllerCommand,
} from './commands/generate';

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
  .version('0.2.0');

program
  .command('create')
  .alias('c')
  .argument('[project-name]', 'project directory name')
  .option('--defaults', 'use default options without wizard (for CI)')
  .description('Create a new NestJS project with interactive wizard')
  .action(async (projectName?: string, options?: { defaults?: boolean }) => {
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
        ],
      });

      const name = await promptName(type);

      if (type === 'module') {
        await generateModuleCommand(name);
      } else if (type === 'service') {
        await generateServiceCommand(name);
      } else {
        await generateControllerCommand(name);
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

program.parse();
