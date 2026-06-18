import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const cliRoot = path.resolve(__dirname, '../..');
export const cliBin = path.join(cliRoot, 'bin', 'nest-scaffold.js');

export function createWorkDir(prefix = 'nest-scaffold-method-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function run(command, cwd, input) {
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

  return `${result.stdout ?? ''}${result.stderr ?? ''}`;
}

export function runExpectFailure(command, cwd, input) {
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

  if (result.status === 0) {
    throw new Error(`Expected command to fail: ${command}`);
  }

  return `${result.stdout ?? ''}${result.stderr ?? ''}`;
}

export function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

export function write(filePath, content) {
  fs.writeFileSync(filePath, content);
}

export function readJson(filePath) {
  return JSON.parse(read(filePath));
}

export function writeJson(filePath, value) {
  write(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function assertIncludes(haystack, needle, label) {
  if (!haystack.includes(needle)) {
    throw new Error(`Missing expected content for ${label}: ${needle}`);
  }
}

export function assertNotIncludes(haystack, needle, label) {
  if (haystack.includes(needle)) {
    throw new Error(`Unexpected content for ${label}: ${needle}`);
  }
}

export function assertMatchCount(haystack, pattern, expected, label) {
  const matches = haystack.match(pattern);
  const count = matches?.length ?? 0;
  if (count !== expected) {
    throw new Error(`Unexpected match count for ${label}: expected ${expected}, received ${count}`);
  }
}

export function cleanup(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}
