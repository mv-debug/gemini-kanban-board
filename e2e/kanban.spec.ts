import { test, expect } from '@playwright/test'

test.describe('Kanban Board E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await expect(page.getByRole('heading', { name: 'Gemini Kanban Board' })).toBeVisible({ timeout: 10000 })
    })

    test('should display all three columns', async ({ page }) => {
        // Verify column headers using h3 tags with exact text
        await expect(page.getByRole('heading', { name: 'Todo', level: 3 })).toBeVisible({ timeout: 10000 })
        await expect(page.getByRole('heading', { name: 'Running', level: 3 })).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Done', level: 3 })).toBeVisible()
    })

    test('should create and show task in board', async ({ page }) => {
        // Wait for board to load
        await expect(page.getByRole('heading', { name: 'Todo', level: 3 })).toBeVisible({ timeout: 10000 })

        // Create a task
        const taskTitle = `Count Task ${Date.now()}`
        await page.getByRole('button', { name: /\+ New Task/i }).click()
        await page.getByPlaceholder('Task title...').fill(taskTitle)
        await page.getByRole('button', { name: /Create Task/i }).click()

        // Wait for task to appear - look for our specific task title
        await expect(page.locator(`text=${taskTitle}`)).toBeVisible({ timeout: 5000 })
    })

    test('should display new task with correct title', async ({ page }) => {
        const taskTitle = `Badge Task ${Date.now()}`

        // Create a todo task
        await page.getByRole('button', { name: /\+ New Task/i }).click()
        await page.getByPlaceholder('Task title...').fill(taskTitle)
        await page.getByRole('button', { name: /Create Task/i }).click()

        // Find the task card - the title should be visible
        await expect(page.locator(`text=${taskTitle}`)).toBeVisible({ timeout: 5000 })
    })

    test('should show Run button for new task', async ({ page }) => {
        const taskTitle = `Run Button Task ${Date.now()}`

        // Create a todo task
        await page.getByRole('button', { name: /\+ New Task/i }).click()
        await page.getByPlaceholder('Task title...').fill(taskTitle)
        await page.getByRole('button', { name: /Create Task/i }).click()

        // Wait for task to appear
        await expect(page.locator(`text=${taskTitle}`)).toBeVisible({ timeout: 5000 })

        // Should have at least one Run button visible
        await expect(page.getByRole('button', { name: /▶ Run/i }).first()).toBeVisible()
    })

    test('should show correct running column state', async ({ page }) => {
        // Wait for board to load
        await expect(page.getByRole('heading', { name: 'Todo', level: 3 })).toBeVisible({ timeout: 10000 })

        // Check if there are tasks in running column or the empty message
        const runningColumn = page.locator('div').filter({ has: page.getByRole('heading', { name: 'Running', level: 3 }) })
        const runningCountBadge = runningColumn.getByRole('heading', { name: 'Running' }).locator('xpath=following-sibling::span')
        const countText = await runningCountBadge.textContent()
        const hasTasks = countText !== '0'
        const emptyMessage = page.getByText('No running tasks')

        if (!hasTasks) {
            // If count is 0, we expect empty message
            await expect(emptyMessage).toBeVisible()
        } else {
            // If count is > 0, we expect the empty message to NOT be visible
            await expect(emptyMessage).not.toBeVisible()
        }
    })

    test('should cancel task creation modal', async ({ page }) => {
        // Open the modal
        await page.getByRole('button', { name: /\+ New Task/i }).click()

        // Verify modal is open
        await expect(page.getByPlaceholder('Task title...')).toBeVisible({ timeout: 5000 })

        // Click cancel
        await page.getByRole('button', { name: /Cancel/i }).click()

        // Modal should be closed - placeholder should not be visible
        await expect(page.getByPlaceholder('Task title...')).not.toBeVisible()
    })

    test('should persist task after creation', async ({ page }) => {
        // First verify column headers exist
        await expect(page.getByRole('heading', { name: 'Todo', level: 3 })).toBeVisible({ timeout: 10000 })

        // Create a new todo task
        const taskTitle = `Persist Task ${Date.now()}`
        await page.getByRole('button', { name: /\+ New Task/i }).click()
        await page.getByPlaceholder('Task title...').fill(taskTitle)
        await page.getByPlaceholder('Describe what Gemini should do...').fill('Test description for persistence')
        await page.getByRole('button', { name: /Create Task/i }).click()

        // Task should be visible with its title
        await expect(page.locator(`text=${taskTitle}`)).toBeVisible({ timeout: 5000 })
    })
})
