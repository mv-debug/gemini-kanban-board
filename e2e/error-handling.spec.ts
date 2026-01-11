import { test, expect } from '@playwright/test';

test.describe('Error Handling E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('heading', { name: 'Gemini Kanban Board' })).toBeVisible({ timeout: 10000 });
    });

    test('should disable Create button with empty title', async ({ page }) => {
        await page.getByRole('button', { name: /\+ New Task/i }).click();

        // Button should be disabled when title is empty
        const createBtn = page.getByRole('button', { name: /Create Task/i });
        await expect(createBtn).toBeDisabled();

        // Fill title - button should become enabled
        await page.getByPlaceholder('Task title...').fill('Valid Title');
        await expect(createBtn).toBeEnabled();
    });

    test('should handle special characters in task title', async ({ page }) => {
        const specialTitle = `Test <script>alert("xss")</script> ${Date.now()}`;

        await page.getByRole('button', { name: /\+ New Task/i }).click();
        await page.getByPlaceholder('Task title...').fill(specialTitle);
        await page.getByRole('button', { name: /Create Task/i }).click();

        // Task should be created - content should be escaped/sanitized
        // We check that the app doesn't crash and the text appears literally
        await expect(page.locator('text=<script>').first()).toBeVisible({ timeout: 5000 });
    });

    test('should handle unicode characters in task title', async ({ page }) => {
        const unicodeTitle = `测试任务 🚀 émojis ${Date.now()}`;

        await page.getByRole('button', { name: /\+ New Task/i }).click();
        await page.getByPlaceholder('Task title...').fill(unicodeTitle);
        await page.getByRole('button', { name: /Create Task/i }).click();

        await expect(page.locator(`text=${unicodeTitle}`)).toBeVisible({ timeout: 5000 });
    });

    test('should handle very long task title gracefully', async ({ page }) => {
        const longTitle = 'A'.repeat(200) + ` ${Date.now()}`;

        await page.getByRole('button', { name: /\+ New Task/i }).click();
        await page.getByPlaceholder('Task title...').fill(longTitle);
        await page.getByRole('button', { name: /Create Task/i }).click();

        // Task should be created - might be truncated in display
        // Just verify no crash and some part of the title is visible
        await expect(page.locator('text=AAAA').first()).toBeVisible({ timeout: 5000 });
    });

    test('should disable Create button with only whitespace title', async ({ page }) => {
        await page.getByRole('button', { name: /\+ New Task/i }).click();
        await page.getByPlaceholder('Task title...').fill('   ');

        // Button should remain disabled for whitespace-only
        const createBtn = page.getByRole('button', { name: /Create Task/i });
        await expect(createBtn).toBeDisabled();
    });
});
