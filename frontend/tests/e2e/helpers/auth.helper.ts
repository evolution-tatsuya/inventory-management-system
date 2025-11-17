import { Page } from '@playwright/test';

export async function login(
  page: Page,
  email = 'admin@inventory-system.local',
  password = 'InventoryAdmin2025!'
) {
  await page.goto('/login', { waitUntil: 'networkidle' });

  // Wait for the email field to be visible and ready
  await page.waitForSelector('input[type="email"]', { state: 'visible' });

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/categories', { timeout: 10000 });
}
