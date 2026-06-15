import path from 'node:path';
import fs from 'fs-extra';
import Handlebars from 'handlebars';
import { ScaffoldConfig, TemplateContext, ModuleNaming } from '../types';
import { resolveModuleNaming } from './naming';

Handlebars.registerHelper('eq', (a, b) => a === b);
Handlebars.registerHelper('json', (value) => JSON.stringify(value));

export function getTemplatesRoot(): string {
  return path.join(__dirname, '..', '..', 'templates');
}

export function buildTemplateContext(
  config: ScaffoldConfig,
  naming?: ModuleNaming,
): TemplateContext {
  const moduleNaming = naming ?? resolveModuleNaming('example');

  return {
    ...config,
    ...moduleNaming,
    hasAuth: config.auth,
    hasSwagger: config.swagger,
    hasTypeorm: config.typeorm,
    hasPagination: config.pagination,
    hasEnvelope: config.responseEnvelope,
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
