#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliRoot = path.resolve(__dirname, '..');
const cliBin = path.join(cliRoot, 'bin', 'nest-scaffold.js');
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nest-scaffold-smoke-'));
const projectDir = path.join(workDir, 'smoke-app');

function run(command, cwd = workDir) {
  console.log(`> ${command}`);
  execSync(command, { cwd, stdio: 'inherit' });
}

try {
  if (!fs.existsSync(path.join(cliRoot, 'dist', 'index.js'))) {
    run('pnpm run build', cliRoot);
  }

  run(`node "${cliBin}" create smoke-app --defaults`);
  run('pnpm install --ignore-scripts', projectDir);
  run('pnpm exec nest build', projectDir);
  run(`node "${cliBin}" generate module orders --full`, projectDir);
  run('pnpm exec nest build', projectDir);
  run(`node "${cliBin}" generate service new3`, projectDir);
  run(`node "${cliBin}" generate controller new3`, projectDir);
  run('pnpm exec nest build', projectDir);

  console.log('\n✓ Smoke test passed\n');
} catch (error) {
  console.error('\n✗ Smoke test failed\n');
  process.exitCode = 1;
} finally {
  fs.rmSync(workDir, { recursive: true, force: true });
}
