// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright設定
 * - 静的サーバー(python http.server)を自動起動してテスト
 * - PC/モバイルの2プロジェクトで見た目を確認
 */
module.exports = defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: 'list',

    use: {
        baseURL: 'http://127.0.0.1:8000',
        trace: 'on-first-retry',
    },

    // テスト対象を静的配信（ビルド不要なバニラJS構成のため）
    webServer: {
        command: 'python3 -m http.server 8000',
        url: 'http://127.0.0.1:8000',
        reuseExistingServer: !process.env.CI,
        timeout: 30 * 1000,
    },

    projects: [
        {
            name: 'desktop',
            use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
        },
        {
            name: 'mobile',
            use: { ...devices['Pixel 5'] },
        },
    ],
});
