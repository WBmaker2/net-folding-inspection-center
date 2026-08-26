import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const components = readFileSync('src/styles/components.css', 'utf8');
const motion = readFileSync('src/styles/motion.css', 'utf8');
const layout = readFileSync('src/styles/layout.css', 'utf8');
const extractRule = (css: string, selector: string): string => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? '';
};
const blockBetween = (css: string, start: string, end?: string): string => {
  const startIndex = css.indexOf(start);
  if (startIndex < 0) return '';
  const endIndex = end === undefined ? css.length : css.indexOf(end, startIndex + start.length);
  return css.slice(startIndex, endIndex < 0 ? css.length : endIndex);
};

describe('Task 14 static accessibility styles', () => {
  it('provides reduced-motion and forced-colors contracts', () => {
    const reduced = blockBetween(motion, '@media (prefers-reduced-motion: reduce)', '@media (forced-colors: active)');
    const forced = blockBetween(motion, '@media (forced-colors: active)');
    const pulse = extractRule(motion, '.gi-pulse');
    expect(reduced).toContain('@media (prefers-reduced-motion: reduce)');
    expect(pulse).not.toContain('animation');
    expect(pulse).not.toContain('transform');
    expect(extractRule(reduced, '.gi-pulse')).toContain('outline: 3px solid');
    expect(extractRule(reduced, '.gi-pulse')).not.toContain('transform');
    expect(extractRule(reduced, '.gi-pulse::after')).toContain('animation: none');
    expect(reduced).toContain('.cube-canvas-shell');
    expect(reduced).toContain('transition: none !important');
    expect(forced).toContain('color: ButtonText');
    expect(forced).toContain('border: 2px solid Highlight');
  });

  it('keeps controls usable on narrow and wide learning layouts', () => {
    expect(components).toContain('@media (max-width: 375px)');
    expect(layout).toContain('@media (min-width: 768px)');
    const trigger = extractRule(components, '.update-history-trigger');
    expect(trigger).toContain('position: fixed');
    expect(components).toContain('right: calc(env(safe-area-inset-right) + 16px);');
    expect(components).toContain('bottom: calc(env(safe-area-inset-bottom) + 16px);');
    expect(trigger).toContain('min-height: 44px');
    expect(components).not.toContain('overflow: hidden');
  });
});
