import { test, expect } from '@playwright/test'

test.describe('Task Flow E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the app
        await page.goto('/')

        // Wait for initial load - the app title should be visible
        await expect(page.getByRole('heading', { name: 'Gemini Kanban Board' })).toBeVisible({ timeout: 10000 })
    })

    test('should display the header correctly', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Gemini Kanban Board' })).toBeVisible()
    })

    test('should show connection status', async ({ page }) => {
        // Should show either Connected or Disconnected
        await expect(page.locator('text=Connected').or(page.locator('text=Disconnected'))).toBeVisible()

        // Wait for connection
        await expect(page.locator('text=Connected')).toBeVisible({ timeout: 10000 })
    })

    test('should display Kanban board with three columns', async ({ page }) => {
        // Wait for the board to load - columns use status icons
        await expect(page.locator('h3:has-text("Todo")')).toBeVisible({ timeout: 10000 })
        await expect(page.locator('h3:has-text("Running")')).toBeVisible()
        await expect(page.locator('h3:has-text("Done")')).toBeVisible()
    })

    test('should have new task button', async ({ page }) => {
        await expect(page.getByRole('button', { name: /\+ New Task/i })).toBeVisible({ timeout: 10000 })
    })

    test('should open task creation modal', async ({ page }) => {
        // Click the new task button
        await page.getByRole('button', { name: /\+ New Task/i }).click()

        // Modal should appear with form
        await expect(page.getByPlaceholder(/Task title/i)).toBeVisible({ timeout: 5000 })
        await expect(page.getByPlaceholder(/Describe what Gemini/i)).toBeVisible()
        await expect(page.getByRole('button', { name: /Create Task/i })).toBeVisible()
        await expect(page.getByRole('button', { name: /Cancel/i })).toBeVisible()
    })

    test('should create a new task', async ({ page }) => {
        const taskTitle = `E2E Test Task ${Date.now()}`

        // Open the modal
        await page.getByRole('button', { name: /\+ New Task/i }).click()

        // Fill in the form
        await page.getByPlaceholder(/Task title/i).fill(taskTitle)
        await page.getByPlaceholder(/Describe what Gemini/i).fill('Created by E2E test')

        // Submit
        await page.getByRole('button', { name: /Create Task/i }).click()

        // Verify task appears in Todo column
        await expect(page.locator(`text=${taskTitle}`)).toBeVisible({ timeout: 5000 })
    })

    test('should show task details when clicking a task', async ({ page }) => {
        const taskTitle = `Detail Task ${Date.now()}`

        // Create a task first
        await page.getByRole('button', { name: /\+ New Task/i }).click()
        await page.getByPlaceholder(/Task title/i).fill(taskTitle)
        await page.getByPlaceholder(/Describe what Gemini/i).fill('Task for detail test')
        await page.getByRole('button', { name: /Create Task/i }).click()

        // Wait for task to appear and modal to close
        await expect(page.locator(`text=${taskTitle}`)).toBeVisible({ timeout: 5000 })

        // Click on the task
        await page.locator(`text=${taskTitle}`).click()

        // Should see terminal view with task header and back button
        await expect(page.locator('text=← Back')).toBeVisible({ timeout: 5000 })
    })

    test('should navigate back to board from task view', async ({ page }) => {
        const taskTitle = `Nav Task ${Date.now()}`

        // Create and select a task
        await page.getByRole('button', { name: /\+ New Task/i }).click()
        await page.getByPlaceholder(/Task title/i).fill(taskTitle)
        await page.getByRole('button', { name: /Create Task/i }).click()
        await page.locator(`text=${taskTitle}`).click()

        // Verify we're in task view
        await expect(page.locator('text=← Back')).toBeVisible({ timeout: 5000 })

        // Click back
        await page.locator('text=← Back').click()

        // Should be back at board with the New Task button visible
        await expect(page.getByRole('button', { name: /\+ New Task/i })).toBeVisible()
        await expect(page.locator('text=← Back')).not.toBeVisible()
    })

    test('should show path autocomplete suggestions', async ({ page }) => {
        // Open modal
        await page.getByRole('button', { name: /\+ New Task/i }).click()

        // Type in working directory - use "/" as the prefix which works on all Unix-like systems
        const workingDirInput = page.getByPlaceholder('/path/to/project')
        await workingDirInput.fill('/')

        // Wait for dropdown - look for any suggestion with the folder emoji prefix
        // The dropdown items in PathAutocomplete are buttons with "📁 {suggestion}"
        const suggestionButton = page.locator('button:has-text("📁")').first()
        await expect(suggestionButton).toBeVisible({ timeout: 5000 })

        // Get the suggestion text to verify selection works
        const suggestionText = await suggestionButton.textContent()
        const expectedPath = suggestionText?.replace('📁 ', '').trim() || ''

        // Click suggestion
        await suggestionButton.click()

        // Verify input value became the selected path
        await expect(workingDirInput).toHaveValue(expectedPath)
    })
})
