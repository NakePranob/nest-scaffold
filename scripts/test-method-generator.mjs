#!/usr/bin/env node
import { run } from './test-helpers/method-test-lib.mjs';

try {
  run('node "./node_modules/typescript/bin/tsc" -p tsconfig.json', process.cwd());
  run('node scripts/test-method-utils.mjs', process.cwd());
  run('node scripts/test-method-generator-monolith.mjs', process.cwd());
  run('node scripts/test-method-generator-microservice.mjs', process.cwd());
  run('node scripts/test-method-generator-validation.mjs', process.cwd());
  run('node scripts/test-method-generator-versioning.mjs', process.cwd());

  console.log('\n✓ Method generator test suite passed\n');
} catch (error) {
  console.error('\n✗ Method generator test suite failed\n');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
