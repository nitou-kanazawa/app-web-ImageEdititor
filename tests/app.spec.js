const { test, expect } = require('@playwright/test');
const { makePng } = require('./helpers/png');

// 全テストで使い回すテスト画像（120x120）
const PNG = makePng(120, 120);

/** 画像を読み込み、キャンバス表示まで待つ */
async function loadImage(page) {
    await page.setInputFiles('#imageInput', {
        name: 'sample.png',
        mimeType: 'image/png',
        buffer: PNG,
    });
    await expect(page.locator('#canvas')).toBeVisible();
}

test.describe('見た目（VSCode風UI）', () => {
    test('初期表示: 主要レイアウト要素とプレースホルダが表示される', async ({ page }, testInfo) => {
        await page.goto('/');

        await expect(page.locator('.titlebar')).toBeVisible();
        await expect(page.locator('.activitybar')).toBeVisible();
        await expect(page.locator('.sidebar')).toBeVisible();
        await expect(page.locator('.statusbar')).toBeVisible();
        await expect(page.locator('.editor__placeholder')).toBeVisible();
        await expect(page.locator('#status')).toHaveText('画像を選択してください');

        await page.screenshot({
            path: `test-results/ui-initial-${testInfo.project.name}.png`,
            fullPage: true,
        });
    });

    test('画像読み込み後: ツールパネルが表示されプレースホルダが消える', async ({ page }, testInfo) => {
        await page.goto('/');
        await loadImage(page);

        await expect(page.locator('#toolSelection')).toBeVisible();
        await expect(page.locator('.editor__placeholder')).toBeHidden();

        await page.screenshot({
            path: `test-results/ui-loaded-${testInfo.project.name}.png`,
            fullPage: true,
        });
    });
});

test.describe('機能の動作', () => {
    test('丸ブラシ選択時にブラシサイズUIが表示される', async ({ page }) => {
        await page.goto('/');
        await loadImage(page);

        await expect(page.locator('#brushSizeControl')).toBeHidden();
        await page.check('input[value="brush"]');
        await expect(page.locator('#brushSizeControl')).toBeVisible();
    });

    test('長辺1/100オプションで粗さスライダーが無効化され自動値が出る', async ({ page }) => {
        await page.goto('/');
        await loadImage(page);

        await page.check('#autoMosaicSize');
        await expect(page.locator('#mosaicSizeSlider')).toBeDisabled();
        // 120px / 100 = 1.2 → round = 1px (自動)
        await expect(page.locator('#mosaicSizeValue')).toContainText('(自動)');
    });

    test('ファイル名サフィックスのプレビューが更新される', async ({ page }) => {
        await page.goto('/');
        await loadImage(page);

        await page.fill('#downloadSuffix', '_edited');
        await expect(page.locator('#suffixPreview')).toHaveText('_edited');
    });
});

test.describe('E2E（操作フロー）', () => {
    test('全体モードでモザイクをかけるとキャンバスのピクセルが変化する', async ({ page }) => {
        await page.goto('/');
        await loadImage(page);

        await page.check('input[value="full"]');
        await expect(page.locator('#processBtn')).toBeEnabled();

        const before = await page.locator('#canvas').evaluate((c) => c.toDataURL());
        await page.click('#processBtn');
        await expect(page.locator('#status')).toContainText('完了');

        const after = await page.locator('#canvas').evaluate((c) => c.toDataURL());
        expect(after).not.toBe(before);
        await expect(page.locator('#downloadBtn')).toBeVisible();
    });

    test('ダウンロードファイル名にサフィックスが反映される', async ({ page }) => {
        await page.goto('/');
        await loadImage(page);

        await page.fill('#downloadSuffix', '_v2');
        await page.check('input[value="full"]');
        await page.click('#processBtn');
        await expect(page.locator('#downloadBtn')).toBeVisible();

        const [download] = await Promise.all([
            page.waitForEvent('download'),
            page.click('#downloadBtn'),
        ]);
        expect(download.suggestedFilename()).toBe('mosaic-image_v2.png');
    });

    test('Undo/Redoでモザイク前後を行き来できる', async ({ page }) => {
        await page.goto('/');
        await loadImage(page);

        const original = await page.locator('#canvas').evaluate((c) => c.toDataURL());

        await page.check('input[value="full"]');
        await page.click('#processBtn');
        await expect(page.locator('#status')).toContainText('完了');
        const mosaicked = await page.locator('#canvas').evaluate((c) => c.toDataURL());
        expect(mosaicked).not.toBe(original);

        // Undo
        await page.click('#undoBtn');
        const afterUndo = await page.locator('#canvas').evaluate((c) => c.toDataURL());
        expect(afterUndo).toBe(original);

        // Redo
        await page.click('#redoBtn');
        const afterRedo = await page.locator('#canvas').evaluate((c) => c.toDataURL());
        expect(afterRedo).toBe(mosaicked);
    });
});
