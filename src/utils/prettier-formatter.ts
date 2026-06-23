import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'fs-extra';

export interface PrettierModule {
  resolveConfig(filePath: string): Promise<Record<string, unknown> | null>;
  getFileInfo(filePath: string): Promise<{ ignored: boolean; inferredParser?: string | null }>;
  format(source: string, options: Record<string, unknown>): Promise<string>;
}

export const FORMATTABLE_EXTENSIONS = new Set([
  '.ts',
  '.js',
  '.mjs',
  '.json',
  '.md',
  '.yml',
  '.yaml',
]);

/**
 * Load prettier from the CLI's own node_modules.
 * Used during `create` when the target project hasn't been installed yet.
 */
export function loadPrettierFromCLI(): PrettierModule {
  const require = createRequire(
    path.join(__dirname, '..', '..', 'package.json'),
  );
  return require('prettier') as PrettierModule;
}

/**
 * Load prettier from the target project's node_modules.
 * Used during `generate` / `method` when the project already exists.
 * Returns null if prettier is not available (e.g. project not installed).
 */
export function loadPrettierFromProject(
  projectRoot: string,
): PrettierModule | null {
  try {
    const require = createRequire(
      path.join(projectRoot, 'package.json'),
    );
    return require('prettier') as PrettierModule;
  } catch {
    return null;
  }
}

export function isFormattableFile(filePath: string): boolean {
  return FORMATTABLE_EXTENSIONS.has(path.extname(filePath));
}

/**
 * Format a single file with prettier. Writes in-place if content changed.
 */
export async function formatFileWithPrettier(
  filePath: string,
  prettier: PrettierModule,
): Promise<void> {
  const fileInfo = await prettier.getFileInfo(filePath);
  if (fileInfo.ignored || !fileInfo.inferredParser) {
    return;
  }

  const source = await fs.readFile(filePath, 'utf8');
  const config = await prettier.resolveConfig(filePath);
  const formatted = await prettier.format(source, {
    ...config,
    filepath: filePath,
  });

  if (formatted !== source) {
    await fs.writeFile(filePath, formatted);
  }
}

/**
 * Format a list of file paths with prettier.
 * Silently skips non-.ts files and files prettier can't parse.
 */
export async function formatFilesWithPrettier(
  filePaths: string[],
  prettier: PrettierModule,
): Promise<void> {
  const uniquePaths = [...new Set(filePaths)].filter((p) => p.endsWith('.ts'));
  if (uniquePaths.length === 0) {
    return;
  }

  await Promise.all(
    uniquePaths.map(async (filePath) => {
      await formatFileWithPrettier(filePath, prettier);
    }),
  );
}
