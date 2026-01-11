import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import userEvent from '@testing-library/user-event'
import { PathAutocomplete } from '../../src/components/PathAutocomplete'

describe('PathAutocomplete', () => {
    const mockOnChange = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('should render input with correct props', () => {
        render(
            <PathAutocomplete
                value=""
                onChange={mockOnChange}
                placeholder="/test/path"
                className="test-class"
            />
        )

        const input = screen.getByPlaceholderText('/test/path')
        expect(input).toBeInTheDocument()
        expect(input).toHaveClass('test-class')
        expect(input).toHaveValue('')
    })

    it('should call onChange with correct values', async () => {
        const user = userEvent.setup()

        function Wrapper() {
            const [val, setVal] = useState('')
            return <PathAutocomplete value={val} onChange={(v) => {
                setVal(v)
                mockOnChange(v)
            }} />
        }

        render(<Wrapper />)

        const input = screen.getByRole('textbox')
        await user.type(input, '/usr')

        expect(mockOnChange).toHaveBeenCalledWith('/')
        expect(mockOnChange).toHaveBeenCalledWith('/u')
        expect(mockOnChange).toHaveBeenCalledWith('/us')
        expect(mockOnChange).toHaveBeenCalledWith('/usr')
    })

    it('should fetch suggestions after debounce', async () => {
        const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                suggestions: ['/usr/bin', '/usr/local'],
                isValid: true,
                parentExists: true
            })
        } as Response)

        render(
            <PathAutocomplete
                value="/usr"
                onChange={mockOnChange}
            />
        )

        const input = screen.getByRole('textbox')
        input.focus()

        // Wait for debounce (300ms) + fetch
        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith('/api/directories?path=%2Fusr')
        }, { timeout: 1000 })
    })

    it('should show suggestions dropdown', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                suggestions: ['/test/dir1', '/test/dir2'],
                isValid: true,
                parentExists: true
            })
        } as Response)

        render(
            <PathAutocomplete
                value="/test"
                onChange={mockOnChange}
            />
        )

        const input = screen.getByRole('textbox')
        input.focus()

        await waitFor(() => {
            expect(screen.getByText('📁 /test/dir1')).toBeInTheDocument()
            expect(screen.getByText('📁 /test/dir2')).toBeInTheDocument()
        }, { timeout: 1000 })
    })

    it('should select suggestion on click', async () => {
        const user = userEvent.setup()
        vi.spyOn(global, 'fetch').mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                suggestions: ['/test/dir1'],
                isValid: true,
                parentExists: true
            })
        } as Response)

        render(
            <PathAutocomplete
                value="/test"
                onChange={mockOnChange}
            />
        )

        const input = screen.getByRole('textbox')
        input.focus()

        await waitFor(() => {
            expect(screen.getByText('📁 /test/dir1')).toBeInTheDocument()
        }, { timeout: 1000 })

        await user.click(screen.getByText('📁 /test/dir1'))

        expect(mockOnChange).toHaveBeenCalledWith('/test/dir1')
    })
})
