import { expect, test } from '@playwright/test';

test('login -> schedule -> shift ekle -> logout', async ({ page }) => {
  await page.goto('/login');

  await page.getByPlaceholder('E-posta').fill('manager@test.local');
  await page.getByPlaceholder('Şifre').fill('Test12345!');
  await page.getByRole('button', { name: 'Giriş Yap' }).click();

  await expect(page.getByRole('heading', { name: 'Haftalık Plan' })).toBeVisible();

  const loginResponse = await page.request.post('http://localhost:4000/api/auth/login', {
    data: { email: 'manager@test.local', password: 'Test12345!' }
  });
  const loginJson = await loginResponse.json();
  const token = loginJson.accessToken as string;

  const employeesResponse = await page.request.get('http://localhost:4000/api/employees?active=true', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const employeesJson = await employeesResponse.json();
  const employeeId = employeesJson[0]?.id as string;

  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() + diff);

  const start = new Date(monday);
  start.setUTCHours(8, 0, 0, 0);
  const end = new Date(monday);
  end.setUTCHours(16, 0, 0, 0);

  await page.request.post('http://localhost:4000/api/shifts', {
    headers: {
      Authorization: `Bearer ${token}`,
      Origin: 'http://localhost:3000'
    },
    data: {
      employeeId,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      forceOverride: true
    }
  });

  await page.reload();

  await expect(page.getByRole('heading', { name: 'Haftalık Plan' })).toBeVisible();

  const shiftCards = page.locator('[data-testid^="shift-card-"]');
  const dropCells = page.locator('[data-testid^="drop-cell-"]');
  if ((await shiftCards.count()) > 0 && (await dropCells.count()) > 1) {
    await shiftCards.first().dragTo(dropCells.nth(1));
  }

  await page.request.post('http://localhost:4000/api/auth/logout', {
    headers: {
      Authorization: `Bearer ${token}`,
      Origin: 'http://localhost:3000'
    }
  });
  await page.goto('/login');
  await expect(page).toHaveURL(/\/login$/);
});
