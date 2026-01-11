import { test, expect } from '@playwright/test';

test.describe('Edge Case E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('heading', { name: 'Gemini Kanban Board' })).toBeVisible({ timeout: 10000 });
    });

    test('should handle rapid task creation', async ({ page }) => {
        const baseName = `Rapid ${Date.now()}`;

        // Create 5 tasks quickly
        for (let i = 0; i < 5; i++) {
            const title = `${baseName} - ${i}`;
            await page.getByRole('button', { name: /\+ New Task/i }).click();
            await page.getByPlaceholder('Task title...').fill(title);
            await page.getByRole('button', { name: /Create Task/i }).click();
            await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 5000 });
        }

        // All 5 should exist
        for (let i = 0; i < 5; i++) {
            await expect(page.locator(`text=${baseName} - ${i}`)).toBeVisible();
        }
    });

    test('should handle page refresh during task list', async ({ page }) => {
        const taskTitle = `Refresh Test ${Date.now()}`;

        // Create a task
        await page.getByRole('button', { name: /\+ New Task/i }).click();
        await page.getByPlaceholder('Task title...').fill(taskTitle);
        await page.getByRole('button', { name: /Create Task/i }).click();
        await expect(page.locator(`text=${taskTitle}`)).toBeVisible({ timeout: 5000 });

        // Refresh
        await page.reload();
        await expect(page.getByRole('heading', { name: 'Gemini Kanban Board' })).toBeVisible({ timeout: 10000 });

        // Task should persist (assuming backend stores it)
        await expect(page.locator(`text=${taskTitle}`)).toBeVisible({ timeout: 5000 });
    });

    test('should maintain UI state on connection recovery', async ({ page }) => {
        // Check initial connection
        await expect(page.getByText('Connected')).toBeVisible({ timeout: 10000 });

        // App should continue working even if connection status changes
        // This is a smoke test - we can't easily simulate network issues
        await expect(page.getByRole('button', { name: /\+ New Task/i })).toBeVisible();
    });

    test('should handle browser resize gracefully', async ({ page }) => {
        // Start with desktop size
        await page.setViewportSize({ width: 1920, height: 1080 });
        await expect(page.getByRole('heading', { name: 'Todo', level: 3 })).toBeVisible();

        // Resize to mobile
        await page.setViewportSize({ width: 375, height: 667 });
        await expect(page.getByRole('heading', { name: 'Todo', level: 3 })).toBeVisible();

        // Resize to tablet
        await page.setViewportSize({ width: 768, height: 1024 });
        await expect(page.getByRole('heading', { name: 'Todo', level: 3 })).toBeVisible();

        // Back to desktop
        await page.setViewportSize({ width: 1280, height: 800 });
        await expect(page.getByRole('heading', { name: 'Todo', level: 3 })).toBeVisible();
    });

    test('should handle double-click on task card', async ({ page }) => {
        const taskTitle = `DblClick ${Date.now()}`;

        await page.getByRole('button', { name: /\+ New Task/i }).click();
        await page.getByPlaceholder('Task title...').fill(taskTitle);
        await page.getByRole('button', { name: /Create Task/i }).click();

        const card = page.getByRole('heading', { name: taskTitle }).locator('..').locator('..');
        await expect(card).toBeVisible();

        // Double-click - should not cause issues
        await card.dblclick();

        // App should not crash - either opens task or does nothing
        await expect(page.getByRole('heading', { name: 'Gemini Kanban Board' })).toBeVisible();
    });
});
