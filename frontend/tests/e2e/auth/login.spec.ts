import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test('should display login form', async ({ page }) => {
    await page.goto('/login');

    // ページタイトルの確認
    await expect(page.locator('h4')).toContainText('ログイン');

    // メールアドレス入力フィールドの確認
    const emailField = page.locator('input[type="email"]');
    await expect(emailField).toBeVisible();

    // パスワード入力フィールドの確認
    const passwordField = page.locator('input[type="password"]');
    await expect(passwordField).toBeVisible();

    // ログインボタンの確認
    const loginButton = page.locator('button[type="submit"]');
    await expect(loginButton).toBeVisible();

    // デモアカウント情報の表示確認
    await expect(page.locator('text=デモアカウント')).toBeVisible();
    await expect(page.locator('text=admin@inventory-system.local')).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');

    // メールアドレスとパスワードを入力
    await page.fill('input[type="email"]', 'admin@inventory-system.local');
    await page.fill('input[type="password"]', 'InventoryAdmin2025!');

    // ログインボタンをクリック
    await page.click('button[type="submit"]');

    // カテゴリーページへ遷移することを確認
    await page.waitForURL('/categories');
    await expect(page).toHaveURL('/categories');

    // カテゴリーページのヘッダーが表示されることを確認
    await expect(page.locator('h4')).toContainText('カテゴリー選択');
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // 無効な認証情報を入力
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');

    // ログインボタンをクリック
    await page.click('button[type="submit"]');

    // エラーメッセージが表示されることを確認
    await expect(page.locator('[role="alert"]')).toBeVisible();
  });

  test('should disable login button when fields are empty', async ({ page }) => {
    await page.goto('/login');

    // ログインボタンが無効化されていることを確認
    const loginButton = page.locator('button[type="submit"]');
    await expect(loginButton).toBeDisabled();

    // メールアドレスのみ入力
    await page.fill('input[type="email"]', 'admin@inventory-system.local');
    await expect(loginButton).toBeDisabled();

    // パスワードも入力
    await page.fill('input[type="password"]', 'InventoryAdmin2025!');
    await expect(loginButton).toBeEnabled();
  });
});
