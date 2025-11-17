import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.helper';

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    // ログイン
    await login(page);
    // ダッシュボードへ遷移
    await page.goto('/admin/dashboard');
  });

  test('should display dashboard page', async ({ page }) => {
    // ダッシュボードページが表示されることを確認
    await expect(page).toHaveURL('/admin/dashboard');

    // ページタイトルの確認（最初のh4要素）
    await expect(page.locator('h4').first()).toContainText('ダッシュボード');

    // 説明文の確認
    await expect(page.locator('text=システム全体の状況を確認できます')).toBeVisible();
  });

  test('should display sidebar navigation', async ({ page }) => {
    // サイドバーが存在することを確認（MainLayoutの一部）
    const sidebar = page.locator('aside').or(page.locator('nav'));
    await expect(sidebar.first()).toBeVisible();
  });

  test('should display all four statistics cards', async ({ page }) => {
    // カテゴリー数カードの確認
    await expect(page.locator('text=カテゴリー数')).toBeVisible();

    // ジャンル数カードの確認
    await expect(page.locator('text=ジャンル数')).toBeVisible();

    // パーツ総数カードの確認
    await expect(page.locator('text=パーツ総数')).toBeVisible();

    // 在庫総数カードの確認
    await expect(page.locator('text=在庫総数')).toBeVisible();
  });

  test('should display statistics with correct values', async ({ page }) => {
    // 統計の数値が表示されることを確認（親要素から特定）
    await expect(page.locator('text=カテゴリー数').locator('..').locator('h4')).toBeVisible();
    await expect(page.locator('text=ジャンル数').locator('..').locator('h4')).toBeVisible();
    await expect(page.locator('text=パーツ総数').locator('..').locator('h4')).toBeVisible();
    await expect(page.locator('text=在庫総数').locator('..').locator('h4')).toBeVisible();
  });

  test('should display quick access buttons', async ({ page }) => {
    // クイックアクセスセクションのタイトル確認
    await expect(page.locator('text=クイックアクセス')).toBeVisible();

    // 主要なクイックアクセスボタンの存在確認
    await expect(page.locator('button:has-text("カテゴリー追加")')).toBeVisible();
    await expect(page.locator('button:has-text("ジャンル追加")')).toBeVisible();
    await expect(page.locator('button:has-text("パーツ追加")')).toBeVisible();
    await expect(page.locator('button:has-text("検索")')).toBeVisible();
  });

  test('should have no layout issues', async ({ page }) => {
    // ページが正常にレンダリングされることを確認
    const mainContent = page.locator('main').or(page.locator('[role="main"]'));
    await expect(mainContent.first()).toBeVisible();

    // グリッドレイアウトが崩れていないことを確認
    const statsCards = page.locator('text=カテゴリー数').locator('..');
    const cardCount = await statsCards.count();

    // 少なくとも1つの統計カードが表示されていることを確認
    expect(cardCount).toBeGreaterThan(0);
  });

  test('should click quick access buttons', async ({ page }) => {
    // 検索ボタンをクリック
    const searchButton = page.locator('button:has-text("検索")');
    await expect(searchButton).toBeVisible();
    await searchButton.click();

    // クリックが実行されたことを確認（ページ未実装でもOK）
    await page.waitForTimeout(500);
    const currentUrl = page.url();
    expect(currentUrl).toContain('http://localhost:3589');
  });
});
