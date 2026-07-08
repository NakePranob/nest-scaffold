# @nakedev/nest-scaffold

A CLI that scaffolds a NestJS backend — REST monolith or gRPC microservice — with
opinionated, ready-to-run modules (auth, users, pagination, response envelope,
Docker + PostgreSQL, Swagger, tests), then keeps generating consistent
controllers/services/methods into that project as it grows.

You don't hand-wire modules into `AppModule`, write boilerplate DTOs, or decide
error-handling conventions each time — the CLI does that, and every module it
generates follows the same shape as the last one.

## Install

```bash
npm install -g @nakedev/nest-scaffold
```

## Quick start

```bash
nest-scaffold create my-api
cd my-api
cp .env.example .env
docker compose up -d   # if you kept Docker + PostgreSQL
pnpm install
pnpm run start:dev
```

Then grow the project without leaving the CLI:

```bash
nest-scaffold generate module orders --full
nest-scaffold g me orders findByStatus --type get --get-mode all
```

## Core concepts

**Architecture** is chosen once, at `create` time, and shapes everything the CLI
generates afterwards:

| | Monolith | Microservice |
|---|---|---|
| Transport | REST over Fastify | gRPC over `@nestjs/microservices` |
| Controllers | `@Controller()` + `@Get/@Post/...` | `@Controller()` + `@GrpcMethod()` |
| Contract | Swagger (optional) | `.proto` files (generated alongside code) |
| Errors | HTTP exception filter + envelope | `RpcException` + numeric gRPC status codes |
| Module layout | flat (`<feature>/*.ts`) | layered (`domain/` `application/` `infrastructure/`) |
| Health check | — | standard `grpc.health.v1.Health` service |

**Module versioning** is an independent, opt-in choice at `create` time: modules
live under `src/modules/<feature>/` by default, or under
`src/modules/v1/<feature>/`, `v2/...` if you turn it on. `generate` commands
accept `--module-version v2` to target (or create) a version folder; omit it and
the CLI asks interactively when the project has versioning.

**Config file** — every `create` writes `nest-scaffold.config.json` to the
project root. Every `generate` command reads it back (or auto-detects the same
information by inspecting `package.json`/`src/` if the file is missing) so it
always knows the project's architecture, versioning, and enabled features
without you repeating flags.

## Commands

### `create` — scaffold a new project

```bash
nest-scaffold create <project-name>
nest-scaffold create my-api                                       # interactive wizard
nest-scaffold create my-api --defaults --architecture monolith    # no prompts, CI-friendly
nest-scaffold create my-grpc --defaults --architecture microservice
```

| Option | Effect |
|---|---|
| `--defaults` | Skip the wizard, use sane defaults (see table below) — for CI/scripting |
| `--architecture <type>` | `monolith` or `microservice` (default: `monolith`) |

Without `--defaults`, an interactive wizard asks:

| Prompt | Generates |
|---|---|
| Swagger | `src/common/swagger/*`, `@nestjs/swagger` setup, response DTO decorators (monolith only) |
| Docker + PostgreSQL | `docker-compose.yml` wired to the TypeORM connection |
| Users module (CRUD) | `src/modules/users/*` — entity, DTOs, controller, service, tests (monolith only) |
| Auth (JWT) | `src/modules/auth/*` — login/register, `JwtStrategy` + guard (monolith only) |
| Database seeds | `src/database/seed.ts` (+ a users seed if Users module is enabled) |
| E2E scaffold | `test/app.e2e-spec.ts` + Jest e2e config |
| Architecture docs | `docs/architect/architecture.md`, `patterns.md`, `techstack.md` — describe the actual choices you made |
| Module versioning | organizes future modules under `src/modules/v1/` (monolith and microservice) |

Response envelope (interceptor + filter) is always included for a monolith and
never for a microservice. Pagination helpers and TypeORM/PostgreSQL are always
included regardless of architecture.

**What you get, next steps printed at the end:**

```
cd my-api
docker compose up -d      # only if Docker was selected
cp .env.example .env
pnpm install
pnpm run start:dev
```

A microservice project prints its gRPC bind address (`0.0.0.0:50051`); a
monolith with Swagger prints the docs URL (`http://localhost:3000/api`).

### `generate module` (alias `m`) — add a feature module

```bash
nest-scaffold generate module orders
nest-scaffold g m orders --full
nest-scaffold g m orders --full --module-version v2
```

| Option | Effect |
|---|---|
| `--full` | Full CRUD: controller + service + DTOs + entity (skips an interactive prompt for the same choice) |
| `--module-version <v>` | Target a specific version folder; skips the prompt on versioned projects |

Without `--full`, you get a minimal module (module class only, ready for you to
add a service/controller by hand or via the commands below). A `--full` module
registers itself in `AppModule` automatically, and — on microservice projects —
also creates and registers a `.proto` file for the new service.

### `generate service` / `generate controller` (aliases `s` / `c`)

```bash
nest-scaffold g s orders --module-version v2
nest-scaffold g c orders
```

Adds a standalone service or controller to a module that doesn't have one yet
(e.g. you generated a minimal module, or one piece is missing). If the sibling
piece already exists, the new file is wired to match it; if the module file
itself doesn't exist yet, it's created too. On microservice projects,
`generate controller` also creates the module's `.proto` file and registers its
gRPC package.

### `generate method` (alias `me`) — add one method to an existing module

```bash
nest-scaffold g me users findByEmail --type get --get-mode one --field email
nest-scaffold g me users findAllActive --type get --get-mode all
nest-scaffold g me users createAdmin --type post
nest-scaffold g me owner approve --type patch
nest-scaffold g me orders approve --type patch --module-version v2
```

This is the command you reach for constantly: it patches an *existing*
controller and service (or gRPC handler) in place, rather than scaffolding a
whole module.

| Option | Effect |
|---|---|
| `--type <get\|post\|put\|patch\|delete>` | HTTP verb (monolith) / RPC shape (microservice) |
| `--get-mode <all\|one>` | For `get` only — list endpoint vs. single-record lookup |
| `--field <name>` | For `get --get-mode one` — the lookup field (e.g. `email`, `slug`) |
| `--module-version <v>` | Target a specific version folder |

What it does under the hood:

- Patches both the controller and the service (or the gRPC controller + proto,
  on microservice projects) — never just one side.
- If the module is missing its controller or service, generates the missing
  piece first, then adds the method on top.
- Reuses existing DTO/request files when present; creates minimal stubs when
  they don't exist yet.
- Adds Swagger decorators to the new endpoint automatically, if Swagger exists
  in the project. Auth is left to you — copy the `@UseGuards(JwtAuthGuard)`
  pattern from the generated `users` module onto the endpoints you want to
  protect, so route-level auth stays an explicit decision.
- Derives gRPC RPC names and request DTO names from your method name, so a
  custom name like `approve` stays consistent across the controller, the
  service, and the `.proto` file.
- Never overwrites a method with the same name in place — it asks you to pick a
  different name instead.
- Leaves service logic and DTO fields as TODO-style stubs. It scaffolds the
  shape of the method; it does not invent your domain logic.

### `generate` with no subcommand

```bash
nest-scaffold generate
nest-scaffold g
```

Runs an interactive picker (module / service / controller / method) for anyone
who doesn't want to remember subcommand names.

## Project structure

**Monolith:**

```text
src/
├── common/                      # cross-cutting: guards, filters, pipes, swagger, errors
├── modules/
│   ├── users/                   # if Users module enabled
│   │   ├── dto/  entities/  queries/
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── users.module.ts
│   └── auth/                    # if Auth enabled
│       ├── dto/  strategies/
│       ├── auth.controller.ts
│       ├── auth.service.ts
│       └── auth.module.ts
├── app.controller.ts
├── app.service.ts
├── app.module.ts
└── main.ts
```

**Microservice** — generated modules use a small layered structure instead of a
flat one, so gRPC adapters stay separate from business logic:

```text
src/
├── common/                      # rpc error catalog, rpc exception filter
├── grpc/grpc.options.ts         # registered proto packages + paths
├── proto/{{projectName}}.proto  # project-level proto, plus health.proto
├── health.controller.ts         # standard grpc.health.v1.Health service
├── modules/
│   └── orders/                  # generate module orders --full
│       ├── domain/
│       │   ├── entities/orders.entity.ts
│       │   └── orders-error-catalog.ts
│       ├── application/
│       │   └── orders.service.ts
│       ├── infrastructure/
│       │   ├── orders.controller.grpc.ts
│       │   └── proto/orders.proto
│       └── orders.module.ts
├── app.module.ts
└── main.ts
```

With module versioning enabled, `modules/` becomes `modules/v1/`, `modules/v2/`,
etc., and microservice proto packages are namespaced to match
(`package orders.v1;`).

## Supported stack

Generated projects pin exact dependency versions tested with this CLI release:

| Stack | Version |
|-------|---------|
| NestJS | 11.x |
| HTTP | Fastify |
| ORM | TypeORM + PostgreSQL |
| gRPC (microservice) | `@nestjs/microservices` + `@grpc/grpc-js` |

## Config

`nest-scaffold.config.json` is written by `create` and read by every `generate`
command — it's how the CLI remembers your architecture, versioning, and enabled
features without asking again or re-detecting from scratch. If the file is
missing (e.g. a project scaffolded before this file existed), the CLI
auto-detects the same information from `package.json` and the `src/` layout.

## License

MIT
