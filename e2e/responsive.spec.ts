import { expect, test } from '@playwright/test';
import {
  completeDiagnosis,
  completeEvidence,
  completeFolding,
  completePrediction,
  completeRepair,
  expectOnePulse,
  selectMission,
} from './helpers/learner-flow';

async function expectRequiredActionsUsable(
  page: Parameters<typeof test>[0]['page'],
  expectedPulse?: RegExp,
): Promise<void> {
  const pulse = page.locator('button.gi-pulse');
  await expect(pulse).toHaveCount(1);
  if (expectedPulse !== undefined) await expectOnePulse(page, expectedPulse);
  const trigger = page.getByRole('button', { name: '업데이트 내역' });
  const dialog = page.getByRole('dialog');
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  const metrics = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
  await pulse.scrollIntoViewIfNeeded();
  const pulseBox = await pulse.boundingBox();
  expect(pulseBox?.width ?? 0).toBeGreaterThan(0);
  expect(pulseBox?.height ?? 0).toBeGreaterThan(0);
  expect(pulseBox!.x + pulseBox!.width).toBeGreaterThan(0);
  expect(pulseBox!.x).toBeLessThan(viewport!.width);
  const pulseIsTopmost = await pulse.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    return top === element || element.contains(top);
  });
  expect(pulseIsTopmost).toBe(true);
  await trigger.scrollIntoViewIfNeeded();
  const triggerBox = await trigger.boundingBox();
  expect(triggerBox?.width ?? 0).toBeGreaterThan(0);
  expect(triggerBox?.height ?? 0).toBeGreaterThan(0);
  await trigger.click();
  await expect(dialog).toBeVisible();
  const dialogBox = await dialog.boundingBox();
  expect(dialogBox?.width ?? 0).toBeGreaterThan(0);
  expect(dialogBox?.height ?? 0).toBeGreaterThan(0);
  expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
  expect(dialogBox!.y).toBeGreaterThanOrEqual(0);
  expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(viewport!.width);
  expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(viewport!.height);
  const overlap = (left: { x: number; y: number; width: number; height: number }, right: { x: number; y: number; width: number; height: number }): boolean => (
    left.x < right.x + right.width && left.x + left.width > right.x
      && left.y < right.y + right.height && left.y + left.height > right.y
  );
  const geometry = await page.evaluate(() => {
    const rect = (selector: string): { x: number; y: number; width: number; height: number } | null => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) return null;
      const box = element.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    };
    return {
      trigger: rect('.update-history-trigger'),
      action: rect('button.gi-pulse'),
      storage: rect('.progress-storage-control'),
      footerSentence: rect('.footer-content > p'),
    };
  });
  expect(geometry.trigger).not.toBeNull();
  expect(geometry.action).not.toBeNull();
  expect(geometry.storage).not.toBeNull();
  expect(geometry.footerSentence).not.toBeNull();
  if (geometry.trigger !== null && geometry.action !== null) expect(overlap(geometry.trigger, geometry.action), JSON.stringify(geometry)).toBe(false);
  if (geometry.trigger !== null && geometry.storage !== null) expect(overlap(geometry.trigger, geometry.storage), JSON.stringify(geometry)).toBe(false);
  if (geometry.trigger !== null && geometry.footerSentence !== null) expect(overlap(geometry.trigger, geometry.footerSentence), JSON.stringify(geometry)).toBe(false);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
}

test('375px에서 필수 action과 업데이트 dialog가 보이고 가로 스크롤이 없다', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await expectOnePulse(page, /면 위치 추적 1 미션 선택/);
  await expectRequiredActionsUsable(page, /면 위치 추적 1 미션 선택/);
  await selectMission(page, 'cube-track-01');
  await completePrediction(page, 3);
  await expectRequiredActionsUsable(page, /다음 면 접기/);
  await page.screenshot({ path: 'docs/qa/evidence/responsive-375.png', fullPage: true });
});

test('200% 루트 글자 크기 데스크톱에서 긴 표와 필수 action이 viewport 안에 있다', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await expectOnePulse(page, /면 위치 추적 1 미션 선택/);
  await expectRequiredActionsUsable(page, /면 위치 추적 1 미션 선택/);
  await selectMission(page, 'cube-track-01');
  await completePrediction(page, 3);
  await expectRequiredActionsUsable(page, /다음 면 접기/);
  await completeFolding(page);
  await completeDiagnosis(page, 'tracking');
  await completeEvidence(page, 'tracking');
  const completionMetrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(completionMetrics.scrollWidth).toBeLessThanOrEqual(completionMetrics.clientWidth);
  await expectRequiredActionsUsable(page, /다음 미션/);
  await page.screenshot({ path: 'docs/qa/evidence/responsive-200-root-font.png', fullPage: true });
});

test('375px에서 루트 글자 크기 200%로 수리 완료 표와 action이 겹치지 않는다', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await expectOnePulse(page, /면 위치 추적 1 미션 선택/);
  await selectMission(page, 'cube-collision-01');
  await completePrediction(page, 2);
  await expectRequiredActionsUsable(page, /다음 면 접기/);
  await completeFolding(page);
  await completeDiagnosis(page, 'collision');
  await completeRepair(page);
  await completeEvidence(page, 'collision');
  await expect(page.getByRole('heading', { name: '검수 완료' })).toBeVisible();
  await expect(page.getByRole('table', { name: '기하 학습 성취 상태' })).toBeVisible();
  await expectRequiredActionsUsable(page, /다음 미션/);
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
  await page.screenshot({ path: 'docs/qa/evidence/responsive-375-200-root-font.png', fullPage: true });
});
