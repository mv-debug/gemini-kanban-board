import { useState, useEffect, useRef, useCallback } from 'react';

interface PathAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

interface DirectoriesResponse {
    suggestions: string[];
    isValid: boolean;
    parentExists: boolean;
}

export function PathAutocomplete({
    value,
    onChange,
    placeholder = '/path/to/project',
    className = '',
}: PathAutocompleteProps) {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Fetch suggestions from API
    const fetchSuggestions = useCallback(async (path: string) => {
        if (!path || path.length < 1) {
            setSuggestions([]);
            setIsOpen(false);
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`/api/directories?path=${encodeURIComponent(path)}`);
            if (response.ok) {
                const data: DirectoriesResponse = await response.json();
                setSuggestions(data.suggestions);
                setIsOpen(data.suggestions.length > 0);
                setSelectedIndex(-1);
            }
        } catch (error) {
            console.error('Failed to fetch directory suggestions:', error);
            setSuggestions([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Debounced fetch on value change
    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            fetchSuggestions(value);
        }, 300);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [value, fetchSuggestions]);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                inputRef.current &&
                !inputRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (path: string) => {
        onChange(path);
        setIsOpen(false);
        setSelectedIndex(-1);
        // Trigger new suggestions for the selected directory
        setTimeout(() => fetchSuggestions(path + '/'), 100);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen || suggestions.length === 0) {
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex((prev) =>
                    prev < suggestions.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex((prev) =>
                    prev > 0 ? prev - 1 : suggestions.length - 1
                );
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
                    handleSelect(suggestions[selectedIndex]);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setSelectedIndex(-1);
                break;
            case 'Tab':
                setIsOpen(false);
                setSelectedIndex(-1);
                break;
        }
    };

    return (
        <div className="relative">
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => value && fetchSuggestions(value)}
                placeholder={placeholder}
                className={className}
                autoComplete="off"
            />

            {/* Loading indicator */}
            {isLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {/* Dropdown */}
            {isOpen && suggestions.length > 0 && (
                <div
                    ref={dropdownRef}
                    className="absolute z-50 w-full mt-1 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg shadow-xl max-h-[200px] overflow-y-auto"
                >
                    {suggestions.map((suggestion, index) => (
                        <button
                            key={suggestion}
                            type="button"
                            onClick={() => handleSelect(suggestion)}
                            onMouseEnter={() => setSelectedIndex(index)}
                            className={`w-full text-left px-3 py-2 text-sm font-mono truncate transition-colors ${index === selectedIndex
                                ? 'bg-[var(--accent)] text-[var(--bg-primary)]'
                                : 'text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                                }`}
                        >
                            📁 {suggestion}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
