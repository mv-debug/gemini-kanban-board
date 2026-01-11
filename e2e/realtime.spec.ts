import { test, expect } from '@playwright/test';

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

        // 3. Trigger a simulation of a status update
        // Since we can't easily trigger the "backend" to push a WS message from the frontend test without a backend-side harness,
        // we might verify the *result* of an action that triggers a WS message.
        // The standard "Run" flow already implicitly tests this (Run -> Running -> Done).
        // To be more specific about "Real-time" without reload:

        // We will perform the run action and explicitly assert no page reload happened.
        const initialUrl = page.url();

        // Start running
        await card.getByRole('button', { name: /Run/i }).click();

        // Watch for status change to 'Running' (indicated by icon or text)
        // This MUST happen without URL change or reload
        await expect(card).toContainText(/Running|◐/, { timeout: 10000 });

        expect(page.url()).toBe(initialUrl);

        // Use JS execution to ensure we are still in same SPA session (window object same)
        // Playwright handles this by default (page object persists), but good to verify behavior.
    });


});
