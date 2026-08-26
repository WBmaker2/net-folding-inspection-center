import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BANNED_PATTERNS = [
  { token: 'fetch(', pattern: /fetch\s*\(/gu },
  { token: 'XMLHttpRequest', pattern: /XMLHttpRequest/gu },
  { token: 'WebSocket', pattern: /WebSocket/gu },
  { token: 'EventSource', pattern: /EventSource/gu },
  { token: 'external URL', pattern: /https?:\/\//gu },
];

const sourceRoot = (root) => path.resolve(root, 'src');

const assertDirectory = async (directory, label) => {
  let stats;
  try {
    stats = await fs.lstat(directory);
  } catch {
    throw new Error(`Offline boundary check requires ${label} directory: ${directory}`);
  }
  if (stats.isSymbolicLink()) {
    throw new Error(`Offline boundary check rejects symbolic link for ${label}: ${directory}`);
  }
  if (!stats.isDirectory()) {
    throw new Error(`Offline boundary check requires ${label} directory: ${directory}`);
  }
};

async function collectTextFiles(directory, root, files = []) {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return files;
    throw error;
  }
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const absolute = path.join(directory, entry.name);
    // Every link is rejected at the link itself. Never inspect or follow its target.
    if (entry.isSymbolicLink()) {
      throw new Error(
        `Offline boundary check rejects symbolic link under src: ${path.relative(root, absolute)}`,
      );
    }
    if (entry.isDirectory()) {
      await collectTextFiles(absolute, root, files);
    } else if (entry.isFile()) {
      files.push({ absolute, relative: path.relative(root, absolute) });
    }
  }
  return files;
}

export async function scanOfflineBoundary(root = process.cwd()) {
  const resolvedRoot = path.resolve(root);
  await assertDirectory(resolvedRoot, 'repo root');
  await assertDirectory(sourceRoot(resolvedRoot), 'src');
  const files = await collectTextFiles(sourceRoot(resolvedRoot), resolvedRoot);
  const findings = [];
  for (const file of files.sort((left, right) => left.relative.localeCompare(right.relative))) {
    const content = await fs.readFile(file.absolute, 'utf8');
    const lines = content.split(/\r?\n/u);
    lines.forEach((line, index) => {
      for (const { token, pattern } of BANNED_PATTERNS) {
        pattern.lastIndex = 0;
        if (pattern.test(line)) findings.push({
          path: file.relative,
          line: index + 1,
          token,
        });
      }
    });
  }
  return findings.sort((left, right) => (
    left.path.localeCompare(right.path)
    || left.line - right.line
    || left.token.localeCompare(right.token)
  ));
}

export async function main() {
  let findings;
  try {
    findings = await scanOfflineBoundary();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
  if (findings.length > 0) {
    for (const finding of findings) {
      console.error(`${finding.path}:${finding.line} ${finding.token}`);
    }
    return 1;
  }
  console.log('Offline boundary check passed: no external clients or URLs found under src.');
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
