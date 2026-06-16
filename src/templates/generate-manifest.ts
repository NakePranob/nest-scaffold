import { TemplateEntry } from '../utils/template-renderer';
import { ScaffoldConfig, TemplateContext } from '../types';
import { moduleFeaturePath } from '../utils/module-paths';

export function getGenerateModuleEntries(
  config: ScaffoldConfig,
  isFull?: boolean,
  includeEntity?: boolean,
): TemplateEntry[] {
  const modulePath = (
    ctx: TemplateContext,
    ...rest: string[]
  ): string =>
    moduleFeaturePath(
      ctx.moduleVersioning,
      ctx.moduleVersion,
      ctx.name,
      ...rest,
    );

  const hasTypeorm = includeEntity ?? config.typeorm;
  const isMicroservice = config.architecture === 'microservice';

  const entries: TemplateEntry[] = [
    {
      template: 'generate/module/shared/module.ts.hbs',
      output: (ctx) => modulePath(ctx, `${ctx.fileBase}.module.ts`),
    },
  ];

  if (isFull) {
    entries.push(
      {
        template: isMicroservice
          ? 'generate/module/microservice/service.ts.hbs'
          : 'generate/module/monolith/service.ts.hbs',
        output: (ctx) => isMicroservice
          ? modulePath(ctx, 'application', `${ctx.fileBase}.service.ts`)
          : modulePath(ctx, `${ctx.fileBase}.service.ts`),
      },
      {
        template: isMicroservice
          ? 'generate/module/microservice/controller.ts.hbs'
          : 'generate/module/monolith/controller.ts.hbs',
        output: (ctx) => isMicroservice
          ? modulePath(ctx, 'infrastructure', `${ctx.fileBase}.controller.grpc.ts`)
          : modulePath(ctx, `${ctx.fileBase}.controller.ts`),
      },
      {
        template: isMicroservice
          ? 'generate/module/microservice/service.spec.ts.hbs'
          : 'generate/module/monolith/service.spec.ts.hbs',
        output: (ctx) => isMicroservice
          ? modulePath(ctx, 'application', `${ctx.fileBase}.service.spec.ts`)
          : modulePath(ctx, `${ctx.fileBase}.service.spec.ts`),
      },
      ...(isMicroservice
        ? []
        : [{
            template: 'generate/module/monolith/controller.spec.ts.hbs',
            output: (ctx: TemplateContext) => modulePath(ctx, `${ctx.fileBase}.controller.spec.ts`),
          }]
      ),
      ...(isMicroservice
        ? [{
            template: 'generate/module/microservice/get-request.dto.ts.hbs',
            output: (ctx: TemplateContext) => modulePath(ctx, 'dto', `get-${ctx.entityFile}-request.dto.ts`),
          }]
        : [
            {
              template: 'generate/module/monolith/create.dto.ts.hbs',
              output: (ctx: TemplateContext) => modulePath(ctx, 'dto', `create-${ctx.entityFile}.dto.ts`),
            },
            {
              template: 'generate/module/monolith/update.dto.ts.hbs',
              output: (ctx: TemplateContext) => modulePath(ctx, 'dto', `update-${ctx.entityFile}.dto.ts`),
            },
          ]
      ),
    );

    if (isMicroservice) {
      entries.push({
        template: 'generate/module/microservice/proto.hbs',
        output: (ctx) => modulePath(ctx, 'infrastructure', 'proto', `${ctx.fileBase}.proto`),
      });
    }

    if (config.pagination && !isMicroservice) {
      entries.push(
        {
          template: 'generate/module/monolith/search.dto.ts.hbs',
          output: (ctx) =>
            modulePath(ctx, 'dto', `search-${ctx.entityFile}.dto.ts`),
        },
        {
          template: 'generate/module/monolith/filter.query.ts.hbs',
          output: (ctx) =>
            modulePath(ctx, 'queries', `${ctx.entityFile}-filter.query.ts`),
        },
      );
    }

    if (config.responseEnvelope || isMicroservice) {
      entries.push({
        template: isMicroservice
          ? 'generate/module/microservice/error-catalog.ts.hbs'
          : 'generate/module/monolith/error-catalog.ts.hbs',
        output: (ctx) => isMicroservice
          ? modulePath(ctx, 'domain', `${ctx.entityFile}-error-catalog.ts`)
          : modulePath(ctx, `${ctx.entityFile}-error-catalog.ts`),
      });
    }

    if (config.swagger) {
      entries.push(
        {
          template: 'generate/module/monolith/swagger.decorator.ts.hbs',
          output: (ctx) =>
            modulePath(ctx, 'swagger', `${ctx.entityFile}-swagger.decorator.ts`),
        },
        {
          template: 'generate/module/monolith/response.dto.ts.hbs',
          output: (ctx) =>
            modulePath(ctx, 'swagger', `${ctx.entityFile}-response.dto.ts`),
        },
      );
    }
  }

  if (hasTypeorm) {
    entries.push({
      template: isMicroservice
        ? 'generate/module/microservice/entity.ts.hbs'
        : 'generate/module/monolith/entity.ts.hbs',
      output: (ctx) => isMicroservice
        ? modulePath(ctx, 'domain', 'entities', `${ctx.entityFile}.entity.ts`)
        : modulePath(ctx, 'entities', `${ctx.entityFile}.entity.ts`),
    });
  }

  return entries;
}
