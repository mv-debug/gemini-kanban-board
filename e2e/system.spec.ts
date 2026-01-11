import { test, expect } from '@playwright/test'

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

        // 3. Wait for completion
        await expect(card).toContainText(/Done/i, { timeout: 60000 })
    })
})
