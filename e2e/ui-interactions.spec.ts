import { test, expect } from '@playwright/test';

test.describe('UI Interaction E2E Tests', () => {
    test.setTimeout(90000);

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('heading', { name: 'Gemini Kanban Board' })).toBeVisible({ timeout: 10000 });
    });

    test('should show and hide delete button on hover', async ({ page }) => {
        const taskTitle = `Hover Test ${Date.now()}`;

        // Create task
        await page.getByRole('button', { name: /\+ New Task/i }).click();
        await page.getByPlaceholder('Task title...').fill(taskTitle);
        await page.getByRole('button', { name: /Create Task/i }).click();

        const card = page.getByRole('heading', { name: taskTitle }).locator('..').locator('..');
        await expect(card).toBeVisible();

        // Delete button should be hidden initially (opacity-0)
        const deleteBtn = card.locator('button:has-text("✕")');
        await expect(deleteBtn).toHaveCSS('opacity', '0');

        // Hover over card - delete button should become visible
        await card.hover();
        await expect(deleteBtn).not.toHaveCSS('opacity', '0', { timeout: 5000 });
    });

    test('should show connection status indicator', async ({ page }) => {
        // Should show either Connected or Disconnected
        await expect(page.getByText(/Connected|Disconnected/)).toBeVisible();
    });

    test('should display task title in terminal view header', async ({ page }) => {
        const taskTitle = `Header Display Test ${Date.now()}`;

        await page.getByRole('button', { name: /\+ New Task/i }).click();
        await page.getByPlaceholder('Task title...').fill(taskTitle);
        await page.getByPlaceholder(/Describe what Gemini/i).fill('echo "test"');
        await page.getByRole('button', { name: /Create Task/i }).click();

        const card = page.getByRole('heading', { name: taskTitle }).locator('..').locator('..');
        await card.getByRole('button', { name: /Run/i }).click();

        // Wait for terminal view
        await expect(page.locator('.terminal')).toBeVisible({ timeout: 10000 });

        // Task title should be visible in the header
        await expect(page.locator('h2').filter({ hasText: taskTitle })).toBeVisible();
    });

    test('should show working directory in task card when set', async ({ page }) => {
        const taskTitle = `WorkDir Display ${Date.now()}`;

        await page.getByRole('button', { name: /\+ New Task/i }).click();
        await page.getByPlaceholder('Task title...').fill(taskTitle);
        await page.getByPlaceholder(/Describe what Gemini/i).fill('pwd');
        await page.getByPlaceholder('/path/to/project').fill('/tmp');
        await page.getByRole('button', { name: /Create Task/i }).click();

        const card = page.getByRole('heading', { name: taskTitle }).locator('..').locator('..');
        await expect(card).toContainText('/tmp');
        await expect(card).toContainText('📂');
    });

    test('should show correct status icons for each state', async ({ page }) => {
        const taskTitle = `Status Icon Test ${Date.now()}`;

        // Create task - should show todo icon (○)
        await page.getByRole('button', { name: /\+ New Task/i }).click();
        await page.getByPlaceholder('Task title...').fill(taskTitle);
        await page.getByPlaceholder(/Describe what Gemini/i).fill('echo "done"');
        await page.getByRole('button', { name: /Create Task/i }).click();

        const card = page.getByRole('heading', { name: taskTitle }).locator('..').locator('..');
        await expect(card).toContainText('○'); // Todo icon

        // Run task
        await card.getByRole('button', { name: /Run/i }).click();

        // Should show running icon (◐) or animation
        await expect(card).toContainText(/◐|Running/i, { timeout: 10000 });

        // Wait for completion - should show done status
        await expect(card).toContainText(/Done/i, { timeout: 60000 });
    });

    test('should hide Run button after task starts', async ({ page }) => {
        const taskTitle = `Button Hide Test ${Date.now()}`;

        await page.getByRole('button', { name: /\+ New Task/i }).click();
        await page.getByPlaceholder('Task title...').fill(taskTitle);
        await page.getByPlaceholder(/Describe what Gemini/i).fill('sleep 2 && echo "done"');
        await page.getByRole('button', { name: /Create Task/i }).click();

        const card = page.getByRole('heading', { name: taskTitle }).locator('..').locator('..');
        const runBtn = card.getByRole('button', { name: /Run/i });

        // Run button should be visible initially
        await expect(runBtn).toBeVisible();

        // Click run
        await runBtn.click();

        // Run button should disappear
        await expect(runBtn).not.toBeVisible({ timeout: 10000 });
    });

    test('should show task description in card', async ({ page }) => {
        const taskTitle = `Desc Display ${Date.now()}`;
        const description = 'This is a test description for display verification';

        await page.getByRole('button', { name: /\+ New Task/i }).click();
        await page.getByPlaceholder('Task title...').fill(taskTitle);
        await page.getByPlaceholder(/Describe what Gemini/i).fill(description);
        await page.getByRole('button', { name: /Create Task/i }).click();

        const card = page.getByRole('heading', { name: taskTitle }).locator('..').locator('..');
        await expect(card).toContainText('This is a test description');
    });


    test('should display all three columns in kanban view', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Todo', level: 3 })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Running', level: 3 })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Done', level: 3 })).toBeVisible();
    });

    test('should show + New Task button prominently', async ({ page }) => {
        const newTaskBtn = page.getByRole('button', { name: /\+ New Task/i });
        await expect(newTaskBtn).toBeVisible();
        // Should have accent styling
        await expect(newTaskBtn).toHaveCSS('background-color', /.+/);
    });

    test('should clear form after task creation', async ({ page }) => {
        const taskTitle = `Form Clear Test ${Date.now()}`;

        await page.getByRole('button', { name: /\+ New Task/i }).click();

        const titleInput = page.getByPlaceholder('Task title...');
        const descInput = page.getByPlaceholder(/Describe what Gemini/i);

        await titleInput.fill(taskTitle);
        await descInput.fill('Test Description');

        await page.getByRole('button', { name: /Create Task/i }).click();

        // Wait for task to appear
        await expect(page.getByRole('heading', { name: taskTitle })).toBeVisible({ timeout: 10000 });

        // Open form again
        await page.getByRole('button', { name: /\+ New Task/i }).click();

        // Fields should be empty
        await expect(titleInput).toHaveValue('');
    });

    test('should show Back button only in terminal view', async ({ page }) => {
        // Back button should not be visible on board
        await expect(page.getByRole('button', { name: /← Back/i })).not.toBeVisible();

        // Create and run a task to enter terminal view
        const taskTitle = `Back Btn Test ${Date.now()}`;
        await page.getByRole('button', { name: /\+ New Task/i }).click();
        await page.getByPlaceholder('Task title...').fill(taskTitle);
        await page.getByPlaceholder(/Describe what Gemini/i).fill('echo "test"');
        await page.getByRole('button', { name: /Create Task/i }).click();

        const card = page.getByRole('heading', { name: taskTitle }).locator('..').locator('..');
        await card.getByRole('button', { name: /Run/i }).click();

        // Now in terminal view - Back button should be visible
        await expect(page.getByRole('button', { name: /← Back/i })).toBeVisible({ timeout: 10000 });
    });
});
