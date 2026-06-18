#!/usr/bin/env node
import path from 'node:path';
import {
  assertIncludes,
  cleanup,
  cliBin,
  createWorkDir,
  run,
  runExpectFailure,
} from './test-helpers/method-test-lib.mjs';

const workDir = createWorkDir();

try {
  const monoDir = path.join(workDir, 'mono-app');

  run(`node "${cliBin}" create "${monoDir}" --defaults`, workDir);

  const invalidFieldOutput = runExpectFailure(
    `node "${cliBin}" generate method users findByBadField --type get --get-mode one --field user-id`,
    monoDir,
  );
  assertIncludes(invalidFieldOutput, 'Field name must be a valid TypeScript identifier', 'invalid field validation');

  const invalidMethodOutput = runExpectFailure(
    `node "${cliBin}" generate method users bad-name --type post`,
    monoDir,
  );
  assertIncludes(invalidMethodOutput, 'Method name must be a valid TypeScript identifier', 'invalid method validation');

  console.log('\n✓ Method generator validation tests passed\n');
} catch (error) {
  console.error('\n✗ Method generator validation tests failed\n');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  cleanup(workDir);
}
