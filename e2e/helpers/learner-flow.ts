import { expect, type Locator, type Page } from '@playwright/test';

export type MissionId = 'cube-track-01' | 'cube-opposite-01' | 'cube-collision-01' | 'cube-repair-01';
export type MissionKind = 'tracking' | 'opposite' | 'collision' | 'repair';

const missionTitles: Record<MissionId, string> = {
  'cube-track-01': '면 위치 추적 1',
  'cube-opposite-01': '맞은편 면 찾기 1',
  'cube-collision-01': '겹침 경보 1',
  'cube-repair-01': '한 면 수리 1',
};

export const missionTitle = (missionId: MissionId): string => missionTitles[missionId];

export const faceButton = (page: Page, faceNumber: number, occurrence = 0): Locator => (
  page.getByRole('button', { name: new RegExp(`^${faceNumber}번 면`) }).nth(occurrence)
);

export const pulseButtons = (page: Page): Locator => page.locator('button.gi-pulse');

export async function expectOnePulse(page: Page, expectedName: RegExp): Promise<void> {
  const pulses = pulseButtons(page);
  await expect(pulses).toHaveCount(1);
  await expect(pulses).toBeVisible();
  await expect(pulses).toBeEnabled();
  await expect(pulses).toHaveAccessibleName(expectedName);
  await expect(page.getByRole('button', { name: '업데이트 내역' })).not.toHaveClass(/gi-pulse/);
  await expect(page.locator('button.gi-pulse').filter({ hasText: /다시 보기|되돌아보기|장식만 한 번 돌리기/ })).toHaveCount(0);
}

export async function selectMission(page: Page, missionId: MissionId): Promise<void> {
  await page.getByRole('button', { name: `${missionTitle(missionId)} 미션 선택` }).click();
  await expect(page.getByRole('heading', { name: '예측판' })).toBeVisible();
}

export async function completePrediction(page: Page, topFaceNumber: number): Promise<void> {
  await expect(page.getByRole('button', { name: '예측을 남기고 접기실로' })).toBeDisabled();
  await expect(page.getByRole('heading', { name: '한 면씩 접기' })).toHaveCount(0);
  await expect(page.locator('canvas')).toHaveCount(0);
  await faceButton(page, 1, 0).click();
  await faceButton(page, topFaceNumber, 1).click();
  const orderNumbers = [2, 3, 4, 5, 6];
  for (const number of orderNumbers) {
    await page.getByRole('button', { name: `접는 순서에 ${number}번 면 추가` }).click();
  }
  for (const number of orderNumbers) {
    await page.getByRole('button', { name: new RegExp(`${number}번 면의 북쪽 방향`) }).click();
  }
  await expect(page.getByRole('button', { name: '예측을 남기고 접기실로' })).toBeEnabled();
  await expectOnePulse(page, /예측을 남기고 접기실로/);
  await page.getByRole('button', { name: '예측을 남기고 접기실로' }).click();
  await expect(page.getByRole('heading', { name: '한 면씩 접기' })).toBeVisible();
}

export async function completeFolding(page: Page): Promise<void> {
  for (let step = 0; step < 5; step += 1) {
    await expectOnePulse(page, /다음 면 접기/);
    await page.getByRole('button', { name: '다음 면 접기' }).click();
  }
}

export async function completeRemainingFolding(page: Page, remainingSteps: number): Promise<void> {
  for (let step = 0; step < remainingSteps; step += 1) {
    await expectOnePulse(page, /다음 면 접기/);
    await page.getByRole('button', { name: '다음 면 접기' }).click();
  }
}

export async function completeDiagnosis(page: Page, kind: MissionKind): Promise<void> {
  await expect(page.getByRole('heading', { name: '접힌 결과 진단하기' })).toBeVisible();
  if (kind === 'tracking') {
    await page.getByRole('radio', { name: '장식 방향을 확인해야 해요' }).check();
    await faceButton(page, 3).click();
  } else {
    await page.getByRole('radio', { name: '두 면이 같은 자리에 겹쳐요' }).check();
    await faceButton(page, 2).click();
    await faceButton(page, 6).click();
    await page.getByRole('radio', { name: '+x 방향' }).check();
  }
  await expect(page.getByRole('button', { name: '진단 확인' })).toBeEnabled();
  await expectOnePulse(page, /진단 확인/);
  await page.getByRole('button', { name: '진단 확인' }).click();
}

export async function completeRepair(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: '한 면 수리대' })).toBeVisible();
  await faceButton(page, 6).first().click();
  await page.getByRole('button', { name: /빈 칸 \(2, 1\).*이동 후보/ }).click();
  await expect(page.getByRole('button', { name: '수리 확인' })).toBeEnabled();
  await expectOnePulse(page, /수리 확인/);
  await page.getByRole('button', { name: '수리 확인' }).click();
}

export async function completeEvidence(page: Page, kind: MissionKind): Promise<void> {
  await expect(page.getByRole('heading', { name: '근거 문장 만들기' })).toBeVisible();
  if (kind === 'repair') {
    await faceButton(page, 1).click();
    await faceButton(page, 3).click();
    await page.getByLabel('첫 번째 기하 낱말').selectOption({ label: '면' });
    await page.getByLabel('두 번째 기하 낱말').selectOption({ label: '겹침' });
  } else if (kind === 'collision') {
    await faceButton(page, 2).click();
    await faceButton(page, 6).click();
    await page.getByLabel('첫 번째 기하 낱말').selectOption({ label: '겹침' });
    await page.getByLabel('두 번째 기하 낱말').selectOption({ label: '면' });
  } else {
    await faceButton(page, 1).click();
    await faceButton(page, kind === 'tracking' ? 3 : 3).click();
    await page.getByLabel('첫 번째 기하 낱말').selectOption({ label: '맞은편' });
    await page.getByLabel('두 번째 기하 낱말').selectOption({ label: '접는 방향' });
  }
  await expect(page.getByRole('button', { name: '근거 확인' })).toBeEnabled();
  await expectOnePulse(page, /근거 확인/);
  await page.getByRole('button', { name: '근거 확인' }).click();
  await expect(page.getByRole('button', { name: '미션 완료 확인' })).toBeEnabled();
  await expectOnePulse(page, /미션 완료 확인/);
  await page.getByRole('button', { name: '미션 완료 확인' }).click();
  await expect(page.getByRole('heading', { name: '검수 완료' })).toBeVisible();
}
