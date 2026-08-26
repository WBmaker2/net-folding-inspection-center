import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const checker = path.resolve('scripts/check-offline-boundary.mjs');

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
      await writeFile(path.join(root, 'src.ts'), 'export const safe = true;');
      await writeFile(path.join(root, 'src-bad.ts'), code);
      // The checker scans root/src, so place fixtures there after creating it.
      const { mkdir } = await import('node:fs/promises');
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
      const { mkdir } = await import('node:fs/promises');
      await mkdir(path.join(root, 'src'));
      await writeFile(path.join(root, 'src', 'clean.ts'), 'export const geometry = "local";');
      await writeFile(path.join(root, 'README.md'), 'See https://example.test for context.');
      expect(execFileSync(process.execPath, [checker], { cwd: root, encoding: 'utf8' }))
        .toContain('Offline boundary check passed');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
