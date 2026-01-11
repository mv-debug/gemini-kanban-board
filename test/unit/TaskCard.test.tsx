import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TaskCard, type Task } from '../../src/components/TaskCard'

describe('TaskCard', () => {
    const mockOnRun = vi.fn()
    const mockOnDelete = vi.fn()
    const mockOnClick = vi.fn()

    const createTask = (overrides: Partial<Task> = {}): Task => ({
        id: 'task-1',
        title: 'Test Task',
        description: 'Test description',
        status: 'todo',
        ...overrides,
    })

    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('Rendering', () => {
        it('should render task title', () => {
            render(
                <TaskCard
                    task={createTask({ title: 'My Task Title' })}
                    onRun={mockOnRun}
                    onDelete={mockOnDelete}
                    onClick={mockOnClick}
                />
            )
            expect(screen.getByText('My Task Title')).toBeInTheDocument()
        })

        it('should render task description', () => {
            render(
                <TaskCard
                    task={createTask({ description: 'My task description' })}
                    onRun={mockOnRun}
                    onDelete={mockOnDelete}
                    onClick={mockOnClick}
                />
            )
            expect(screen.getByText('My task description')).toBeInTheDocument()
        })

        it('should not render description if empty', () => {
            render(
                <TaskCard
                    task={createTask({ description: '' })}
                    onRun={mockOnRun}
                    onDelete={mockOnDelete}
                    onClick={mockOnClick}
                />
            )
            expect(screen.queryByText('Test description')).not.toBeInTheDocument()
        })
    })

    describe('Status Badge', () => {
        it('should display "Todo" for todo status', () => {
            render(
                <TaskCard
                    task={createTask({ status: 'todo' })}
                    onRun={mockOnRun}
                    onDelete={mockOnDelete}
                    onClick={mockOnClick}
                />
            )
            expect(screen.getByText('Todo')).toBeInTheDocument()
            expect(screen.getByText('○')).toBeInTheDocument()
        })

        it('should display "Running" for in_progress status', () => {
            render(
                <TaskCard
                    task={createTask({ status: 'in_progress' })}
                    onRun={mockOnRun}
                    onDelete={mockOnDelete}
                    onClick={mockOnClick}
                />
            )
            expect(screen.getByText('Running')).toBeInTheDocument()
            expect(screen.getByText('◐')).toBeInTheDocument()
        })

        it('should display "Done" for done status', () => {
            render(
                <TaskCard
                    task={createTask({ status: 'done' })}
                    onRun={mockOnRun}
                    onDelete={mockOnDelete}
                    onClick={mockOnClick}
                />
            )
            expect(screen.getByText('Done')).toBeInTheDocument()
            expect(screen.getByText('●')).toBeInTheDocument()
        })

        it('should show exit code when done with exitCode', () => {
            render(
                <TaskCard
                    task={createTask({ status: 'done', exitCode: 0 })}
                    onRun={mockOnRun}
                    onDelete={mockOnDelete}
                    onClick={mockOnClick}
                />
            )
            expect(screen.getByText(/exit: 0/)).toBeInTheDocument()
        })

        it('should show non-zero exit code with different styling', () => {
            render(
                <TaskCard
                    task={createTask({ status: 'done', exitCode: 1 })}
                    onRun={mockOnRun}
                    onDelete={mockOnDelete}
                    onClick={mockOnClick}
                />
            )
            expect(screen.getByText(/exit: 1/)).toBeInTheDocument()
        })
    })

    describe('Run Button', () => {
        it('should show Run button for todo tasks', () => {
            render(
                <TaskCard
                    task={createTask({ status: 'todo' })}
                    onRun={mockOnRun}
                    onDelete={mockOnDelete}
                    onClick={mockOnClick}
                />
            )
            expect(screen.getByRole('button', { name: /Run/i })).toBeInTheDocument()
        })

        it('should not show Run button for in_progress tasks', () => {
            render(
                <TaskCard
                    task={createTask({ status: 'in_progress' })}
                    onRun={mockOnRun}
                    onDelete={mockOnDelete}
                    onClick={mockOnClick}
                />
            )
            expect(screen.queryByRole('button', { name: /Run/i })).not.toBeInTheDocument()
        })

        it('should not show Run button for done tasks', () => {
            render(
                <TaskCard
                    task={createTask({ status: 'done' })}
                    onRun={mockOnRun}
                    onDelete={mockOnDelete}
                    onClick={mockOnClick}
                />
            )
            expect(screen.queryByRole('button', { name: /Run/i })).not.toBeInTheDocument()
        })

        it('should call onRun with task when Run button clicked', () => {
            const task = createTask({ status: 'todo' })
            render(
                <TaskCard
                    task={task}
                    onRun={mockOnRun}
                    onDelete={mockOnDelete}
                    onClick={mockOnClick}
                />
            )
            fireEvent.click(screen.getByRole('button', { name: /Run/i }))
            expect(mockOnRun).toHaveBeenCalledWith(task)
            expect(mockOnClick).not.toHaveBeenCalled() // Should stop propagation
        })
    })

    describe('Delete Button', () => {
        it('should call onDelete when delete button clicked', () => {
            const task = createTask({ id: 'task-123' })
            render(
                <TaskCard
                    task={task}
                    onRun={mockOnRun}
                    onDelete={mockOnDelete}
                    onClick={mockOnClick}
                />
            )
            fireEvent.click(screen.getByText('✕'))
            expect(mockOnDelete).toHaveBeenCalledWith('task-123')
            expect(mockOnClick).not.toHaveBeenCalled() // Should stop propagation
        })
    })

    describe('Card Click', () => {
        it('should call onClick when card is clicked', () => {
            render(
                <TaskCard
                    task={createTask()}
                    onRun={mockOnRun}
                    onDelete={mockOnDelete}
                    onClick={mockOnClick}
                />
            )
            fireEvent.click(screen.getByText('Test Task'))
            expect(mockOnClick).toHaveBeenCalled()
        })
    })

    describe('Working Directory', () => {
        it('should show working directory when set', () => {
            render(
                <TaskCard
                    task={createTask({ workingDirectory: '/home/user/project' })}
                    onRun={mockOnRun}
                    onDelete={mockOnDelete}
                    onClick={mockOnClick}
                />
            )
            expect(screen.getByText('📂 /home/user/project')).toBeInTheDocument()
        })

        it('should not show working directory when not set', () => {
            render(
                <TaskCard
                    task={createTask({ workingDirectory: undefined })}
                    onRun={mockOnRun}
                    onDelete={mockOnDelete}
                    onClick={mockOnClick}
                />
            )
            expect(screen.queryByText(/📂/)).not.toBeInTheDocument()
        })
    })

    describe('Run Directory', () => {
        it('should show run directory when set and no working directory', () => {
            render(
                <TaskCard
                    task={createTask({ runDir: '/path/to/runs/task-123_1234567890' })}
                    onRun={mockOnRun}
                    onDelete={mockOnDelete}
                    onClick={mockOnClick}
                />
            )
            expect(screen.getByText('📁 task-123_1234567890')).toBeInTheDocument()
        })

        it('should not show run directory when working directory is set', () => {
            render(
                <TaskCard
                    task={createTask({
                        workingDirectory: '/home/user/project',
                        runDir: '/path/to/runs/task-123_1234567890'
                    })}
                    onRun={mockOnRun}
                    onDelete={mockOnDelete}
                    onClick={mockOnClick}
                />
            )
            // Should show workingDirectory, not runDir
            expect(screen.getByText('📂 /home/user/project')).toBeInTheDocument()
            expect(screen.queryByText('📁 task-123_1234567890')).not.toBeInTheDocument()
        })
    })
})
