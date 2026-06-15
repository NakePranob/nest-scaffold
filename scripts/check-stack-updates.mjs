#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const manifestPath = path.join(rootDir, 'stack-packages.json');
const reportPath = path.join(rootDir, 'stack-update-report.md');

function parseVersion(value) {
  const match = value.trim().match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareVersions(a, b) {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) return 0;

  for (let i = 0; i < 3; i += 1) {
    if (left[i] > right[i]) return 1;
    if (left[i] < right[i]) return -1;
  }

  return 0;
}

function getLatestVersion(packageName) {
  return execSync(`npm view ${packageName} version`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function buildReport(outdated, checkedAt) {
  if (outdated.length === 0) {
    return `# Stack dependencies up to date\n\nChecked at: ${checkedAt}\n\nAll pinned template packages match or exceed the latest npm release.\n`;
  }

  const rows = outdated
    .map(
      (item) =>
        `| \`${item.name}\` | \`${item.key}\` | ${item.pinned} | **${item.latest}** |`,
    )
    .join('\n');

  return `# Stack dependencies need update

Checked at: ${checkedAt}

These packages in \`stack-packages.json\` have a newer version on npm.

| Package | stack key | Pinned | Latest |
|---------|-----------|--------|--------|
${rows}

## What to do

1. Update versions in [\`stack-packages.json\`](stack-packages.json)
2. Run \`pnpm test:smoke\`
3. Bump CLI version and publish

\`\`\`bash
pnpm test:smoke
pnpm publish --access public
\`\`\`
`;
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const checkedAt = new Date().toISOString();
const outdated = [];

for (const pkg of manifest.packages) {
  const latest = getLatestVersion(pkg.name);
  if (compareVersions(latest, pkg.version) > 0) {
    outdated.push({
      key: pkg.key,
      name: pkg.name,
      pinned: pkg.version,
      latest,
    });
  }
}

const report = buildReport(outdated, checkedAt);
fs.writeFileSync(reportPath, report);

console.log(report);

if (outdated.length > 0) {
  console.log(`\nFound ${outdated.length} outdated package(s).`);
  console.log(`Report written to ${reportPath}`);
  process.exit(2);
}

console.log('\nAll stack packages are up to date.');
process.exit(0);
