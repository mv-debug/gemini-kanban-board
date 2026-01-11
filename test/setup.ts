import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Cleanup after each test
afterEach(() => {
    cleanup()
})

// Mock WebSocket
class MockWebSocket {
    static CONNECTING = 0
    static OPEN = 1
    static CLOSING = 2
    static CLOSED = 3

    readyState = MockWebSocket.OPEN
    url: string
    onopen: (() => void) | null = null
    onclose: (() => void) | null = null
    onmessage: ((event: { data: string }) => void) | null = null
    onerror: ((error: unknown) => void) | null = null

    constructor(url: string) {
        this.url = url
        // Simulate async connection
        setTimeout(() => {
            this.readyState = MockWebSocket.OPEN
            this.onopen?.()
        }, 0)
    }

    send = vi.fn()
    close = vi.fn(() => {
        this.readyState = MockWebSocket.CLOSED
        this.onclose?.()
    })

    addEventListener = vi.fn()
    removeEventListener = vi.fn()

    // Helper to simulate receiving messages
    simulateMessage(data: unknown) {
        this.onmessage?.({ data: JSON.stringify(data) })
    }
}

vi.stubGlobal('WebSocket', MockWebSocket)

// Mock ResizeObserver
class MockResizeObserver {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
}

vi.stubGlobal('ResizeObserver', MockResizeObserver)

// Mock xterm.js Terminal - using class syntax for Vitest 4.x
class MockTerminal {
    loadAddon = vi.fn()
    open = vi.fn()
    write = vi.fn()
    writeln = vi.fn()
    onData = vi.fn()
    dispose = vi.fn()
    cols = 80
    rows = 24
}

vi.mock('@xterm/xterm', () => ({
    Terminal: MockTerminal,
}))

// Mock xterm addons - using class syntax
class MockFitAddon {
    fit = vi.fn()
}

vi.mock('@xterm/addon-fit', () => ({
    FitAddon: MockFitAddon,
}))

class MockWebLinksAddon { }

vi.mock('@xterm/addon-web-links', () => ({
    WebLinksAddon: MockWebLinksAddon,
}))

// Mock CSS import
vi.mock('@xterm/xterm/css/xterm.css', () => ({}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
})
