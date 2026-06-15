#!/usr/bin/env node
import { Command } from 'commander';
import pc from 'picocolors';
import { createCommand } from './commands/create';
import { generateModuleCommand } from './commands/generate';

const program = new Command();

program
  .name('nest-scaffold')
  .description('Scaffold NestJS modular backend projects')
  .version('0.1.1');

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
  .description('Generate a feature module')
  .action(async (name: string) => {
    try {
      await generateModuleCommand(name);
    } catch (error) {
      console.error(pc.red(`\n✗ ${(error as Error).message}\n`));
      process.exit(1);
    }
  });

program.parse();
