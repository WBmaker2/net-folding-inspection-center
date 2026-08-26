import { expect, test } from '@playwright/test';
import {
  completeDiagnosis,
  completeEvidence,
  completePrediction,
  completeRepair,
  selectMission,
  type MissionId,
} from './helpers/learner-flow';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function getContext(): RenderingContext | null {
      return null;
    };
    void originalGetContext;
  });
});

const missions: readonly { id: MissionId; kind: 'tracking' | 'opposite' | 'collision' | 'repair'; top: number }[] = [
  { id: 'cube-track-01', kind: 'tracking', top: 3 },
  { id: 'cube-opposite-01', kind: 'opposite', top: 3 },
  { id: 'cube-collision-01', kind: 'collision', top: 2 },
  { id: 'cube-repair-01', kind: 'repair', top: 2 },
];

for (const mission of missions) {
  test(`WebGL 없이 ${mission.id}를 2D 관계 표로 완료한다`, async ({ page }) => {
    await page.goto('/');
    await selectMission(page, mission.id);
    await completePrediction(page, mission.top);
    await page.getByRole('button', { name: '다음 면 접기' }).click();
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(page.getByText('3D 보기를 사용할 수 없어 2D 관계 보기를 유지합니다.')).toBeVisible();
    await expect(page.getByRole('table', { name: '완성된 면 관계' })).toBeVisible();
    for (let step = 1; step < 5; step += 1) await page.getByRole('button', { name: '다음 면 접기' }).click();
    if (mission.kind !== 'opposite') await completeDiagnosis(page, mission.kind);
    if (mission.kind === 'collision' || mission.kind === 'repair') await completeRepair(page);
    await completeEvidence(page, mission.kind);
    await expect(page.getByRole('heading', { name: '검수 완료' })).toBeVisible();
  });
}
