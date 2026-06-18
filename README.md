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
nest-scaffold create my-grpc --defaults --architecture microservice
nest-scaffold create my-api --defaults --architecture monolith
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
- **Module versioning** — place modules under `src/modules/v1/` (optional)

### Generate a module

```bash
cd my-api
nest-scaffold generate module orders
```

Reads `nest-scaffold.config.json` (or auto-detects from the project).

When the project uses versioned modules (`src/modules/v1/`, `v2/`, …), the CLI asks which version folder to use (or lets you create a new one).

### Add a method to an existing module

```bash
nest-scaffold g me users findByEmail --type get --get-mode one --field email
nest-scaffold g me users findAllActive --type get --get-mode all
nest-scaffold g me users createAdmin --type post
nest-scaffold g me owner approve --type patch
nest-scaffold g me orders approve --type patch --module-version v2
```

The method generator:

- patches both controller and service
- supports `get`, `post`, `put`, `patch`, `delete`
- prompts `GET` users to choose `all` or `one`
- keeps the same CLI surface for monolith and microservice projects
- reuses existing DTO/request files when present and creates minimal stubs when missing
- uses different controller/RPC behavior for monolith vs microservice projects
- adds monolith Swagger decorators and auth guards to new controller methods when those features exist in the project
- maps microservice RPC names from the final method name, so custom names stay consistent in both controller and `.proto`

**Examples by project type**

```bash
# Monolith: GET one with lookup field
nest-scaffold g me users findByEmail --type get --get-mode one --field email

# Monolith: GET all
nest-scaffold g me users findAllActive --type get --get-mode all

# Microservice: RPC-style write action
nest-scaffold g me owner approve --type patch

# Versioned modules
nest-scaffold g me orders approve --type patch --module-version v2
```

**How to invoke the CLI**

```bash
# Inside the nest-scaffold repo itself
node bin/nest-scaffold.js g me users findByEmail --type get --get-mode one --field email

# Inside a sibling/generated project when this repo sits next to it
node ../nest-scaffold/bin/nest-scaffold.js g me users findByEmail --type get --get-mode one --field email

# When installed globally
nest-scaffold g me users findByEmail --type get --get-mode one --field email
```

If you are already inside the `nest-scaffold` repo, do not use `node ./nest-scaffold/bin/nest-scaffold.js ...` because that points to a nested path that does not exist.

**Behavior contract**

- `generate method` patches the module controller and service for both architectures.
- On monolith projects it may also create or extend Swagger helper files and response DTOs.
- On microservice projects it may also create request DTOs and patch the module `.proto`.
- If the module is missing either controller or service, the CLI generates the missing piece first, then adds the method.
- The generator intentionally leaves placeholder service logic and DTO field bodies as TODO-style scaffolding. It does not invent domain behavior.
- Duplicate method names are never overwritten in place. The CLI asks for a new method name and keeps controller/RPC naming aligned with that choice.

### Module layout

**Flat (default):**

```
src/modules/auth/
src/modules/users/
```

**Versioned (optional at create):**

```
src/modules/v1/auth/
src/modules/v1/users/
src/modules/v2/orders/   # generate can target v2 or create new version folders
```

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
pnpm run verify
pnpm run test:method
NEST_SCAFFOLD_SKIP_INSTALL=1 pnpm test:smoke
pnpm test:smoke
node bin/nest-scaffold.js create test-app --defaults
node bin/nest-scaffold.js g me users findByEmail --type get --get-mode one --field email
```

Release/publish notes:

- `bin/nest-scaffold.js` is a thin launcher that loads `dist/src/index.js`.
- `prepublishOnly` runs `pnpm run build`, so the published package always ships compiled CLI output.

## License

MIT
