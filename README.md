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

## Supported stack

Generated projects pin exact dependency versions tested with this CLI release.

| Stack | Version |
|-------|---------|
| NestJS | 11.x (pinned in template) |
| HTTP | Fastify |
| ORM | TypeORM + PostgreSQL |

To bump the stack, edit [`stack-packages.json`](stack-packages.json) and run `pnpm test:smoke` before publishing.

### Dependency notifications

| Mechanism | What it checks | How you get notified |
|-----------|----------------|----------------------|
| **Dependabot** (weekly) | CLI devDependencies in `package.json` | PR on GitHub |
| **check-stack-updates** (weekly + manual) | Pinned template stack in `stack-packages.json` | GitHub Issue labeled `stack-update` |

Run locally:

```bash
pnpm check:stack
```

Trigger on GitHub: **Actions → Check stack updates → Run workflow**

## Config

`nest-scaffold.config.json` is written on `create` and used by `generate`.

## Development

```bash
pnpm install
pnpm run build
pnpm test:smoke
node bin/nest-scaffold.js create test-app --defaults
```

## License

MIT
