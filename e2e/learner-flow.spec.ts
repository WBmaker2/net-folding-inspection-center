import { expect, test } from '@playwright/test';
import {
  completeDiagnosis,
  completeEvidence,
  completeFolding,
  completePrediction,
  completeRepair,
  expectOnePulse,
  faceButton,
  missionTitle,
  pulseButtons,
  selectMission,
  type MissionId,
} from './helpers/learner-flow';

const missions: readonly { id: MissionId; kind: 'tracking' | 'opposite' | 'collision' | 'repair'; top: number }[] = [
  { id: 'cube-track-01', kind: 'tracking', top: 3 },
  { id: 'cube-opposite-01', kind: 'opposite', top: 3 },
  { id: 'cube-collision-01', kind: 'collision', top: 2 },
  { id: 'cube-repair-01', kind: 'repair', top: 2 },
];

test.describe('실제 학습자 완료 순서', () => {
  for (const mission of missions) {
    test(`미션 ${mission.id}를 단계별로 완료한다`, async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('heading', { name: '검수 접수' })).toBeVisible();
      await expectOnePulse(page, new RegExp(`${missionTitle('cube-track-01')} 미션 선택`));
      await selectMission(page, mission.id);
      await expect(pulseButtons(page)).toHaveCount(0);
      await completePrediction(page, mission.top);
      await completeFolding(page);
      if (mission.kind !== 'opposite') await completeDiagnosis(page, mission.kind);
      if (mission.kind === 'collision' || mission.kind === 'repair') await completeRepair(page);
      await completeEvidence(page, mission.kind);
      await expect(page.getByText('검수 완료')).toBeVisible();
      await expect(page.locator('button.gi-pulse')).toHaveCount(1);
      await expect(page.getByRole('button', { name: /다음 미션/ })).toBeVisible();
    });
  }

  test('불가능한 접기 순서를 예측판에서 고쳐 다시 접는다', async ({ page }) => {
    await page.goto('/');
    await selectMission(page, 'cube-track-01');
    await faceButton(page, 1, 0).click();
    await faceButton(page, 3, 1).click();
    for (const number of [3, 2, 5, 6, 4]) {
      await page.getByRole('button', { name: `접는 순서에 ${number}번 면 추가` }).click();
    }
    for (const number of [3, 2, 5, 6, 4]) {
      await page.getByRole('button', { name: new RegExp(`${number}번 면의 북쪽 방향`) }).click();
    }
    await page.getByRole('button', { name: '예측을 남기고 접기실로' }).click();
    await expect(page.getByRole('alert')).toHaveText('이 예측한 순서로는 접기 단계를 만들 수 없습니다.');
    await expectOnePulse(page, /예측판으로 돌아가 다시 고르기/);
    await page.getByRole('button', { name: '예측판으로 돌아가 다시 고르기' }).click();
    await completePrediction(page, 3);
    await completeFolding(page);
    await expect(page.getByRole('heading', { name: '접힌 결과 진단하기' })).toBeVisible();
  });
});
