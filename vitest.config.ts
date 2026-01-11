import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'happy-dom',
        setupFiles: ['./test/setup.ts'],
        include: ['test/**/*.test.{ts,tsx}'],
        // Exclude integration tests by default unless RUN_INTEGRATION_TESTS is set
        exclude: process.env.RUN_INTEGRATION_TESTS
            ? []
            : ['test/integration/**'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            include: ['src/**/*.{ts,tsx}'],
            exclude: ['src/main.tsx', 'src/vite-env.d.ts'],
        },
    },
})
