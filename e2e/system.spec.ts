import { test, expect } from '@playwright/test'

// Skip all tests in this file in CI - they require Gemini CLI
test.skip(!!process.env.CI, 'Skipping Gemini CLI tests in CI');

test.describe('System E2E Tests', () => {
    test.setTimeout(60000);

    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));
        await page.goto('/')
        await expect(page.getByRole('heading', { name: 'Gemini Kanban Board' })).toBeVisible({ timeout: 10000 })
    })

    test('should create and run a task successfully', async ({ page }) => {
        const timestamp = Date.now()
        const taskTitle = `System Test ${timestamp}`

        // 1. Create Task
        await page.getByRole('button', { name: /\+ New Task/i }).click()
        await page.getByPlaceholder('Task title...').fill(taskTitle)
        await page.getByPlaceholder('Describe what Gemini should do...').fill('echo "test complete"')
        await page.getByRole('button', { name: /Create Task/i }).click()

        // 2. Run Task
        const card = page.getByRole('heading', { name: taskTitle }).locator('..').locator('..')
        await expect(card).toBeVisible()
        await card.getByRole('button', { name: /Run/i }).click()

        // 3. After clicking Run, we navigate to terminal view
        // Wait for terminal view to show the task title
        await expect(page.getByRole('heading', { name: taskTitle })).toBeVisible({ timeout: 10000 })

        // 4. Wait for completion - check the status badge in the terminal header
        await expect(page.locator('text=/Done.*Exit/')).toBeVisible({ timeout: 60000 })
    })
})
