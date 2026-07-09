import path from 'node:path';
import fs from 'fs-extra';
import pc from 'picocolors';
import cliPkg from '../../package.json';
import stackManifest from '../../stack-packages.json';
import { loadPrettierFromProject, formatFileWithPrettier } from '../utils/prettier-formatter';

const DEPENDENCY_SECTIONS = ['dependencies', 'devDependencies'] as const;

function parseVersion(value: string): [number, number, number] | null {
  const match = value.trim().match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function isNewer(candidate: string, current: string): boolean {
  const left = parseVersion(candidate);
  const right = parseVersion(current);
  if (!left || !right) return false;

  for (let i = 0; i < 3; i += 1) {
    if (left[i] > right[i]) return true;
    if (left[i] < right[i]) return false;
  }

  return false;
}

export async function upgradeCommand(): Promise<void> {
  const projectRoot = process.cwd();
  const packageJsonPath = path.join(projectRoot, 'package.json');

  if (!(await fs.pathExists(packageJsonPath))) {
    throw new Error(
      'No package.json found in the current directory. Run this inside a nest-scaffold project.',
    );
  }

  const packageJson = await fs.readJson(packageJsonPath);
  const updates: { name: string; from: string; to: string }[] = [];

  for (const pkg of stackManifest.packages) {
    for (const section of DEPENDENCY_SECTIONS) {
      const current = packageJson[section]?.[pkg.name];
      if (typeof current !== 'string') continue;
      if (isNewer(pkg.version, current)) {
        updates.push({ name: pkg.name, from: current, to: pkg.version });
        packageJson[section][pkg.name] = pkg.version;
      }
    }
  }

  const currentCliPin = packageJson.devDependencies?.['@nakedev/nest-scaffold'];
  if (typeof currentCliPin === 'string' && isNewer(cliPkg.version, currentCliPin)) {
    updates.push({
      name: '@nakedev/nest-scaffold',
      from: currentCliPin,
      to: cliPkg.version,
    });
    packageJson.devDependencies['@nakedev/nest-scaffold'] = cliPkg.version;
  }

  if (updates.length === 0) {
    console.log(pc.green('\n✓ Already up to date with the current stack.\n'));
    return;
  }

  await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });

  const prettier = loadPrettierFromProject(projectRoot);
  if (prettier) {
    await formatFileWithPrettier(packageJsonPath, prettier);
  }

  console.log(pc.cyan(`\nUpgraded ${updates.length} package(s):\n`));
  for (const update of updates) {
    console.log(`  ${update.name}: ${update.from} -> ${pc.green(update.to)}`);
  }
  console.log(pc.yellow('\nRun `pnpm install` to apply.\n'));
}
