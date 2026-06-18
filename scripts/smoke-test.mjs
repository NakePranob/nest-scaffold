#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliRoot = path.resolve(__dirname, '..');
const cliBin = path.join(cliRoot, 'bin', 'nest-scaffold.js');
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nest-scaffold-smoke-'));
const projectDir = path.join(workDir, 'smoke-app');
const skipInstall = process.env.NEST_SCAFFOLD_SKIP_INSTALL === '1';

function run(command, cwd = workDir, input) {
  console.log(`> ${command}`);
  const result = spawnSync(command, {
    cwd,
    shell: true,
    input,
    encoding: 'utf8',
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.status !== 0) {
    throw new Error(`Command failed with exit code ${result.status}: ${command}`);
  }
}

try {
  run('node scripts/test-method-generator.mjs', cliRoot);

  if (!fs.existsSync(path.join(cliRoot, 'dist', 'src', 'index.js'))) {
    run('pnpm run build', cliRoot);
  }

  run(`node "${cliBin}" create smoke-app --defaults`);
  for (const docFile of [
    'docs/architect/patterns.md',
    'docs/architect/techstack.md',
    'docs/architect/architecture.md',
  ]) {
    if (!fs.existsSync(path.join(projectDir, docFile))) {
      throw new Error(`Missing generated doc: ${docFile}`);
    }
  }

  if (skipInstall) {
    console.log('\n! Skipping pnpm install / nest build checks because NEST_SCAFFOLD_SKIP_INSTALL=1\n');
  } else {
    run('pnpm install --ignore-scripts', projectDir);
    run('pnpm exec nest build', projectDir);
  }

  run(`node "${cliBin}" generate module orders --full`, projectDir);
  if (!skipInstall) {
    run('pnpm exec nest build', projectDir);
  }
  run(`node "${cliBin}" generate service new3`, projectDir);
  run(`node "${cliBin}" generate controller new3`, projectDir);
  run(`node "${cliBin}" generate method users approve --type patch`, projectDir);
  run(`node "${cliBin}" generate method users createAdmin --type post`, projectDir);
  if (!skipInstall) {
    run('pnpm exec nest build', projectDir);
  }

  console.log('\n✓ Smoke test passed\n');
} catch (error) {
  console.error('\n✗ Smoke test failed\n');
  process.exitCode = 1;
} finally {
  fs.rmSync(workDir, { recursive: true, force: true });
}
