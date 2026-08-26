import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const components = readFileSync('src/styles/components.css', 'utf8');
const motion = readFileSync('src/styles/motion.css', 'utf8');
const layout = readFileSync('src/styles/layout.css', 'utf8');

describe('Task 14 static accessibility styles', () => {
  it('provides reduced-motion and forced-colors contracts', () => {
    expect(motion).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(motion).toMatch(/\.gi-pulse[\s\S]*animation:\s*none/);
    expect(motion).toMatch(/\.gi-pulse[\s\S]*outline:\s*3px/);
    expect(motion).toMatch(/\.cube-canvas-shell[\s\S]*transition:\s*none/);
    expect(motion).toContain('ButtonText');
    expect(motion).toContain('Highlight');
  });

  it('keeps controls usable on narrow and wide learning layouts', () => {
    expect(components).toContain('@media (max-width: 375px)');
    expect(layout).toContain('@media (min-width: 768px)');
    expect(components).toMatch(/\.update-history-trigger[\s\S]*position:\s*fixed/);
    expect(components).toContain('right: calc(env(safe-area-inset-right) + 16px);');
    expect(components).toContain('bottom: calc(env(safe-area-inset-bottom) + 16px);');
    expect(components).toMatch(/min-(?:width|height):\s*44px/);
    expect(components).not.toContain('overflow: hidden');
  });
});
