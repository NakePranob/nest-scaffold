import { TemplateEntry } from '../utils/template-renderer';
import { TemplateContext } from '../types';
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
    { template: 'create/base/.vscode/settings.json.hbs', output: '.vscode/settings.json', when: always },
    { template: 'create/base/.gitignore.hbs', output: '.gitignore', when: always },
    { template: 'create/base/.npmrc.hbs', output: '.npmrc', when: always },
    { template: 'create/base/.env.example.hbs', output: '.env.example', when: always },
    { template: 'create/base/README.md.hbs', output: 'README.md', when: always },

    // App source (shared)
    { template: 'create/base/src/main.ts.hbs', output: 'src/main.ts', when: always },
    { template: 'create/base/src/app.module.ts.hbs', output: 'src/app.module.ts', when: always },

    // Monolith app source
    { template: 'create/base/src/monolith/app.controller.ts.hbs', output: 'src/app.controller.ts', when: (c) => c.architecture === 'monolith' },
    { template: 'create/base/src/monolith/app.service.ts.hbs', output: 'src/app.service.ts', when: (c) => c.architecture === 'monolith' },
    { template: 'create/base/src/monolith/app.controller.spec.ts.hbs', output: 'src/app.controller.spec.ts', when: (c) => c.architecture === 'monolith' },

    // Microservice app source
    { template: 'create/base/src/microservice/health.controller.ts.hbs', output: 'src/health.controller.ts', when: (c) => c.architecture === 'microservice' },
    {
      template: 'create/base/src/microservice/grpc.options.ts.hbs',
      output: 'src/grpc/grpc.options.ts',
      when: (c) => c.architecture === 'microservice',
    },
    {
      template: 'create/base/src/microservice/proto.hbs',
      output: (ctx) => `src/proto/${ctx.projectName}.proto`,
      when: (c) => c.architecture === 'microservice',
    },

    // Monolith — HTTP response envelope
    {
      template: 'create/features/monolith/envelope/response.interceptor.ts.hbs',
      output: 'src/common/interceptors/response.interceptor.ts',
      when: (c) => c.responseEnvelope && c.architecture === 'monolith',
    },
    {
      template: 'create/features/monolith/envelope/all-exceptions.filter.ts.hbs',
      output: 'src/common/filters/all-exceptions.filter.ts',
      when: (c) => c.responseEnvelope && c.architecture === 'monolith',
    },
    {
      template: 'create/features/monolith/envelope/app-exception.ts.hbs',
      output: 'src/common/helpers/app-exception.ts',
      when: (c) => c.responseEnvelope && c.architecture === 'monolith',
    },
    {
      template: 'create/features/monolith/envelope/app-error-catalog.ts.hbs',
      output: 'src/common/errors/app-error-catalog.ts',
      when: (c) => c.responseEnvelope && c.architecture === 'monolith',
    },
    {
      template: 'create/features/monolith/envelope/validation.pipe.ts.hbs',
      output: 'src/common/pipes/validation.pipe.ts',
      when: (c) => c.responseEnvelope && c.architecture === 'monolith',
    },

    // Microservice — RPC common
    {
      template: 'create/features/microservice/rpc-common/rpc-error-catalog.ts.hbs',
      output: 'src/common/errors/rpc-error-catalog.ts',
      when: (c) => c.architecture === 'microservice',
    },
    {
      template: 'create/features/microservice/rpc-common/rpc-exception.ts.hbs',
      output: 'src/common/helpers/rpc-exception.ts',
      when: (c) => c.architecture === 'microservice',
    },
    {
      template: 'create/features/microservice/rpc-common/rpc-validation.pipe.ts.hbs',
      output: 'src/common/pipes/rpc-validation.pipe.ts',
      when: (c) => c.architecture === 'microservice',
    },
    {
      template: 'create/features/microservice/rpc-common/rpc-exception.filter.ts.hbs',
      output: 'src/common/filters/rpc-exception.filter.ts',
      when: (c) => c.architecture === 'microservice',
    },

    // Monolith — Pagination
    {
      template: 'create/features/monolith/pagination/pagination.dto.ts.hbs',
      output: 'src/common/dto/pagination.dto.ts',
      when: (c) => c.pagination,
    },
    {
      template: 'create/features/monolith/pagination/paginated-result.interface.ts.hbs',
      output: 'src/common/interfaces/paginated-result.interface.ts',
      when: (c) => c.pagination,
    },
    {
      template: 'create/features/monolith/pagination/pagination.helper.ts.hbs',
      output: 'src/common/helpers/pagination.helper.ts',
      when: (c) => c.pagination,
    },
    {
      template: 'create/features/monolith/pagination/base-filter.query.ts.hbs',
      output: 'src/common/helpers/base-filter.query.ts',
      when: (c) => c.pagination,
    },

    // Monolith — Swagger
    {
      template: 'create/features/monolith/swagger/setup-swagger.ts.hbs',
      output: 'src/common/swagger/setup-swagger.ts',
      when: (c) => c.swagger,
    },
    {
      template: 'create/features/monolith/swagger/api-success-response.decorator.ts.hbs',
      output: 'src/common/swagger/decorators/api-success-response.decorator.ts',
      when: (c) => c.swagger && c.responseEnvelope,
    },
    {
      template: 'create/features/monolith/swagger/api-error-responses.decorator.ts.hbs',
      output: 'src/common/swagger/decorators/api-error-responses.decorator.ts',
      when: (c) => c.swagger && c.responseEnvelope,
    },
    {
      template: 'create/features/monolith/swagger/success-response.dto.ts.hbs',
      output: 'src/common/swagger/dto/success-response.dto.ts',
      when: (c) => c.swagger && c.responseEnvelope,
    },
    {
      template: 'create/features/monolith/swagger/error-response.dto.ts.hbs',
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
      template: (c) =>
        c.architecture === 'microservice'
          ? 'create/features/auth/auth.controller.grpc.ts.hbs'
          : 'create/features/auth/auth.controller.ts.hbs',
      output: (ctx) => featurePath('auth', `auth.controller${ctx.isMicroservice ? '.grpc' : ''}.ts`)(ctx),
      when: (c) => c.auth,
    },
    {
      template: 'create/features/auth/auth.proto.hbs',
      output: featurePath('auth', 'proto', 'auth.proto'),
      when: (c) => c.auth && c.architecture === 'microservice',
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
      template: (c) =>
        c.architecture === 'microservice'
          ? 'create/features/users/users.controller.grpc.ts.hbs'
          : 'create/features/users/users.controller.ts.hbs',
      output: (ctx) => featurePath('users', `users.controller${ctx.isMicroservice ? '.grpc' : ''}.ts`)(ctx),
      when: (c) => c.usersModule,
    },
    {
      template: 'create/features/users/users.proto.hbs',
      output: featurePath('users', 'proto', 'users.proto'),
      when: (c) => c.usersModule && c.architecture === 'microservice',
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
      output: (ctx) => featurePath('users', ctx.isMicroservice ? 'domain' : '', 'entities', 'user.entity.ts')(ctx),
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
    {
      template: 'create/features/docs/architecture.md.hbs',
      output: 'docs/architect/architecture.md',
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
