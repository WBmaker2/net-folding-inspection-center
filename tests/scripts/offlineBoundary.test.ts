import { mkdtemp, rm, writeFile, mkdir, symlink } from 'node:fs/promises';
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

  it('rejects a repository-root symlink without scanning its target', async () => {
    const target = await mkdtemp(path.join(tmpdir(), 'nfic-offline-target-'));
    const parent = await mkdtemp(path.join(tmpdir(), 'nfic-offline-link-'));
    const link = path.join(parent, 'repo-link');
    try {
      await mkdir(path.join(target, 'src'));
      await writeFile(path.join(target, 'src', 'bad.ts'), 'fetch("outside")');
      await symlink(target, link);
      expect(() => scanAt(link)).toThrow(/rejects symbolic link for repo root/u);
    } finally {
      await rm(parent, { recursive: true, force: true });
      await rm(target, { recursive: true, force: true });
    }
  });

  it('rejects a src symlink without scanning its target', async () => {
    const target = await mkdtemp(path.join(tmpdir(), 'nfic-offline-target-'));
    const root = await mkdtemp(path.join(tmpdir(), 'nfic-offline-root-'));
    try {
      await mkdir(path.join(target, 'src'));
      await writeFile(path.join(target, 'src', 'bad.ts'), 'fetch("outside")');
      await symlink(path.join(target, 'src'), path.join(root, 'src'));
      expect(() => scanAt(root)).toThrow(/rejects symbolic link for src/u);
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(target, { recursive: true, force: true });
    }
  });

  it('rejects a nested file symlink, including a clean target, by repo-relative link path', async () => {
    const target = await mkdtemp(path.join(tmpdir(), 'nfic-offline-target-'));
    const root = await mkdtemp(path.join(tmpdir(), 'nfic-offline-root-'));
    try {
      await mkdir(path.join(root, 'src', 'nested'), { recursive: true });
      await writeFile(path.join(target, 'clean.ts'), 'export const local = true;');
      await symlink(path.join(target, 'clean.ts'), path.join(root, 'src', 'nested', 'linked.ts'));
      expect(() => scanAt(root)).toThrow(
        /rejects symbolic link under src: src\/nested\/linked\.ts/u,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(target, { recursive: true, force: true });
    }
  });

  it('rejects a nested directory symlink without fetching its hidden target', async () => {
    const target = await mkdtemp(path.join(tmpdir(), 'nfic-offline-target-'));
    const root = await mkdtemp(path.join(tmpdir(), 'nfic-offline-root-'));
    try {
      await mkdir(path.join(root, 'src', 'nested'), { recursive: true });
      await writeFile(path.join(target, 'hidden.ts'), 'fetch("outside")');
      await symlink(target, path.join(root, 'src', 'nested', 'linked-dir'));
      expect(() => scanAt(root)).toThrow(
        /rejects symbolic link under src: src\/nested\/linked-dir/u,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(target, { recursive: true, force: true });
    }
  });
});
