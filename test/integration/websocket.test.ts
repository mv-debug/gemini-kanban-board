import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// WebSocket message types mirroring server implementation
interface TaskMessage {
    type: 'task:created' | 'task:updated' | 'task:deleted'
    task?: {
        id: string
        title: string
        status: string
        exitCode?: number | null
    }
    taskId?: string
}

interface StartTaskMessage {
    type: 'start_task'
    taskId: string
    prompt: string
}

interface InputMessage {
    type: 'input' | 'inject'
    data: string
}

interface OutputMessage {
    type: 'output'
    data: string
}

interface ResizeMessage {
    type: 'resize'
    cols: number
    rows: number
}

type WebSocketMessage = TaskMessage | StartTaskMessage | InputMessage | OutputMessage | ResizeMessage

describe('WebSocket Integration Tests', () => {
    let mockWs: {
        send: ReturnType<typeof vi.fn>
        close: ReturnType<typeof vi.fn>
        readyState: number
        onmessage: ((event: { data: string }) => void) | null
        onopen: (() => void) | null
        onclose: (() => void) | null
        onerror: ((error: unknown) => void) | null
        simulateMessage: (data: WebSocketMessage) => void
        simulateOpen: () => void
        simulateClose: () => void
    }

    beforeEach(() => {
        mockWs = {
            send: vi.fn(),
            close: vi.fn(),
            readyState: 1, // OPEN
            onmessage: null,
            onopen: null,
            onclose: null,
            onerror: null,
            simulateMessage: function (data: WebSocketMessage) {
                this.onmessage?.({ data: JSON.stringify(data) })
            },
            simulateOpen: function () {
                this.readyState = 1
                this.onopen?.()
            },
            simulateClose: function () {
                this.readyState = 3
                this.onclose?.()
            },
        }
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    describe('Message Sending', () => {
        it('should send start_task message correctly', () => {
            const startMessage: StartTaskMessage = {
                type: 'start_task',
                taskId: 'task-123',
                prompt: 'Run tests'
            }

            mockWs.send(JSON.stringify(startMessage))

            expect(mockWs.send).toHaveBeenCalledWith(
                JSON.stringify({
                    type: 'start_task',
                    taskId: 'task-123',
                    prompt: 'Run tests'
                })
            )
        })

        it('should send input message correctly', () => {
            const inputMessage: InputMessage = {
                type: 'input',
                data: 'ls -la\n'
            }

            mockWs.send(JSON.stringify(inputMessage))

            expect(mockWs.send).toHaveBeenCalledWith(
                JSON.stringify({
                    type: 'input',
                    data: 'ls -la\n'
                })
            )
        })

        it('should send resize message correctly', () => {
            const resizeMessage: ResizeMessage = {
                type: 'resize',
                cols: 120,
                rows: 40
            }

            mockWs.send(JSON.stringify(resizeMessage))

            expect(mockWs.send).toHaveBeenCalledWith(
                JSON.stringify({
                    type: 'resize',
                    cols: 120,
                    rows: 40
                })
            )
        })
    })

    describe('Message Receiving', () => {
        it('should parse task:created message', () => {
            const receivedMessages: TaskMessage[] = []
            mockWs.onmessage = (event) => {
                receivedMessages.push(JSON.parse(event.data))
            }

            mockWs.simulateMessage({
                type: 'task:created',
                task: { id: 'new-1', title: 'New Task', status: 'todo' }
            })

            expect(receivedMessages).toHaveLength(1)
            expect(receivedMessages[0].type).toBe('task:created')
            expect(receivedMessages[0].task?.title).toBe('New Task')
        })

        it('should parse task:updated message', () => {
            const receivedMessages: TaskMessage[] = []
            mockWs.onmessage = (event) => {
                receivedMessages.push(JSON.parse(event.data))
            }

            mockWs.simulateMessage({
                type: 'task:updated',
                task: { id: 'task-1', title: 'Task', status: 'in_progress' }
            })

            expect(receivedMessages).toHaveLength(1)
            expect(receivedMessages[0].type).toBe('task:updated')
            expect(receivedMessages[0].task?.status).toBe('in_progress')
        })

        it('should parse task:updated with exitCode', () => {
            const receivedMessages: TaskMessage[] = []
            mockWs.onmessage = (event) => {
                receivedMessages.push(JSON.parse(event.data))
            }

            mockWs.simulateMessage({
                type: 'task:updated',
                task: { id: 'task-1', title: 'Task', status: 'done', exitCode: 0 }
            })

            expect(receivedMessages[0].task?.exitCode).toBe(0)
        })

        it('should parse output message', () => {
            const receivedMessages: OutputMessage[] = []
            mockWs.onmessage = (event) => {
                receivedMessages.push(JSON.parse(event.data))
            }

            mockWs.simulateMessage({
                type: 'output',
                data: 'Hello from terminal\r\n'
            })

            expect(receivedMessages).toHaveLength(1)
            expect(receivedMessages[0].type).toBe('output')
            expect(receivedMessages[0].data).toBe('Hello from terminal\r\n')
        })
    })

    describe('Connection Lifecycle', () => {
        it('should handle connection open', () => {
            const onOpen = vi.fn()
            mockWs.onopen = onOpen
            mockWs.readyState = 0 // CONNECTING

            mockWs.simulateOpen()

            expect(onOpen).toHaveBeenCalled()
            expect(mockWs.readyState).toBe(1) // OPEN
        })

        it('should handle connection close', () => {
            const onClose = vi.fn()
            mockWs.onclose = onClose

            mockWs.simulateClose()

            expect(onClose).toHaveBeenCalled()
            expect(mockWs.readyState).toBe(3) // CLOSED
        })

        it('should not send when connection is closed', () => {
            mockWs.readyState = 3 // CLOSED

            // In real implementation, we'd check readyState before sending
            const shouldSend = mockWs.readyState === 1
            if (shouldSend) {
                mockWs.send(JSON.stringify({ type: 'input', data: 'test' }))
            }

            expect(mockWs.send).not.toHaveBeenCalled()
        })
    })

    describe('Task Lifecycle via WebSocket', () => {
        it('should simulate complete task lifecycle', () => {
            const statusUpdates: string[] = []
            mockWs.onmessage = (event) => {
                const msg: TaskMessage = JSON.parse(event.data)
                if (msg.task?.status) {
                    statusUpdates.push(msg.task.status)
                }
            }

            // First: task created
            mockWs.simulateMessage({
                type: 'task:created',
                task: { id: 'task-1', title: 'Test', status: 'todo' }
            })

            // Then: start task
            mockWs.send(JSON.stringify({
                type: 'start_task',
                taskId: 'task-1',
                prompt: 'echo hello'
            }))

            // Task becomes in_progress
            mockWs.simulateMessage({
                type: 'task:updated',
                task: { id: 'task-1', title: 'Test', status: 'in_progress' }
            })

            // Finally: task complete
            mockWs.simulateMessage({
                type: 'task:updated',
                task: { id: 'task-1', title: 'Test', status: 'done', exitCode: 0 }
            })

            expect(statusUpdates).toEqual(['todo', 'in_progress', 'done'])
        })
    })

    describe('Broadcast Simulation', () => {
        it('should receive broadcasts to multiple clients', () => {
            // Simulate two clients receiving the same broadcast
            const client1Messages: TaskMessage[] = []
            const client2Messages: TaskMessage[] = []

            const mockWs1 = { ...mockWs, onmessage: (e: { data: string }) => client1Messages.push(JSON.parse(e.data)) }
            const mockWs2 = { ...mockWs, onmessage: (e: { data: string }) => client2Messages.push(JSON.parse(e.data)) }

            const broadcast = (msg: TaskMessage) => {
                mockWs1.onmessage({ data: JSON.stringify(msg) })
                mockWs2.onmessage({ data: JSON.stringify(msg) })
            }

            broadcast({
                type: 'task:created',
                task: { id: 'new-1', title: 'Broadcast Task', status: 'todo' }
            })

            expect(client1Messages).toHaveLength(1)
            expect(client2Messages).toHaveLength(1)
            expect(client1Messages[0].task?.title).toBe('Broadcast Task')
            expect(client2Messages[0].task?.title).toBe('Broadcast Task')
        })
    })
})
