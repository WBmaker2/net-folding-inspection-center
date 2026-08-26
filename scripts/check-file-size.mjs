import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(fileURLToPath(import.meta.url), '../../');
const checkedExtensions = new Set(['.ts', '.tsx', '.css', '.mjs', '.json']);
const ignoredDirectories = new Set([
  '.git',
  '.worktrees',
  'node_modules',
  'dist',
  'coverage',
  'playwright-report',
  'test-results',
]);
const violations = [];

const countLines = (content) => {
  if (content.length === 0) return 0;
  const normalized = content.replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');
  return lines.at(-1) === '' ? lines.length - 1 : lines.length;
};

const visit = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await visit(path);
      continue;
    }
    if (entry.name === 'package-lock.json') continue;
    if (!checkedExtensions.has(path.slice(path.lastIndexOf('.')))) continue;
    const lineCount = countLines(await readFile(path, 'utf8'));
    if (lineCount >= 500) {
      violations.push(`${relative(projectRoot, path)}: ${lineCount} lines`);
    }
  }
};

await visit(projectRoot);

if (violations.length > 0) {
  console.error('Files must stay under 500 lines:');
  for (const violation of violations) console.error(violation);
  process.exitCode = 1;
} else {
  console.log('File-size check passed: all authored files are under 500 lines.');
}
