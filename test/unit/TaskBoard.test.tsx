import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskBoard } from '../../src/components/TaskBoard'
import type { Task } from '../../src/components/TaskCard'

// Mock the Terminal component to avoid WebSocket complexity
vi.mock('../../src/components/Terminal', () => ({
    Terminal: () => <div data-testid="mock-terminal">Mock Terminal</div>,
}))

describe('TaskBoard', () => {
    const mockOnStartTask = vi.fn()
    const mockOnSelectTask = vi.fn()
    const mockOnConnectedChange = vi.fn()
    const mockWsRef = { current: null }

    const mockTasks: Task[] = [
        { id: '1', title: 'Todo Task', description: 'A todo task', status: 'todo' },
        { id: '2', title: 'Running Task', description: 'A running task', status: 'in_progress' },
        { id: '3', title: 'Done Task', description: 'A done task', status: 'done', exitCode: 0 },
    ]

    // Helper to set up fetch mock
    const setupFetchMock = (tasks: Task[] = mockTasks) => {
        vi.spyOn(global, 'fetch').mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(tasks),
        } as Response)
    }

    beforeEach(() => {
        vi.clearAllMocks()
        setupFetchMock()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('Kanban Columns', () => {
        it('should render three kanban columns', async () => {
            render(
                <TaskBoard
                    onStartTask={mockOnStartTask}
                    wsRef={mockWsRef}
                    onSelectTask={mockOnSelectTask}
                    onConnectedChange={mockOnConnectedChange}
                />
            )

            // Wait for loading to complete - look for column headers by h3 text
            await waitFor(() => {
                expect(screen.getByRole('heading', { name: 'Todo', level: 3 })).toBeInTheDocument()
            }, { timeout: 3000 })

            expect(screen.getByRole('heading', { name: 'Running', level: 3 })).toBeInTheDocument()
            expect(screen.getByRole('heading', { name: 'Done', level: 3 })).toBeInTheDocument()
        })

        it('should show task counts in column headers', async () => {
            render(
                <TaskBoard
                    onStartTask={mockOnStartTask}
                    wsRef={mockWsRef}
                    onSelectTask={mockOnSelectTask}
                    onConnectedChange={mockOnConnectedChange}
                />
            )

            // Wait for tasks to load
            await waitFor(() => {
                expect(screen.getByText('Todo Task')).toBeInTheDocument()
            }, { timeout: 3000 })

            // Each column should show count badge - look for the count numbers
            // There should be 1 todo, 1 running, 1 done
            const countBadges = screen.getAllByText('1')
            expect(countBadges.length).toBeGreaterThanOrEqual(3)
        })
    })

    describe('Task Loading', () => {
        it('should fetch tasks on mount', async () => {
            render(
                <TaskBoard
                    onStartTask={mockOnStartTask}
                    wsRef={mockWsRef}
                    onSelectTask={mockOnSelectTask}
                    onConnectedChange={mockOnConnectedChange}
                />
            )

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith('/api/tasks')
            })
        })

        it('should display loaded tasks', async () => {
            render(
                <TaskBoard
                    onStartTask={mockOnStartTask}
                    wsRef={mockWsRef}
                    onSelectTask={mockOnSelectTask}
                    onConnectedChange={mockOnConnectedChange}
                />
            )

            await waitFor(() => {
                expect(screen.getByText('Todo Task')).toBeInTheDocument()
                expect(screen.getByText('Running Task')).toBeInTheDocument()
                expect(screen.getByText('Done Task')).toBeInTheDocument()
            })
        })

        it('should handle fetch error gracefully', async () => {
            // First restore all mocks, then set up rejection BEFORE render
            vi.restoreAllMocks()
            vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'))

            render(
                <TaskBoard
                    onStartTask={mockOnStartTask}
                    wsRef={mockWsRef}
                    onSelectTask={mockOnSelectTask}
                    onConnectedChange={mockOnConnectedChange}
                />
            )

            // Should show empty state messages when fetch fails
            await waitFor(() => {
                expect(screen.getByText('No tasks to do')).toBeInTheDocument()
            }, { timeout: 3000 })

            expect(screen.getByText('No running tasks')).toBeInTheDocument()
            expect(screen.getByText('No completed tasks')).toBeInTheDocument()
        })
    })

    describe('Task Creation', () => {
        it('should show create form when button clicked', async () => {
            render(
                <TaskBoard
                    onStartTask={mockOnStartTask}
                    wsRef={mockWsRef}
                    onSelectTask={mockOnSelectTask}
                    onConnectedChange={mockOnConnectedChange}
                />
            )

            // Wait for the "+ New Task" button to be visible
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /\+ New Task/i })).toBeInTheDocument()
            }, { timeout: 3000 })

            // Click the button to open modal
            fireEvent.click(screen.getByRole('button', { name: /\+ New Task/i }))

            // Form should now be visible
            await waitFor(() => {
                expect(screen.getByPlaceholderText('Task title...')).toBeInTheDocument()
                expect(screen.getByPlaceholderText('Describe what Gemini should do...')).toBeInTheDocument()
            })
        })

        it('should create task when form submitted', async () => {
            const user = userEvent.setup()

            // Setup mock to return tasks first, then handle POST
            vi.restoreAllMocks()
            vi.spyOn(global, 'fetch').mockImplementation((url, options) => {
                if (options?.method === 'POST') {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({ id: '4', title: 'New Task', description: 'New desc', status: 'todo' }),
                    } as Response)
                }
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockTasks),
                } as Response)
            })

            render(
                <TaskBoard
                    onStartTask={mockOnStartTask}
                    wsRef={mockWsRef}
                    onSelectTask={mockOnSelectTask}
                    onConnectedChange={mockOnConnectedChange}
                />
            )

            // Wait for load and click new task
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /\+ New Task/i })).toBeInTheDocument()
            }, { timeout: 3000 })

            await user.click(screen.getByRole('button', { name: /\+ New Task/i }))

            await waitFor(() => {
                expect(screen.getByPlaceholderText('Task title...')).toBeInTheDocument()
            })

            await user.type(screen.getByPlaceholderText('Task title...'), 'New Task')
            await user.type(screen.getByPlaceholderText('Describe what Gemini should do...'), 'New desc')
            await user.click(screen.getByRole('button', { name: /Create Task/i }))

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith('/api/tasks', expect.objectContaining({
                    method: 'POST',
                }))
            })
        })
    })

    describe('Task Deletion', () => {
        it('should delete task when delete button clicked', async () => {
            // Setup mock to handle both GET and DELETE
            vi.restoreAllMocks()
            vi.spyOn(global, 'fetch').mockImplementation((url, options) => {
                if (options?.method === 'DELETE') {
                    return Promise.resolve({ ok: true } as Response)
                }
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockTasks),
                } as Response)
            })

            render(
                <TaskBoard
                    onStartTask={mockOnStartTask}
                    wsRef={mockWsRef}
                    onSelectTask={mockOnSelectTask}
                    onConnectedChange={mockOnConnectedChange}
                />
            )

            await waitFor(() => {
                expect(screen.getByText('Todo Task')).toBeInTheDocument()
            })

            // Find and click delete button (✕)
            const deleteButtons = screen.getAllByText('✕')
            fireEvent.click(deleteButtons[0])

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith('/api/tasks/1', expect.objectContaining({
                    method: 'DELETE',
                }))
            })
        })
    })

    describe('Task Selection', () => {
        it('should call onSelectTask when task card clicked', async () => {
            render(
                <TaskBoard
                    onStartTask={mockOnStartTask}
                    wsRef={mockWsRef}
                    onSelectTask={mockOnSelectTask}
                    onConnectedChange={mockOnConnectedChange}
                />
            )

            await waitFor(() => {
                expect(screen.getByText('Todo Task')).toBeInTheDocument()
            })

            fireEvent.click(screen.getByText('Todo Task'))

            expect(mockOnSelectTask).toHaveBeenCalledWith(mockTasks[0])
        })
    })

    describe('Modal Controls', () => {
        it('should close modal when cancel is clicked', async () => {
            const user = userEvent.setup()

            render(
                <TaskBoard
                    onStartTask={mockOnStartTask}
                    wsRef={mockWsRef}
                    onSelectTask={mockOnSelectTask}
                    onConnectedChange={mockOnConnectedChange}
                />
            )

            // Wait and open modal
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /\+ New Task/i })).toBeInTheDocument()
            }, { timeout: 3000 })

            await user.click(screen.getByRole('button', { name: /\+ New Task/i }))

            // Verify modal is open
            await waitFor(() => {
                expect(screen.getByPlaceholderText('Task title...')).toBeInTheDocument()
            })

            // Click Cancel
            await user.click(screen.getByRole('button', { name: /Cancel/i }))

            // Modal should be closed
            await waitFor(() => {
                expect(screen.queryByPlaceholderText('Task title...')).not.toBeInTheDocument()
            })
        })
    })
})
