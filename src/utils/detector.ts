import path from 'node:path';
import fs from 'fs-extra';
import { ScaffoldConfig } from '../types';

export async function detectConfig(
  projectRoot: string,
): Promise<ScaffoldConfig> {
  const src = path.join(projectRoot, 'src');
  const hasSwagger = await fs.pathExists(
    path.join(src, 'common', 'swagger', 'setup-swagger.ts'),
  );
  const hasEnvelope = await fs.pathExists(
    path.join(src, 'common', 'interceptors', 'response.interceptor.ts'),
  );
  const hasPagination = await fs.pathExists(
    path.join(src, 'common', 'dto', 'pagination.dto.ts'),
  );
  const hasAuth = await fs.pathExists(
    path.join(src, 'modules', 'auth', 'auth.module.ts'),
  );
  const hasUsers = await fs.pathExists(
    path.join(src, 'modules', 'users', 'users.module.ts'),
  );
  const hasTypeorm = await fs.pathExists(path.join(src, 'app.module.ts'))
    ? (await fs.readFile(path.join(src, 'app.module.ts'), 'utf8')).includes(
        'TypeOrmModule',
      )
    : false;
  const hasDocker = await fs.pathExists(
    path.join(projectRoot, 'docker-compose.yml'),
  );
  const hasSeeds = await fs.pathExists(
    path.join(src, 'database', 'seed.ts'),
  );
  const hasE2e = await fs.pathExists(
    path.join(projectRoot, 'test', 'jest-e2e.json'),
  );
  const hasDocs = await fs.pathExists(
    path.join(projectRoot, 'docs', 'architect', 'patterns.md'),
  );

  const packageJson = (await fs.readJson(
    path.join(projectRoot, 'package.json'),
  )) as { name?: string };

  return {
    version: 1,
    projectName: packageJson.name ?? path.basename(projectRoot),
    swagger: hasSwagger,
    docker: hasDocker,
    typeorm: hasTypeorm,
    responseEnvelope: hasEnvelope,
    pagination: hasPagination,
    auth: hasAuth,
    usersModule: hasUsers,
    seeds: hasSeeds,
    e2e: hasE2e,
    docs: hasDocs,
    httpAdapter: 'fastify',
    orm: 'typeorm',
    database: 'postgres',
  };
}
