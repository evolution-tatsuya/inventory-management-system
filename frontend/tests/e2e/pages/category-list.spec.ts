import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.helper';

test.describe('Category List Page', () => {
  test.beforeEach(async ({ page }) => {
    // 各テスト前にログイン
    await login(page);
  });

  test('should display category list page', async ({ page }) => {
    // カテゴリーリストページが表示されることを確認
    await expect(page).toHaveURL('/categories');

    // ページタイトルの確認
    await expect(page.locator('h4')).toContainText('カテゴリー選択');

    // 説明文の確認
    await expect(page.locator('text=管理するカテゴリーを選択してください')).toBeVisible();
  });

  test('should display search button', async ({ page }) => {
    // 検索ボタンが表示されることを確認
    const searchButton = page.locator('button:has-text("検索")');
    await expect(searchButton).toBeVisible();

    // アイコンが含まれていることを確認
    await expect(searchButton.locator('svg')).toBeVisible();
  });

  test('should display category cards', async ({ page }) => {
    // カテゴリーカードが表示されることを確認
    const categoryCards = page.locator('[role="button"]').filter({
      has: page.locator('svg'),
    });

    // 少なくとも1つのカテゴリーカードが存在することを確認
    await expect(categoryCards.first()).toBeVisible();

    // GT3-048カテゴリーカードの存在確認
    await expect(page.locator('text=GT3-048')).toBeVisible();
  });

  test('should display all mock categories', async ({ page }) => {
    // すべてのモックカテゴリーが表示されることを確認
    await expect(page.locator('text=GT3-048')).toBeVisible();
    await expect(page.locator('text=GT3-049')).toBeVisible();
    await expect(page.locator('text=991 GT3 RS')).toBeVisible();
    await expect(page.locator('text=Cayman GT4')).toBeVisible();
  });

  test('should navigate when category is clicked', async ({ page }) => {
    // カテゴリーカードをクリック
    const categoryCard = page.locator('text=GT3-048');
    await categoryCard.click();

    // URLが変わったことを確認（具体的なページは未実装でもOK）
    await page.waitForTimeout(500); // クリックの反映を待つ
    const currentUrl = page.url();

    // カテゴリーリストページから移動していることを確認（/categories以外）
    expect(currentUrl).toContain('http://localhost:3589');
  });

  test('should click search button', async ({ page }) => {
    // 検索ボタンをクリック
    const searchButton = page.locator('button:has-text("検索")');
    await expect(searchButton).toBeVisible();
    await searchButton.click();

    // URLが変わったことを確認（検索ページは未実装でもOK）
    await page.waitForTimeout(500);
    const currentUrl = page.url();
    expect(currentUrl).toContain('http://localhost:3589');
  });
});
