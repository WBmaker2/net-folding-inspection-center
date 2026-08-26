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
  expect(pulseBox!.y + pulseBox!.height).toBeGreaterThan(0);
  expect(pulseBox!.y).toBeLessThan(viewport!.height);
  const pulseIsTopmost = await pulse.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    return top === element || element.contains(top);
  });
  expect(pulseIsTopmost).toBe(true);

  const footer = page.locator('.site-footer');
  await expect(dialog).toBeHidden();
  await footer.scrollIntoViewIfNeeded();
  await trigger.scrollIntoViewIfNeeded();
  const triggerBox = await trigger.boundingBox();
  expect(triggerBox?.width ?? 0).toBeGreaterThan(0);
  expect(triggerBox?.height ?? 0).toBeGreaterThan(0);
  expect(triggerBox!.x + triggerBox!.width).toBeGreaterThan(0);
  expect(triggerBox!.x).toBeLessThan(viewport!.width);
  expect(triggerBox!.y + triggerBox!.height).toBeGreaterThan(0);
  expect(triggerBox!.y).toBeLessThan(viewport!.height);
  const triggerIsTopmost = await trigger.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    return top === element || element.contains(top);
  });
  expect(triggerIsTopmost).toBe(true);
  const overlap = (left: { x: number; y: number; width: number; height: number }, right: { x: number; y: number; width: number; height: number }): boolean => (
    left.x < right.x + right.width && left.x + left.width > right.x
      && left.y < right.y + right.height && left.y + left.height > right.y
  );
  const footerGeometry = await page.evaluate(() => {
    const rect = (selector: string): { x: number; y: number; width: number; height: number } | null => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) return null;
      const box = element.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    };
    return {
      trigger: rect('.update-history-trigger'),
      storage: rect('.progress-storage-control'),
      footerSentence: rect('.footer-content > p'),
    };
  });
  expect(footerGeometry.storage).not.toBeNull();
  expect(footerGeometry.footerSentence).not.toBeNull();
  if (footerGeometry.trigger !== null && footerGeometry.storage !== null) {
    expect(overlap(footerGeometry.trigger, footerGeometry.storage), JSON.stringify(footerGeometry)).toBe(false);
  }
  if (footerGeometry.trigger !== null && footerGeometry.footerSentence !== null) {
    expect(overlap(footerGeometry.trigger, footerGeometry.footerSentence), JSON.stringify(footerGeometry)).toBe(false);
  }
  await trigger.click();
  await expect(dialog).toBeVisible();
  const dialogBox = await dialog.boundingBox();
  expect(dialogBox?.width ?? 0).toBeGreaterThan(0);
  expect(dialogBox?.height ?? 0).toBeGreaterThan(0);
  expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
  expect(dialogBox!.y).toBeGreaterThanOrEqual(0);
  expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(viewport!.width);
  expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(viewport!.height);
  const dialogContent = dialog.locator('.update-history-dialog-content');
  await expect(dialogContent).toBeVisible();
  await expect(dialogContent).toHaveCSS('overflow-y', 'auto');
  const closeButton = dialog.getByRole('button', { name: '닫기' });
  await expect(closeButton).toBeVisible();
  await expect(closeButton).toBeEnabled();
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
  const comparison = page.locator('.completion-comparison');
  await expect(comparison).toHaveCSS('overflow-x', 'auto');
  const comparisonMetrics = await comparison.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(comparisonMetrics.scrollWidth).toBeGreaterThan(comparisonMetrics.clientWidth);
  const scrolledLeft = await comparison.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
    return element.scrollLeft;
  });
  expect(scrolledLeft).toBeGreaterThan(0);
  const lastColumn = comparison.locator('tbody tr').first().locator('td').last();
  const scrollerBox = await comparison.boundingBox();
  const lastColumnBox = await lastColumn.boundingBox();
  expect(scrollerBox).not.toBeNull();
  expect(lastColumnBox).not.toBeNull();
  const reachable = scrollerBox !== null && lastColumnBox !== null
    && lastColumnBox.x < scrollerBox.x + scrollerBox.width
    && lastColumnBox.x + lastColumnBox.width > scrollerBox.x
    && lastColumnBox.y < scrollerBox.y + scrollerBox.height
    && lastColumnBox.y + lastColumnBox.height > scrollerBox.y;
  expect(reachable).toBe(true);
  await expectRequiredActionsUsable(page, /다음 미션/);
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
  await page.screenshot({ path: 'docs/qa/evidence/responsive-375-200-root-font.png', fullPage: true });
});
