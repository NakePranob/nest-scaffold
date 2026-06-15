# @nakedev/nest-scaffold

CLI to scaffold NestJS modular backend projects with selectable features.

## Install

```bash
npm install -g @nakedev/nest-scaffold
```

## Usage

### Create a new project

```bash
nest-scaffold create my-api
```

Interactive wizard lets you choose:

- Swagger
- Docker + PostgreSQL + TypeORM
- Response envelope (interceptor + filter)
- Pagination helpers
- Auth (JWT) + Users example module
- Database seeds
- E2E scaffold
- Architecture docs

### Generate a module

```bash
cd my-api
nest-scaffold generate module orders
```

Reads `nest-scaffold.config.json` (or auto-detects from the project).

## Config

`nest-scaffold.config.json` is written on `create` and used by `generate`.

## Development

```bash
pnpm install
pnpm run build
node bin/nest-scaffold.js create test-app
```

## License

MIT
