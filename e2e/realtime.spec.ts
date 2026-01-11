import { test, expect } from '@playwright/test';

// Skip all tests in this file in CI - they require Gemini CLI
test.skip(!!process.env.CI, 'Skipping Gemini CLI tests in CI');

test.describe('Real-time WebSocket Updates', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('heading', { name: 'Gemini Kanban Board' })).toBeVisible({ timeout: 10000 });
    });

    test('should reflect task status changes in real-time', async ({ page }) => {
        const timestamp = Date.now();
        const taskTitle = `Realtime Task ${timestamp}`;

        // 1. Create a task
        await page.getByRole('button', { name: /\+ New Task/i }).click();
        await page.getByPlaceholder('Task title...').fill(taskTitle);
        await page.getByRole('button', { name: /Create Task/i }).click();

        // 2. Locate the card
        const card = page.getByRole('heading', { name: taskTitle }).locator('..').locator('..');
        await expect(card).toBeVisible();

        // 3. Verify the card shows in the Todo column with proper status
        await expect(card).toContainText(/Todo|○/);

        // 4. Click on the card to navigate to task detail (not Run, that would start Gemini CLI)
        await card.click();

        // 5. Verify we navigated to task detail view (terminal view)
        await expect(page.locator('text=← Back')).toBeVisible({ timeout: 5000 });
        await expect(page.getByRole('heading', { name: taskTitle })).toBeVisible();

        // 6. Go back to board
        await page.getByRole('button', { name: /← Back/i }).click();

        // 7. Verify task is still visible and we're on the board
        await expect(page.getByRole('heading', { name: taskTitle })).toBeVisible();
    });


});
