import { TemplateEntry } from '../utils/template-renderer';
import { ScaffoldConfig, TemplateContext } from '../types';
import { moduleFeaturePath } from '../utils/module-paths';

const always = () => true;

function featurePath(
  feature: string,
  ...rest: string[]
): (ctx: TemplateContext) => string {
  return (ctx) =>
    moduleFeaturePath(ctx.moduleVersioning, ctx.moduleVersion, feature, ...rest);
}

export function getCreateTemplateEntries(): TemplateEntry[] {
  return [
    // Root config
    { template: 'create/base/package.json.hbs', output: 'package.json', when: always },
    { template: 'create/base/tsconfig.json.hbs', output: 'tsconfig.json', when: always },
    { template: 'create/base/tsconfig.build.json.hbs', output: 'tsconfig.build.json', when: always },
    { template: 'create/base/nest-cli.json.hbs', output: 'nest-cli.json', when: always },
    { template: 'create/base/eslint.config.mjs.hbs', output: 'eslint.config.mjs', when: always },
    { template: 'create/base/.prettierrc.hbs', output: '.prettierrc', when: always },
    { template: 'create/base/.gitignore.hbs', output: '.gitignore', when: always },
    { template: 'create/base/.npmrc.hbs', output: '.npmrc', when: always },
    { template: 'create/base/.env.example.hbs', output: '.env.example', when: always },
    { template: 'create/base/README.md.hbs', output: 'README.md', when: always },

    // App source
    { template: 'create/base/src/main.ts.hbs', output: 'src/main.ts', when: always },
    { template: 'create/base/src/app.module.ts.hbs', output: 'src/app.module.ts', when: always },
    { template: 'create/base/src/app.controller.ts.hbs', output: 'src/app.controller.ts', when: always },
    { template: 'create/base/src/app.service.ts.hbs', output: 'src/app.service.ts', when: always },
    { template: 'create/base/src/app.controller.spec.ts.hbs', output: 'src/app.controller.spec.ts', when: always },

    // Envelope
    {
      template: 'create/features/envelope/response.interceptor.ts.hbs',
      output: 'src/common/interceptors/response.interceptor.ts',
      when: (c) => c.responseEnvelope,
    },
    {
      template: 'create/features/envelope/all-exceptions.filter.ts.hbs',
      output: 'src/common/filters/all-exceptions.filter.ts',
      when: (c) => c.responseEnvelope,
    },
    {
      template: 'create/features/envelope/app-exception.ts.hbs',
      output: 'src/common/helpers/app-exception.ts',
      when: (c) => c.responseEnvelope,
    },
    {
      template: 'create/features/envelope/app-error-catalog.ts.hbs',
      output: 'src/common/errors/app-error-catalog.ts',
      when: (c) => c.responseEnvelope,
    },
    {
      template: 'create/features/envelope/validation.pipe.ts.hbs',
      output: 'src/common/pipes/validation.pipe.ts',
      when: (c) => c.responseEnvelope,
    },

    // Pagination
    {
      template: 'create/features/pagination/pagination.dto.ts.hbs',
      output: 'src/common/dto/pagination.dto.ts',
      when: (c) => c.pagination,
    },
    {
      template: 'create/features/pagination/paginated-result.interface.ts.hbs',
      output: 'src/common/interfaces/paginated-result.interface.ts',
      when: (c) => c.pagination,
    },
    {
      template: 'create/features/pagination/pagination.helper.ts.hbs',
      output: 'src/common/helpers/pagination.helper.ts',
      when: (c) => c.pagination,
    },

    // Swagger
    {
      template: 'create/features/swagger/setup-swagger.ts.hbs',
      output: 'src/common/swagger/setup-swagger.ts',
      when: (c) => c.swagger,
    },
    {
      template: 'create/features/swagger/api-success-response.decorator.ts.hbs',
      output: 'src/common/swagger/decorators/api-success-response.decorator.ts',
      when: (c) => c.swagger && c.responseEnvelope,
    },
    {
      template: 'create/features/swagger/api-error-responses.decorator.ts.hbs',
      output: 'src/common/swagger/decorators/api-error-responses.decorator.ts',
      when: (c) => c.swagger && c.responseEnvelope,
    },
    {
      template: 'create/features/swagger/success-response.dto.ts.hbs',
      output: 'src/common/swagger/dto/success-response.dto.ts',
      when: (c) => c.swagger && c.responseEnvelope,
    },
    {
      template: 'create/features/swagger/error-response.dto.ts.hbs',
      output: 'src/common/swagger/dto/error-response.dto.ts',
      when: (c) => c.swagger && c.responseEnvelope,
    },

    // Auth helpers
    {
      template: 'create/features/auth/jwt-auth.guard.ts.hbs',
      output: 'src/common/guards/jwt-auth.guard.ts',
      when: (c) => c.auth,
    },
    {
      template: 'create/features/auth/current-user.decorator.ts.hbs',
      output: 'src/common/decorators/current-user.decorator.ts',
      when: (c) => c.auth,
    },
    {
      template: 'create/features/auth/hash-password.ts.hbs',
      output: 'src/common/helpers/hash-password.ts',
      when: (c) => c.auth,
    },
    {
      template: 'create/features/auth/database-error.ts.hbs',
      output: 'src/common/helpers/database-error.ts',
      when: (c) => c.typeorm,
    },

    // Auth module
    {
      template: 'create/features/auth/auth.module.ts.hbs',
      output: featurePath('auth', 'auth.module.ts'),
      when: (c) => c.auth,
    },
    {
      template: 'create/features/auth/auth.controller.ts.hbs',
      output: featurePath('auth', 'auth.controller.ts'),
      when: (c) => c.auth,
    },
    {
      template: 'create/features/auth/auth.service.ts.hbs',
      output: featurePath('auth', 'auth.service.ts'),
      when: (c) => c.auth,
    },
    {
      template: 'create/features/auth/auth.service.spec.ts.hbs',
      output: featurePath('auth', 'auth.service.spec.ts'),
      when: (c) => c.auth,
    },
    {
      template: 'create/features/auth/jwt.strategy.ts.hbs',
      output: featurePath('auth', 'strategies', 'jwt.strategy.ts'),
      when: (c) => c.auth,
    },
    {
      template: 'create/features/auth/login.dto.ts.hbs',
      output: featurePath('auth', 'dto', 'login.dto.ts'),
      when: (c) => c.auth,
    },
    {
      template: 'create/features/auth/register.dto.ts.hbs',
      output: featurePath('auth', 'dto', 'register.dto.ts'),
      when: (c) => c.auth,
    },
    {
      template: 'create/features/auth/auth-error-catalog.ts.hbs',
      output: featurePath('auth', 'auth-error-catalog.ts'),
      when: (c) => c.auth && c.responseEnvelope,
    },
    {
      template: 'create/features/auth/auth-swagger.decorator.ts.hbs',
      output: featurePath('auth', 'swagger', 'auth-swagger.decorator.ts'),
      when: (c) => c.auth && c.swagger,
    },
    {
      template: 'create/features/auth/auth-response.dto.ts.hbs',
      output: featurePath('auth', 'swagger', 'auth-response.dto.ts'),
      when: (c) => c.auth && c.swagger,
    },

    // Users module
    {
      template: 'create/features/users/users.module.ts.hbs',
      output: featurePath('users', 'users.module.ts'),
      when: (c) => c.usersModule,
    },
    {
      template: 'create/features/users/users.controller.ts.hbs',
      output: featurePath('users', 'users.controller.ts'),
      when: (c) => c.usersModule,
    },
    {
      template: 'create/features/users/users.service.ts.hbs',
      output: featurePath('users', 'users.service.ts'),
      when: (c) => c.usersModule,
    },
    {
      template: 'create/features/users/users.service.spec.ts.hbs',
      output: featurePath('users', 'users.service.spec.ts'),
      when: (c) => c.usersModule,
    },
    {
      template: 'create/features/users/user.entity.ts.hbs',
      output: featurePath('users', 'entities', 'user.entity.ts'),
      when: (c) => c.usersModule,
    },
    {
      template: 'create/features/users/create-user.dto.ts.hbs',
      output: featurePath('users', 'dto', 'create-user.dto.ts'),
      when: (c) => c.usersModule,
    },
    {
      template: 'create/features/users/update-user.dto.ts.hbs',
      output: featurePath('users', 'dto', 'update-user.dto.ts'),
      when: (c) => c.usersModule,
    },
    {
      template: 'create/features/users/search-user.dto.ts.hbs',
      output: featurePath('users', 'dto', 'search-user.dto.ts'),
      when: (c) => c.usersModule && c.pagination,
    },
    {
      template: 'create/features/users/user-filter.query.ts.hbs',
      output: featurePath('users', 'queries', 'user-filter.query.ts'),
      when: (c) => c.usersModule && c.pagination,
    },
    {
      template: 'create/features/users/user-error-catalog.ts.hbs',
      output: featurePath('users', 'user-error-catalog.ts'),
      when: (c) => c.usersModule && c.responseEnvelope,
    },
    {
      template: 'create/features/users/user-swagger.decorator.ts.hbs',
      output: featurePath('users', 'swagger', 'user-swagger.decorator.ts'),
      when: (c) => c.usersModule && c.swagger,
    },
    {
      template: 'create/features/users/user-response.dto.ts.hbs',
      output: featurePath('users', 'swagger', 'user-response.dto.ts'),
      when: (c) => c.usersModule && c.swagger,
    },

    // Docker
    {
      template: 'create/features/docker/docker-compose.yml.hbs',
      output: 'docker-compose.yml',
      when: (c) => c.docker,
    },

    // Seeds
    {
      template: 'create/features/seeds/seed.ts.hbs',
      output: 'src/database/seed.ts',
      when: (c) => c.seeds,
    },
    {
      template: 'create/features/seeds/users.seed.ts.hbs',
      output: 'src/database/seeds/users.seed.ts',
      when: (c) => c.seeds && c.usersModule,
    },

    // E2E
    {
      template: 'create/features/e2e/jest-e2e.json.hbs',
      output: 'test/jest-e2e.json',
      when: (c) => c.e2e,
    },
    {
      template: 'create/features/e2e/app.e2e-spec.ts.hbs',
      output: 'test/app.e2e-spec.ts',
      when: (c) => c.e2e,
    },

    // Docs
    {
      template: 'create/features/docs/patterns.md.hbs',
      output: 'docs/architect/patterns.md',
      when: (c) => c.docs,
    },
    {
      template: 'create/features/docs/techstack.md.hbs',
      output: 'docs/architect/techstack.md',
      when: (c) => c.docs,
    },

    // Config file
    {
      template: 'create/base/nest-scaffold.config.json.hbs',
      output: 'nest-scaffold.config.json',
      when: always,
    },
  ];
}

export function getGenerateModuleEntries(
  config: ScaffoldConfig,
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

  const entries: TemplateEntry[] = [
    {
      template: 'generate/module/module.ts.hbs',
      output: (ctx) => modulePath(ctx, `${ctx.fileBase}.module.ts`),
    },
    {
      template: 'generate/module/service.ts.hbs',
      output: (ctx) => modulePath(ctx, `${ctx.fileBase}.service.ts`),
    },
    {
      template: 'generate/module/controller.ts.hbs',
      output: (ctx) => modulePath(ctx, `${ctx.fileBase}.controller.ts`),
    },
    {
      template: 'generate/module/service.spec.ts.hbs',
      output: (ctx) => modulePath(ctx, `${ctx.fileBase}.service.spec.ts`),
    },
    {
      template: 'generate/module/controller.spec.ts.hbs',
      output: (ctx) => modulePath(ctx, `${ctx.fileBase}.controller.spec.ts`),
    },
    {
      template: 'generate/module/create.dto.ts.hbs',
      output: (ctx) => modulePath(ctx, 'dto', `create-${ctx.entityFile}.dto.ts`),
    },
    {
      template: 'generate/module/update.dto.ts.hbs',
      output: (ctx) => modulePath(ctx, 'dto', `update-${ctx.entityFile}.dto.ts`),
    },
  ];

  if (config.typeorm) {
    entries.push({
      template: 'generate/module/entity.ts.hbs',
      output: (ctx) =>
        modulePath(ctx, 'entities', `${ctx.entityFile}.entity.ts`),
    });
  }

  if (config.pagination) {
    entries.push(
      {
        template: 'generate/module/search.dto.ts.hbs',
        output: (ctx) =>
          modulePath(ctx, 'dto', `search-${ctx.entityFile}.dto.ts`),
      },
      {
        template: 'generate/module/filter.query.ts.hbs',
        output: (ctx) =>
          modulePath(ctx, 'queries', `${ctx.entityFile}-filter.query.ts`),
      },
    );
  }

  if (config.responseEnvelope) {
    entries.push({
      template: 'generate/module/error-catalog.ts.hbs',
      output: (ctx) => modulePath(ctx, `${ctx.entityFile}-error-catalog.ts`),
    });
  }

  if (config.swagger) {
    entries.push(
      {
        template: 'generate/module/swagger.decorator.ts.hbs',
        output: (ctx) =>
          modulePath(ctx, 'swagger', `${ctx.entityFile}-swagger.decorator.ts`),
      },
      {
        template: 'generate/module/response.dto.ts.hbs',
        output: (ctx) =>
          modulePath(ctx, 'swagger', `${ctx.entityFile}-response.dto.ts`),
      },
    );
  }

  return entries;
}
