#!/usr/bin/env node
import path from 'node:path';
import {
  assertIncludes,
  cleanup,
  cliBin,
  createWorkDir,
  read,
  readJson,
  run,
  writeJson,
} from './test-helpers/method-test-lib.mjs';

const workDir = createWorkDir();

try {
  const monoDir = path.join(workDir, 'versioned-app');
  const configPath = path.join(monoDir, 'nest-scaffold.config.json');

  run(`node "${cliBin}" create "${monoDir}" --defaults`, workDir);
  const config = readJson(configPath);
  config.moduleVersioning = true;
  config.moduleVersions = ['v1'];
  config.defaultModuleVersion = 'v1';
  writeJson(configPath, config);

  run(`node "${cliBin}" generate module orders --full --module-version v2`, monoDir);
  run(`node "${cliBin}" generate method orders approve --type patch --module-version v2`, monoDir);

  const versionedController = read(path.join(monoDir, 'src/modules/v2/orders/orders.controller.ts'));
  const updatedConfig = readJson(configPath);

  assertIncludes(versionedController, 'approve(', 'versioned module method name');
  assertIncludes(versionedController, '@Param(\'id\') id: string', 'versioned module id param');
  assertIncludes(JSON.stringify(updatedConfig.moduleVersions), 'v2', 'versioned config auto-update');

  console.log('\n✓ Method generator versioning tests passed\n');
} catch (error) {
  console.error('\n✗ Method generator versioning tests failed\n');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  cleanup(workDir);
}
