import { test, expect } from '@playwright/test';

test.describe('Performance E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('heading', { name: 'Gemini Kanban Board' })).toBeVisible({ timeout: 10000 });
    });

    test('should load initial page within acceptable time', async ({ page }) => {
        const startTime = Date.now();

        await page.reload();
        await expect(page.getByRole('heading', { name: 'Gemini Kanban Board' })).toBeVisible();

        const loadTime = Date.now() - startTime;

        // Page should load within 5 seconds (generous for CI)
        expect(loadTime).toBeLessThan(5000);
    });

    test('should open modal quickly after button click', async ({ page }) => {
        const startTime = Date.now();

        await page.getByRole('button', { name: /\+ New Task/i }).click();
        await expect(page.getByPlaceholder('Task title...')).toBeVisible();

        const responseTime = Date.now() - startTime;

        // Modal should appear within 1 second (relaxed for CI variance)
        expect(responseTime).toBeLessThan(1000);
    });

    test('should handle scrolling with many tasks', async ({ page }) => {
        // Create 10 tasks to generate scrollable content
        const baseName = `Scroll ${Date.now()}`;

        for (let i = 0; i < 10; i++) {
            await page.getByRole('button', { name: /\+ New Task/i }).click();
            await page.getByPlaceholder('Task title...').fill(`${baseName}-${i}`);
            await page.getByRole('button', { name: /Create Task/i }).click();
            await expect(page.locator(`text=${baseName}-${i}`)).toBeVisible({ timeout: 5000 });
        }

        // Scroll down
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

        // Last task should be visible after scroll
        await expect(page.locator(`text=${baseName}-9`)).toBeVisible();

        // Scroll back up
        await page.evaluate(() => window.scrollTo(0, 0));

        // Header should be visible
        await expect(page.getByRole('heading', { name: 'Gemini Kanban Board' })).toBeVisible();
    });

    test('should render task cards without layout shift', async ({ page }) => {
        const taskTitle = `Layout Shift ${Date.now()}`;

        // Get initial layout
        const headerBefore = await page.getByRole('heading', { name: 'Gemini Kanban Board' }).boundingBox();

        // Create task
        await page.getByRole('button', { name: /\+ New Task/i }).click();
        await page.getByPlaceholder('Task title...').fill(taskTitle);
        await page.getByRole('button', { name: /Create Task/i }).click();
        await expect(page.locator(`text=${taskTitle}`)).toBeVisible({ timeout: 5000 });

        // Check header position didn't shift significantly
        const headerAfter = await page.getByRole('heading', { name: 'Gemini Kanban Board' }).boundingBox();

        // Allow 2px tolerance for potential anti-aliasing
        expect(Math.abs(headerBefore!.y - headerAfter!.y)).toBeLessThan(2);
    });
});
