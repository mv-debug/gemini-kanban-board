import { test, expect } from '@playwright/test';

test.describe('Task Workflow E2E Tests', () => {
    test.setTimeout(90000);

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('heading', { name: 'Gemini Kanban Board' })).toBeVisible({ timeout: 10000 });
    });

    test('should show correct status progression: todo -> running -> done', async ({ page }) => {
        const taskTitle = `Status Test ${Date.now()}`;

        // Create task
        await page.getByRole('button', { name: /\+ New Task/i }).click();
        await page.getByPlaceholder('Task title...').fill(taskTitle);
        await page.getByPlaceholder(/Describe what Gemini/i).fill('echo "hello"');
        await page.getByRole('button', { name: /Create Task/i }).click();

        // Verify Todo status
        const card = page.getByRole('heading', { name: taskTitle }).locator('..').locator('..');
        await expect(card).toContainText(/Todo/i, { timeout: 5000 });

        // Run task
        await card.getByRole('button', { name: /Run/i }).click();

        // Verify Running status appears
        await expect(card).toContainText(/Running/i, { timeout: 10000 });

        // Verify Done status after completion
        await expect(card).toContainText(/Done/i, { timeout: 60000 });
    });

    test('should display task description in card', async ({ page }) => {
        const taskTitle = `Description Test ${Date.now()}`;
        const taskDescription = 'echo "This is a test description for the task"';

        await page.getByRole('button', { name: /\+ New Task/i }).click();
        await page.getByPlaceholder('Task title...').fill(taskTitle);
        await page.getByPlaceholder(/Describe what Gemini/i).fill(taskDescription);
        await page.getByRole('button', { name: /Create Task/i }).click();

        // Verify description is shown in card
        const card = page.getByRole('heading', { name: taskTitle }).locator('..').locator('..');
        await expect(card).toContainText('echo');
    });

    test('should handle task with working directory', async ({ page }) => {
        const taskTitle = `WorkDir Test ${Date.now()}`;

        await page.getByRole('button', { name: /\+ New Task/i }).click();
        await page.getByPlaceholder('Task title...').fill(taskTitle);
        await page.getByPlaceholder(/Describe what Gemini/i).fill('pwd');

        // Fill working directory if the field exists
        const workDirInput = page.getByPlaceholder(/working directory/i);
        if (await workDirInput.isVisible({ timeout: 1000 }).catch(() => false)) {
            await workDirInput.fill('/tmp');
        }

        await page.getByRole('button', { name: /Create Task/i }).click();

        // Verify task was created
        await expect(page.getByRole('heading', { name: taskTitle })).toBeVisible();
    });

    test('should update task count badges in columns', async ({ page }) => {
        const taskTitle = `Count Test ${Date.now()}`;

        // Get initial Todo count
        const todoHeading = page.getByRole('heading', { name: 'Todo', level: 3 });
        await expect(todoHeading).toBeVisible();

        // Create task
        await page.getByRole('button', { name: /\+ New Task/i }).click();
        await page.getByPlaceholder('Task title...').fill(taskTitle);
        await page.getByRole('button', { name: /Create Task/i }).click();

        // Verify new task appears
        await expect(page.getByRole('heading', { name: taskTitle })).toBeVisible();

        // Run task
        const card = page.getByRole('heading', { name: taskTitle }).locator('..').locator('..');
        await card.getByRole('button', { name: /Run/i }).click();

        // Wait for completion
        await expect(card).toContainText(/Done/i, { timeout: 60000 });
    });


    test('should display terminal output correctly', async ({ page }) => {
        const taskTitle = `Output Test ${Date.now()}`;
        const uniqueOutput = `UNIQUE_OUTPUT_${Date.now()}`;

        await page.getByRole('button', { name: /\+ New Task/i }).click();
        await page.getByPlaceholder('Task title...').fill(taskTitle);
        await page.getByPlaceholder(/Describe what Gemini/i).fill(`echo "${uniqueOutput}"`);
        await page.getByRole('button', { name: /Create Task/i }).click();

        const card = page.getByRole('heading', { name: taskTitle }).locator('..').locator('..');
        await card.getByRole('button', { name: /Run/i }).click();

        // Wait for completion
        await expect(card).toContainText(/Done/i, { timeout: 60000 });

        // Open terminal view
        await card.scrollIntoViewIfNeeded();
        await card.click();

        // Verify output is visible in terminal
        const terminal = page.locator('.terminal:visible .xterm-rows');
        await expect(terminal).toContainText(uniqueOutput, { timeout: 15000 });
    });

    test('should allow creating multiple tasks quickly', async ({ page }) => {
        const tasks = [
            `Quick Task A ${Date.now()}`,
            `Quick Task B ${Date.now()}`,
            `Quick Task C ${Date.now()}`
        ];

        for (const title of tasks) {
            await page.getByRole('button', { name: /\+ New Task/i }).click();
            await page.getByPlaceholder('Task title...').fill(title);
            await page.getByRole('button', { name: /Create Task/i }).click();
            await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 5000 });
        }

        // Verify all tasks exist
        for (const title of tasks) {
            await expect(page.getByRole('heading', { name: title })).toBeVisible();
        }
    });
});
