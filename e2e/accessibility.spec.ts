import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import {
  completeDiagnosis,
  completeEvidence,
  completeFolding,
  completeRepair,
  completeRemainingFolding,
  completePrediction,
  expectOnePulse,
  selectMission,
} from './helpers/learner-flow';
import { completeCollisionWithKeyboard } from './helpers/keyboard-flow';

async function expectA11y(page: Parameters<typeof test>[0]['page']): Promise<void> {
  const result = await new AxeBuilder({ page }).analyze();
  const serious = result.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''));
  expect(serious, serious.map((violation) => `${violation.id}: ${violation.help}`).join('\n')).toHaveLength(0);
}

test('업데이트 dialog Escape가 opener에 초점을 돌려준다', async ({ page }) => {
  await page.goto('/');
  const trigger = page.getByRole('button', { name: '업데이트 내역' });
  await trigger.focus();
  await trigger.press('Enter');
  const dialog = page.getByRole('dialog', { name: '업데이트 내역' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: '업데이트 내역' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('마우스 없이 Tab·화살표·Space·Enter로 충돌 수리 미션을 완료한다', async ({ page }) => {
  await page.goto('/');
  await expectOnePulse(page, /면 위치 추적 1 미션 선택/);
  await completeCollisionWithKeyboard(page);
  await expectOnePulse(page, /다음 미션/);
  await page.screenshot({ path: 'docs/qa/evidence/keyboard-complete.png', fullPage: true });
});

test('접기 live region, repair Escape reset, 대표 화면 axe 검사를 확인한다', async ({ page }) => {
  await page.goto('/');
  await selectMission(page, 'cube-collision-01');
  await completePrediction(page, 2);
  await page.getByRole('button', { name: '다음 면 접기' }).click();
  await expect(page.locator('[role="status"]').filter({ hasText: '접혔습니다' }).first()).toBeVisible();
  await expectA11y(page);
  await completeRemainingFolding(page, 4);
  await completeDiagnosis(page, 'collision');
  await page.getByRole('button', { name: /^6번 면/ }).first().click();
  await page.getByRole('button', { name: /빈 칸 \(2, 1\).*이동 후보/ }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByText('선택과 미리보기를 지웠습니다. 면을 다시 선택하세요.')).toBeVisible();
  await completeRepair(page);
  await expectA11y(page);
});

test('reduced motion은 pseudo-element pulse를 끄고 outline을 남긴다', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const pulse = page.locator('button.gi-pulse');
  await expectOnePulse(page, /면 위치 추적 1 미션 선택/);
  const state = await pulse.evaluate((element) => {
    const style = getComputedStyle(element, '::after');
    const own = getComputedStyle(element);
    return { animationName: style.animationName, content: style.content, outlineWidth: own.outlineWidth };
  });
  expect(state.content).not.toBe('none');
  expect(state.animationName).toBe('none');
  expect(state.outlineWidth).toBe('3px');
  await page.screenshot({ path: 'docs/qa/evidence/reduced-motion.png', fullPage: true });
});

test('forced colors에서도 색상 외 면 번호·무늬 접근성 이름을 유지한다', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto('/');
  await selectMission(page, 'cube-track-01');
  await expect(page.getByRole('button', { name: /^1번 면, 파란색, 원형/ }).first()).toBeVisible();
  await expectA11y(page);
  await page.screenshot({ path: 'docs/qa/evidence/forced-colors.png', fullPage: true });
});

test('각 단계 heading이 존재하는 동안 심각 axe 위반은 0개다', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '검수 접수' })).toBeVisible();
  await expectA11y(page);
  await selectMission(page, 'cube-collision-01');
  await expect(page.getByRole('heading', { name: '예측판' })).toBeVisible();
  await expectA11y(page);
  await completePrediction(page, 2);
  await expect(page.getByRole('heading', { name: '한 면씩 접기' })).toBeVisible();
  await expectA11y(page);
  await completeFolding(page);
  await expect(page.getByRole('heading', { name: '접힌 결과 진단하기' })).toBeVisible();
  await expectA11y(page);
  await completeDiagnosis(page, 'collision');
  await expect(page.getByRole('heading', { name: '한 면 수리대' })).toBeVisible();
  await expectA11y(page);
  await completeRepair(page);
  await expect(page.getByRole('heading', { name: '근거 문장 만들기' })).toBeVisible();
  await expectA11y(page);
  await completeEvidence(page, 'collision');
  await expect(page.getByRole('heading', { name: '검수 완료' })).toBeVisible();
  await expectA11y(page);
});
