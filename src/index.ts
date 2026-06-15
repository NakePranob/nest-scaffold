#!/usr/bin/env node
import { Command } from 'commander';
import pc from 'picocolors';
import { createCommand } from './commands/create';
import { generateModuleCommand } from './commands/generate';

const program = new Command();

program
  .name('nest-scaffold')
  .description('Scaffold NestJS modular backend projects')
  .version('0.2.0');

program
  .command('create')
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
  .description('Generate code in an existing project');

generate
  .command('module')
  .argument('<name>', 'module name (e.g. orders, order)')
  .option(
    '--module-version <version>',
    'target version folder (e.g. v1) — skips prompt when project uses versioning',
  )
  .description('Generate a feature module')
  .action(async (name: string, options?: { moduleVersion?: string }) => {
    try {
      await generateModuleCommand(name, options);
    } catch (error) {
      console.error(pc.red(`\n✗ ${(error as Error).message}\n`));
      process.exit(1);
    }
  });

program.parse();
