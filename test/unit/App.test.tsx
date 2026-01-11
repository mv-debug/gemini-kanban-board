import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../../src/App'

// Mock the child components to isolate App testing
vi.mock('../../src/components/Terminal', () => ({
    Terminal: ({ onConnected }: { onConnected?: () => void }) => {
        // Simulate connection on mount
        setTimeout(() => onConnected?.(), 0)
        return <div data-testid="terminal">Terminal Mock</div>
    },
}))

vi.mock('../../src/components/TaskBoard', () => ({
    TaskBoard: ({
        onSelectTask,
        onConnectedChange
    }: {
        onSelectTask: (task: unknown) => void
        onConnectedChange: (connected: boolean) => void
    }) => {
        // Simulate connection on mount
        setTimeout(() => onConnectedChange(true), 0)
        return (
            <div data-testid="task-board">
                <button
                    onClick={() =>
                        onSelectTask({
                            id: 'test-1',
                            title: 'Test Task',
                            description: 'Test description',
                            status: 'todo',
                        })
                    }
                >
                    Select Task
                </button>
                TaskBoard Mock
            </div>
        )
    },
}))

describe('App', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('Header', () => {
        it('should render Gemini Kanban Board logo and title', () => {
            render(<App />)

            expect(screen.getByText('Gemini Kanban Board')).toBeInTheDocument()
            expect(screen.getByText('G')).toBeInTheDocument()
        })

        it('should show connection status indicator', async () => {
            render(<App />)

            // Initially might be disconnected
            expect(screen.getByText(/Disconnected|Connected/)).toBeInTheDocument()

            // After mock connects
            await waitFor(() => {
                expect(screen.getByText('Connected')).toBeInTheDocument()
            })
        })
    })

    describe('Task Selection', () => {
        it('should show TaskBoard initially', () => {
            render(<App />)

            expect(screen.getByTestId('task-board')).toBeInTheDocument()
            expect(screen.queryByTestId('terminal')).not.toBeInTheDocument()
        })

        it('should show Terminal when task is selected', async () => {
            render(<App />)

            // Click the mock select button
            fireEvent.click(screen.getByText('Select Task'))

            await waitFor(() => {
                expect(screen.getByTestId('terminal')).toBeInTheDocument()
                expect(screen.queryByTestId('task-board')).not.toBeInTheDocument()
            })
        })

        it('should show task header when task is selected', async () => {
            render(<App />)

            fireEvent.click(screen.getByText('Select Task'))

            await waitFor(() => {
                expect(screen.getByText('Test Task')).toBeInTheDocument()
                expect(screen.getByText('Test description')).toBeInTheDocument()
            })
        })
    })

    describe('Navigation', () => {
        it('should show Back button when task is selected', async () => {
            render(<App />)

            fireEvent.click(screen.getByText('Select Task'))

            await waitFor(() => {
                expect(screen.getByText('← Back')).toBeInTheDocument()
            })
        })

        it('should return to TaskBoard when Back is clicked', async () => {
            render(<App />)

            // Select a task
            fireEvent.click(screen.getByText('Select Task'))

            await waitFor(() => {
                expect(screen.getByTestId('terminal')).toBeInTheDocument()
            })

            // Click back
            fireEvent.click(screen.getByText('← Back'))

            await waitFor(() => {
                expect(screen.getByTestId('task-board')).toBeInTheDocument()
                expect(screen.queryByTestId('terminal')).not.toBeInTheDocument()
            })
        })

        it('should hide Back button when no task is selected', () => {
            render(<App />)

            expect(screen.queryByText('← Back')).not.toBeInTheDocument()
        })
    })

    describe('Task Status Display', () => {
        it('should show "Starting..." for todo status', async () => {
            render(<App />)

            fireEvent.click(screen.getByText('Select Task'))

            await waitFor(() => {
                expect(screen.getByText('Starting...')).toBeInTheDocument()
            })
        })
    })
})
