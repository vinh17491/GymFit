import { test, expect } from '@playwright/test';

test.describe('Trang chủ GymFit', () => {
  test('hiển thị tiêu đề trang', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/GymFit|gym|fit/i);
  });

  test('có thể điều hướng menu chính', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav, header, .navbar');
    await expect(nav.first()).toBeVisible();
  });
});
