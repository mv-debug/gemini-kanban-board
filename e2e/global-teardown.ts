import { join, dirname } from 'path'
import { rmSync } from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function globalTeardown() {
    const tasksFile = join(__dirname, '..', '.data', 'tasks.json')
    try {
        rmSync(tasksFile, { force: true })
        console.log('✓ Cleaned up tasks.json')
    } catch {
        // Ignore if file doesn't exist
    }
}

export default globalTeardown
