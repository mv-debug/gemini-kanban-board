import { test, expect } from '@playwright/test'

test.describe('Mobile E2E Tests', () => {
    test.use({ viewport: { width: 375, height: 667 } }) // iPhone SE size

    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await expect(page.getByRole('heading', { name: 'Gemini Kanban Board' })).toBeVisible({ timeout: 10000 })
    })

    test('should stack columns vertically', async ({ page }) => {
        // Wait for headers
        const todoHeader = page.getByRole('heading', { name: 'Todo', level: 3 })
        const runningHeader = page.getByRole('heading', { name: 'Running', level: 3 })
        const doneHeader = page.getByRole('heading', { name: 'Done', level: 3 })

        await expect(todoHeader).toBeVisible()
        await expect(runningHeader).toBeVisible()

        // Get positions
        const todoBox = await todoHeader.boundingBox()
        const runningBox = await runningHeader.boundingBox()
        const doneBox = await doneHeader.boundingBox()

        // Verify stacking: Running should be strictly below Todo
        expect(runningBox!.y).toBeGreaterThan(todoBox!.y + todoBox!.height)

        // Verify stacking: Done should be strictly below Running
        expect(doneBox!.y).toBeGreaterThan(runningBox!.y + runningBox!.height)

        // Verify full width usage (allow some margin/padding)
        expect(todoBox!.x).toBeLessThan(50) // Should start near left edge
    })

    test('should create task in mobile view', async ({ page }) => {
        const taskTitle = `Mobile Task ${Date.now()}`

        // Click new task (button should be visible and clickable)
        await page.getByRole('button', { name: /\+ New Task/i }).click()

        // Check modal visibility
        const input = page.getByPlaceholder('Task title...')
        await expect(input).toBeVisible()

        // Fill and create
        await input.fill(taskTitle)
        await page.getByRole('button', { name: /Create Task/i }).click()

        // Verify task exists
        await expect(page.locator(`text=${taskTitle}`)).toBeVisible()
    })
})
