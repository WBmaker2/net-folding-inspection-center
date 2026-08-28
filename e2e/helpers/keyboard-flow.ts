import { expect, type Locator, type Page } from '@playwright/test';

async function tabUntil(page: Page, target: Locator, maximum = 100): Promise<void> {
  for (let index = 0; index < maximum; index += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`Tab traversal did not reach the expected learner control: ${target}`);
}

const face = (page: Page, number: number): Locator => (
  page.getByRole('button', { name: new RegExp(`^${number}번 면`) }).first()
);

const evidenceFace = (page: Page, number: number): Locator => (
  page.getByRole('button', { name: `${number}번 면`, exact: true })
);

async function moveFace(page: Page, from: number, keys: string[], to: number): Promise<void> {
  const origin = face(page, from);
  await tabUntil(page, origin);
  for (const key of keys) await page.keyboard.press(key);
  await expect(face(page, to)).toBeFocused();
}

export async function completeCollisionWithKeyboard(page: Page): Promise<void> {
  const missionButton = page.getByRole('button', { name: '겹침 경보 1 미션 선택' });
  for (let index = 0; index < 5; index += 1) await page.keyboard.press('Tab');
  await expect(missionButton).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.getByRole('heading', { name: '예측판' })).toBeVisible();

  const baseFace = page.getByRole('region', { name: '기준면을 골라 보세요' }).getByRole('button', { name: /^1번 면/ });
  await tabUntil(page, baseFace);
  await page.keyboard.press('Space');
  await expect(page.getByText('기준면: 1번 면')).toBeVisible();

  const topF1 = page.getByRole('region', { name: '예상 윗면을 골라 보세요' }).getByRole('button', { name: /^1번 면/ });
  const topF2 = page.getByRole('region', { name: '예상 윗면을 골라 보세요' }).getByRole('button', { name: /^2번 면/ });
  await tabUntil(page, topF1);
  await page.keyboard.press('ArrowUp');
  await expect(topF2).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText('예상 윗면: 2번 면')).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(topF2).toBeFocused();

  for (const number of [2, 3, 4, 5, 6]) {
    const orderButton = page.getByRole('button', { name: `접는 순서에 ${number}번 면 추가` });
    await tabUntil(page, orderButton);
    await page.keyboard.press('Space');
  }
  for (const number of [2, 3, 4, 5, 6]) {
    const directionButton = page.getByRole('button', { name: new RegExp(`${number}번 면의 북쪽 방향`) }).first();
    await tabUntil(page, directionButton);
    await page.keyboard.press('Space');
  }
  const predictionSubmit = page.getByRole('button', { name: '예측을 남기고 접기실로' });
  await tabUntil(page, predictionSubmit);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: '한 면씩 접기' })).toBeVisible();

  const nextFold = page.getByRole('button', { name: '다음 면 접기' });
  await tabUntil(page, nextFold);
  for (let step = 0; step < 5; step += 1) {
    await page.keyboard.press('Space');
    if (step === 0) {
      await expect(page.locator('.folding-state [role="status"]')).toContainText('접혔습니다');
    }
    if (step < 4) await tabUntil(page, nextFold);
  }
  await expect(page.getByRole('heading', { name: '접힌 결과 진단하기' })).toBeVisible();

  const overlap = page.getByRole('radio', { name: '두 면이 같은 자리에 겹쳐요' });
  await tabUntil(page, overlap);
  await page.keyboard.press('Space');
  await tabUntil(page, face(page, 2));
  await page.keyboard.press('Space');
  await tabUntil(page, face(page, 6));
  await page.keyboard.press('Space');
  const plusX = page.getByRole('radio', { name: '오른쪽 방향' });
  await tabUntil(page, plusX);
  await page.keyboard.press('Space');
  const diagnosisSubmit = page.getByRole('button', { name: '진단 확인' });
  await tabUntil(page, diagnosisSubmit);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: '한 면 수리대' })).toBeVisible();

  await moveFace(page, 1, ['ArrowLeft', 'ArrowUp'], 6);
  await page.keyboard.press('Space');
  const target = page.getByRole('button', { name: /빈 칸 \(2, 1\).*이동 후보/ });
  await tabUntil(page, target);
  await page.keyboard.press('Enter');
  const repairSubmit = page.getByRole('button', { name: '수리 확인' });
  await tabUntil(page, repairSubmit);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: '근거 문장 만들기' })).toBeVisible();

  await tabUntil(page, evidenceFace(page, 2));
  await page.keyboard.press('Space');
  await tabUntil(page, evidenceFace(page, 6));
  await page.keyboard.press('Space');
  const relationship = page.locator('#evidence-term-relationship');
  const path = page.locator('#evidence-term-path');
  await tabUntil(page, relationship);
  await expect(relationship).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await tabUntil(page, path);
  await expect(path).toBeFocused();
  await page.keyboard.press('ArrowDown');
  const evidenceSubmit = page.getByRole('button', { name: '근거 확인' });
  await expect(evidenceSubmit).toBeEnabled();
  await tabUntil(page, evidenceSubmit);
  await page.keyboard.press('Enter');
  const complete = page.getByRole('button', { name: '미션 완료 확인' });
  await tabUntil(page, complete);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: '검수 완료' })).toBeVisible();
}
