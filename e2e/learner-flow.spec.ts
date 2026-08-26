import { expect, test } from '@playwright/test';
import {
  completeDiagnosis,
  completeEvidence,
  completeFolding,
  completePrediction,
  completeRepair,
  expectOnePulse,
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
});
