import { expect, test } from '@playwright/test';

const MODEL_BOUNDARY = '이 가상 접기는 면의 연결 관계를 보여 주는 기하 모형이며 실제 종이의 두께·휘어짐·포장 강도·안전성을 보장하지 않습니다.';
const STORAGE_KEY = 'nfic.progress.v1';

const choosePrediction = async (page: import('@playwright/test').Page): Promise<void> => {
  await page.getByRole('button', { name: '면 위치 추적 1 미션 선택' }).click();
  await page.getByRole('group', { name: '기준면 선택 전개도' }).getByRole('button', { name: /^1번 면/ }).click();
  await page.getByRole('group', { name: '예상 윗면 선택 전개도' }).getByRole('button', { name: /^3번 면/ }).click();
  for (const face of [2, 3, 5, 6, 4]) {
    await page.getByRole('button', { name: `접는 순서에 ${face}번 면 추가` }).click();
  }
  for (const face of [2, 3, 5, 6, 4]) {
    await page.getByRole('button', { name: `${face}번 면의 북쪽 방향 ↑` }).click();
  }
  await page.getByRole('button', { name: '예측을 남기고 접기실로' }).click();
};

test.describe('privacy and safety boundaries', () => {
  test('starts clean, repeats the exact model boundary, and has no personal fields', async ({ page }) => {
    const externalRequests: string[] = [];
    const appAddress = new URL('http://127.0.0.1:4173');
    const isExternal = (url: string): boolean => {
      const requested = new URL(url);
      return requested.hostname !== appAddress.hostname || requested.port !== appAddress.port;
    };
    page.on('request', (request) => {
      if (isExternal(request.url())) externalRequests.push(request.url());
    });
    page.on('websocket', (socket) => {
      if (isExternal(socket.url())) externalRequests.push(socket.url());
    });
    await page.goto('/');
    expect(await page.evaluate((key) => ({ length: sessionStorage.length, value: sessionStorage.getItem(key) }), STORAGE_KEY))
      .toEqual({ length: 0, value: null });
    await expect(page.getByText(MODEL_BOUNDARY, { exact: true })).toBeVisible();
    expect(await page.locator('input[type="email"], input[type="file"], textarea, [contenteditable="true"]').count()).toBe(0);
    expect(await page.getByText(/이름|학번|이메일/u).count()).toBe(0);
    expect(externalRequests).toEqual([]);
  });

  test('opts in, restores a folding stage, and opt-out removes only the app key', async ({ page }) => {
    const externalRequests: string[] = [];
    const appAddress = new URL('http://127.0.0.1:4173');
    const isExternal = (url: string): boolean => {
      const requested = new URL(url);
      return requested.hostname !== appAddress.hostname || requested.port !== appAddress.port;
    };
    page.on('request', (request) => {
      if (isExternal(request.url())) externalRequests.push(request.url());
    });
    page.on('websocket', (socket) => {
      if (isExternal(socket.url())) externalRequests.push(socket.url());
    });
    await page.goto('/');
    await page.getByLabel('이 탭에서 새로고침 후에도 진행 저장').check();
    await choosePrediction(page);
    await expect(page.getByText(MODEL_BOUNDARY, { exact: true })).toBeVisible();
    const saved = await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key) ?? 'null'), STORAGE_KEY);
    expect(saved).toMatchObject({ version: 1, missionId: 'cube-track-01', stage: 'folding' });
    expect(await page.evaluate(() => Object.keys(sessionStorage))).toEqual([STORAGE_KEY]);
    expect(JSON.stringify(saved)).not.toMatch(/문장|이름|학번|이메일|free.?text/u);
    await page.evaluate(() => sessionStorage.setItem('unrelated-key', 'keep-me'));
    await page.reload();
    await expect(page.getByText('저장한 진행을 불러왔습니다.', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: '한 면씩 접기' })).toBeVisible();
    await expect(page.getByText('0 / 5면 접힘')).toBeVisible();
    await page.getByLabel('이 탭에서 새로고침 후에도 진행 저장').uncheck();
    expect(await page.evaluate((key) => ({ app: sessionStorage.getItem(key), unrelated: sessionStorage.getItem('unrelated-key') }), STORAGE_KEY))
      .toEqual({ app: null, unrelated: 'keep-me' });
    expect(externalRequests).toEqual([]);
  });
});
