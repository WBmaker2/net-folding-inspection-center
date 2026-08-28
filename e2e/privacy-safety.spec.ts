import { expect, test } from '@playwright/test';

const MODEL_BOUNDARY = '이 가상 접기는 면의 연결 관계를 보여 주는 기하 모형이며 실제 종이의 두께·휘어짐·포장 강도·안전성을 보장하지 않습니다.';
const STORAGE_KEY = 'nfic.progress.v1';
const appAddress = new URL('http://127.0.0.1:4173');

const attachExternalTrafficMonitor = (page: import('@playwright/test').Page): string[] => {
  const external: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== appAddress.origin) external.push(request.url());
  });
  page.on('websocket', (socket) => {
    const requested = new URL(socket.url());
    const expectedProtocol = appAddress.protocol === 'https:' ? 'wss:' : 'ws:';
    const expectedHost = `${appAddress.hostname}:${appAddress.port}`;
    if (requested.protocol !== expectedProtocol || requested.host !== expectedHost) external.push(socket.url());
  });
  return external;
};

const choosePrediction = async (
  page: import('@playwright/test').Page,
  missionTitle = '면 위치 추적 1',
): Promise<void> => {
  await page.getByRole('button', { name: `${missionTitle} 미션 선택` }).click();
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

const assertNoPersonalFields = async (page: import('@playwright/test').Page): Promise<void> => {
  expect(await page.locator('input[type="email"], input[type="file"], textarea, [contenteditable="true"]').count()).toBe(0);
  expect(await page.getByText(/이름|학번|이메일/u).count()).toBe(0);
};

const finishFolding = async (page: import('@playwright/test').Page): Promise<void> => {
  for (let step = 0; step < 5; step += 1) {
    await page.getByRole('button', { name: '다음 면 접기' }).click();
  }
};

test.describe('privacy and safety boundaries', () => {
  test('starts clean, repeats the exact model boundary, and has no personal fields', async ({ page }) => {
    const externalRequests = attachExternalTrafficMonitor(page);
    await page.goto('/');
    expect(await page.evaluate((key) => ({ length: sessionStorage.length, value: sessionStorage.getItem(key) }), STORAGE_KEY))
      .toEqual({ length: 0, value: null });
    await expect(page.getByText(MODEL_BOUNDARY, { exact: true })).toBeVisible();
    await assertNoPersonalFields(page);
    expect(externalRequests).toEqual([]);
  });

  test('opts in, restores a folding stage, and opt-out removes only the app key', async ({ page }) => {
    const externalRequests = attachExternalTrafficMonitor(page);
    await page.goto('/');
    await page.getByLabel('이 탭에서 새로고침 후에도 진행 저장').check();
    await choosePrediction(page);
    await expect(page.getByText(MODEL_BOUNDARY, { exact: true })).toBeVisible();
    const saved = await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key) ?? 'null'), STORAGE_KEY);
    expect(saved).toMatchObject({ version: 2, missionId: 'cube-track-01', stage: 'folding' });
    expect(await page.evaluate(() => Object.keys(sessionStorage))).toEqual([STORAGE_KEY]);
    expect(JSON.stringify(saved)).not.toMatch(/문장|이름|학번|이메일|free.?text/u);
    await page.evaluate(() => sessionStorage.setItem('unrelated-key', 'keep-me'));
    await page.reload();
    await expect(page.getByText('저장한 진행을 불러왔습니다.', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: '한 면씩 접기' })).toBeVisible();
    await expect(page.getByText('0 / 5면 접힘')).toBeVisible();
    await assertNoPersonalFields(page);
    await page.getByLabel('이 탭에서 새로고침 후에도 진행 저장').uncheck();
    expect(await page.evaluate((key) => ({ app: sessionStorage.getItem(key), unrelated: sessionStorage.getItem('unrelated-key') }), STORAGE_KEY))
      .toEqual({ app: null, unrelated: 'keep-me' });
    expect(externalRequests).toEqual([]);
  });

  test('keeps evidence selection-only through an opposite-face completion', async ({ page }) => {
    const externalRequests = attachExternalTrafficMonitor(page);
    await page.goto('/');
    await choosePrediction(page, '맞은편 면 찾기 1');
    await assertNoPersonalFields(page);
    await finishFolding(page);
    await expect(page.getByRole('heading', { name: '근거 문장 만들기' })).toBeVisible();
    await assertNoPersonalFields(page);
    expect(await page.locator('input, select, button').evaluateAll((elements) => (
      elements.every((element) => element instanceof HTMLSelectElement || element instanceof HTMLButtonElement
        || (element instanceof HTMLInputElement && element.type === 'checkbox'))
    ))).toBe(true);
    await page.getByRole('button', { name: /^1번 면/ }).click();
    await page.getByRole('button', { name: /^3번 면/ }).click();
    await page.getByLabel('관계를 나타내는 낱말').selectOption('맞은편');
    await page.getByLabel('까닭을 나타내는 낱말').selectOption('접는 방향');
    await page.getByRole('button', { name: '근거 확인' }).click();
    await page.getByRole('button', { name: '미션 완료 확인' }).click();
    await expect(page.getByRole('heading', { name: '검수 완료' })).toBeVisible();
    await assertNoPersonalFields(page);
    expect(externalRequests).toEqual([]);
  });
});
