import { expect, test } from '@playwright/test';
import {
  completeDiagnosis,
  completeEvidence,
  completeFolding,
  completePrediction,
  expectOnePulse,
  selectMission,
} from './helpers/learner-flow';

async function expectRequiredActionsUsable(page: Parameters<typeof test>[0]['page']): Promise<void> {
  const pulse = page.locator('button.gi-pulse');
  await expect(pulse).toHaveCount(1);
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
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
}

test('375px에서 필수 action과 업데이트 dialog가 보이고 가로 스크롤이 없다', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await expectOnePulse(page, /면 위치 추적 1 미션 선택/);
  await expectRequiredActionsUsable(page);
  await selectMission(page, 'cube-track-01');
  await completePrediction(page, 3);
  await expectRequiredActionsUsable(page);
  await page.screenshot({ path: 'docs/qa/evidence/responsive-375.png', fullPage: true });
});

test('200% 루트 글자 크기 데스크톱에서 긴 표와 필수 action이 viewport 안에 있다', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await expectOnePulse(page, /면 위치 추적 1 미션 선택/);
  await expectRequiredActionsUsable(page);
  await selectMission(page, 'cube-track-01');
  await completePrediction(page, 3);
  await expectRequiredActionsUsable(page);
  await completeFolding(page);
  await completeDiagnosis(page, 'tracking');
  await completeEvidence(page, 'tracking');
  const completionMetrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(completionMetrics.scrollWidth).toBeLessThanOrEqual(completionMetrics.clientWidth);
  await expectRequiredActionsUsable(page);
  await page.screenshot({ path: 'docs/qa/evidence/responsive-200-root-font.png', fullPage: true });
});
