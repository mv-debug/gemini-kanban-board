import { test, expect } from '@playwright/test';

test.describe('Comprehensive System Tests', () => {
    test.setTimeout(60000); // Increase default timeout for this suite
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('heading', { name: 'Gemini Kanban Board' })).toBeVisible({ timeout: 10000 });
    });

    test('should delete a task and update the board', async ({ page }) => {
        const timestamp = Date.now();
        const taskTitle = `Delete Test ${timestamp}`;

        // 1. Create task
        await page.getByRole('button', { name: /\+ New Task/i }).click();
        await page.getByPlaceholder('Task title...').fill(taskTitle);
        await page.getByRole('button', { name: /Create Task/i }).click();

        // 2. Verify it exists
        const card = page.getByRole('heading', { name: taskTitle }).locator('..').locator('..');
        await expect(card).toBeVisible();

        // 3. Delete task - TaskCard uses '✕'
        await card.locator('button:has-text("✕")').click();

        // 4. Verify it's gone
        await expect(page.getByRole('heading', { name: taskTitle })).not.toBeVisible({ timeout: 10000 });
    });

    test('should show empty column states', async ({ page }) => {
        // Wait for board
        await expect(page.getByRole('heading', { name: 'Todo', level: 3 })).toBeVisible({ timeout: 10000 });

        // Find columns by their headers
        const todoCol = page.locator('div').filter({ has: page.getByRole('heading', { name: 'Todo', level: 3 }) });
        const runningCol = page.locator('div').filter({ has: page.getByRole('heading', { name: 'Running', level: 3 }) });

        // If a column is empty, check for no tasks message
        const todoTasks = await todoCol.locator('.task-card').count();
        if (todoTasks === 0) {
            await expect(todoCol.getByText(/No tasks to do/i)).toBeVisible();
        }

        const runningTasks = await runningCol.locator('.task-card').count();
        if (runningTasks === 0) {
            await expect(runningCol.getByText(/No running tasks/i)).toBeVisible();
        }
    });
});
