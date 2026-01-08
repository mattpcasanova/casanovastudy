"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface AutocompleteInputProps {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  fieldName: 'studentFirstName' | 'studentLastName' | 'className' | 'classPeriod' | 'examTitle'
  userId?: string | null
}

export function AutocompleteInput({
  id,
  value,
  onChange,
  placeholder,
  disabled,
  className,
  fieldName,
  userId
}: AutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [isLoading, setIsLoading] = useState(false)
  const [allSuggestions, setAllSuggestions] = useState<string[]>([])
  const [hasFetched, setHasFetched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch suggestions lazily when input is first focused
  const fetchSuggestionsIfNeeded = useCallback(async () => {
    if (hasFetched || isLoading || !userId) return

    try {
      setIsLoading(true)
      const response = await fetch(`/api/grading-suggestions?field=${fieldName}&userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setAllSuggestions(data.suggestions || [])
      } else {
        // API might not exist yet or returned an error - fail silently
        console.log(`Suggestions API returned ${response.status} for ${fieldName}`)
      }
    } catch (error) {
      // Network error or API doesn't exist - fail silently, input still works normally
      console.log(`Could not fetch suggestions for ${fieldName}:`, error)
    } finally {
      setIsLoading(false)
      setHasFetched(true)
    }
  }, [fieldName, hasFetched, isLoading, userId])

  // Filter suggestions based on current input
  const filterSuggestions = useCallback((inputValue: string) => {
    if (!inputValue.trim()) {
      // Show all suggestions when input is empty but focused
      return allSuggestions
    }
    const lowerInput = inputValue.toLowerCase()
    return allSuggestions.filter(s =>
      s.toLowerCase().includes(lowerInput) && s.toLowerCase() !== inputValue.toLowerCase()
    )
  }, [allSuggestions])

  // Update filtered suggestions when value changes
  useEffect(() => {
    const filtered = filterSuggestions(value)
    setSuggestions(filtered)
    setHighlightedIndex(-1)
  }, [value, filterSuggestions])

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
    setShowSuggestions(true)
  }

  const handleFocus = () => {
    fetchSuggestionsIfNeeded()
    setShowSuggestions(true)
  }

  const handleSelect = (suggestion: string) => {
    onChange(suggestion)
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          e.preventDefault()
          handleSelect(suggestions[highlightedIndex])
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        break
    }
  }

  const showDropdown = showSuggestions && (suggestions.length > 0 || isLoading) && !disabled

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={cn(className, showDropdown && 'rounded-b-none border-b-0')}
        autoComplete="off"
      />

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full bg-white border border-t-0 border-gray-300 rounded-b-md shadow-lg max-h-48 overflow-y-auto"
        >
          {isLoading && (
            <div className="px-3 py-2 text-sm text-gray-500">Loading suggestions...</div>
          )}
          {suggestions.map((suggestion, index) => {
            // Highlight matching text
            const lowerValue = value.toLowerCase()
            const lowerSuggestion = suggestion.toLowerCase()
            const matchIndex = lowerSuggestion.indexOf(lowerValue)

            return (
              <button
                key={suggestion}
                type="button"
                className={cn(
                  "w-full px-3 py-2 text-left text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors",
                  index === highlightedIndex && "bg-blue-100"
                )}
                onClick={() => handleSelect(suggestion)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                {matchIndex >= 0 && value ? (
                  <>
                    {suggestion.slice(0, matchIndex)}
                    <span className="font-semibold text-blue-600">
                      {suggestion.slice(matchIndex, matchIndex + value.length)}
                    </span>
                    {suggestion.slice(matchIndex + value.length)}
                  </>
                ) : (
                  suggestion
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
