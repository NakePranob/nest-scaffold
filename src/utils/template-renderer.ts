import path from 'node:path';
import nodeFs from 'node:fs';
import fs from 'fs-extra';
import Handlebars from 'handlebars';
import { ScaffoldConfig, TemplateContext, ModuleNaming } from '../types';
import { STACK_LABEL, STACK_VERSIONS } from '../stack-versions';
import { resolveModuleNaming } from './naming';
import { resolveModulePathContext } from './module-paths';

Handlebars.registerHelper('eq', (a, b) => a === b);
Handlebars.registerHelper('json', (value) => JSON.stringify(value));

export function getTemplatesRoot(): string {
  const candidates = [
    path.join(__dirname, '..', '..', 'templates'),
    path.join(__dirname, '..', '..', '..', 'templates'),
  ];

  const resolved = candidates.find((candidate) =>
    nodeFs.existsSync(path.join(candidate, 'create', 'base', 'package.json.hbs')),
  );
  if (!resolved) {
    throw new Error('Unable to locate templates directory');
  }

  return resolved;
}

export function buildTemplateContext(
  config: ScaffoldConfig,
  naming?: ModuleNaming,
  moduleVersion?: string,
  options?: { includeEntity?: boolean; hasService?: boolean; hasController?: boolean },
): TemplateContext {
  const moduleNaming = naming ?? resolveModuleNaming('example');
  const version =
    moduleVersion ??
    (config.moduleVersioning ? config.defaultModuleVersion : '');
  const pathContext = resolveModulePathContext(
    config.moduleVersioning,
    version,
  );

  const hasTypeorm =
    options?.includeEntity !== undefined ? options.includeEntity : config.typeorm;

  return {
    ...config,
    ...moduleNaming,
    ...pathContext,
    stack: { ...STACK_VERSIONS },
    stackLabel: STACK_LABEL,
    hasAuth: config.auth,
    hasSwagger: config.swagger,
    hasTypeorm,
    hasPagination: config.pagination,
    hasEnvelope: config.responseEnvelope,
    hasUsersModule: config.usersModule,
    hasService: options?.hasService ?? true,
    hasController: options?.hasController ?? true,
  };
}

export async function renderTemplateFile(
  templatePath: string,
  context: TemplateContext,
): Promise<string> {
  const source = await fs.readFile(templatePath, 'utf8');
  const template = Handlebars.compile(source, { noEscape: true });
  return template(context);
}

export async function writeRenderedTemplate(
  templateRelativePath: string,
  outputPath: string,
  context: TemplateContext,
): Promise<void> {
  const templatePath = path.join(getTemplatesRoot(), templateRelativePath);
  const content = await renderTemplateFile(templatePath, context);
  await fs.ensureDir(path.dirname(outputPath));
  await fs.writeFile(outputPath, content);
}

export interface TemplateEntry {
  template: string;
  output: string | ((context: TemplateContext) => string);
  when?: (config: ScaffoldConfig) => boolean;
}

export async function applyTemplateEntries(
  projectRoot: string,
  entries: TemplateEntry[],
  context: TemplateContext,
): Promise<void> {
  for (const entry of entries) {
    if (entry.when && !entry.when(context)) {
      continue;
    }

    const relativeOutput =
      typeof entry.output === 'function'
        ? entry.output(context)
        : entry.output;

    const outputPath = path.join(projectRoot, relativeOutput);
    await writeRenderedTemplate(entry.template, outputPath, context);
  }
}
