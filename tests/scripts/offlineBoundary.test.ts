import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const checker = path.resolve('scripts/check-offline-boundary.mjs');
const scanScript = `import { scanOfflineBoundary } from ${JSON.stringify(new URL(`file://${checker}`).href)};\nawait scanOfflineBoundary(process.argv[1]);`;
const scanAt = (root: string): string => execFileSync(
  process.execPath,
  ['--input-type=module', '-e', scanScript, root],
  { encoding: 'utf8' },
);

describe('offline boundary checker', () => {
  it.each([
    ['fetch(', 'fetch('],
    ['fetch whitespace', 'fetch  ('],
    ['XMLHttpRequest', 'new XMLHttpRequest()'],
    ['WebSocket', 'new WebSocket("/socket")'],
    ['EventSource', 'new EventSource("/events")'],
    ['external URL', 'const url = "https://example.test"'],
  ])('reports %s in authored source', async (_name, code) => {
    const root = await mkdtemp(path.join(tmpdir(), 'nfic-offline-'));
    try {
      await mkdir(path.join(root, 'src'));
      await writeFile(path.join(root, 'src', 'bad.ts'), code);
      expect(() => execFileSync(process.execPath, [checker], { cwd: root, encoding: 'utf8' }))
        .toThrow(/src\/bad\.ts:1/u);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('passes clean authored source and ignores documentation outside src', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'nfic-offline-'));
    try {
      await mkdir(path.join(root, 'src'));
      await writeFile(path.join(root, 'src', 'clean.ts'), 'export const geometry = "local";');
      await writeFile(path.join(root, 'README.md'), 'See https://example.test for context.');
      expect(execFileSync(process.execPath, [checker], { cwd: root, encoding: 'utf8' }))
        .toContain('Offline boundary check passed');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects a missing root', () => {
    expect(() => scanAt(path.join(tmpdir(), 'nfic-no-such-root')))
      .toThrow(/requires repo root directory/u);
  });

  it('rejects a missing or non-directory src', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'nfic-offline-'));
    try {
      expect(() => scanAt(root))
        .toThrow(/requires src directory/u);
      await writeFile(path.join(root, 'src'), 'not a directory');
      expect(() => scanAt(root))
        .toThrow(/requires src directory/u);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
