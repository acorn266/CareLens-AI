"use client"

import { useEffect, useCallback } from "react"

interface UseKeyboardNavigationOptions {
  enabled: boolean
  onNavigate?: (direction: string) => void
}

export function useKeyboardNavigation({ enabled, onNavigate }: UseKeyboardNavigationOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      // Skip if user is typing in an input field
      const target = event.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.contentEditable === "true") {
        return
      }

      switch (event.key) {
        case "ArrowUp":
        case "ArrowDown":
        case "ArrowLeft":
        case "ArrowRight":
          event.preventDefault()
          onNavigate?.(event.key)
          break

        case "Enter":
        case " ":
          // Activate focused element
          const focusedElement = document.activeElement as HTMLElement
          if (focusedElement && focusedElement.click) {
            event.preventDefault()
            focusedElement.click()
          }
          break

        case "Escape":
          // Remove focus from current element
          const activeElement = document.activeElement as HTMLElement
          if (activeElement && activeElement.blur) {
            activeElement.blur()
          }
          break

        case "Tab":
          // Enhanced tab navigation - announce focused element
          setTimeout(() => {
            const newFocused = document.activeElement as HTMLElement
            if (newFocused && newFocused.getAttribute("aria-label")) {
              const label = newFocused.getAttribute("aria-label")
              announceToScreenReader(`Focused: ${label}`)
            }
          }, 100)
          break
      }
    },
    [enabled, onNavigate],
  )

  const announceToScreenReader = useCallback((message: string) => {
    const announcement = document.createElement("div")
    announcement.setAttribute("aria-live", "polite")
    announcement.setAttribute("aria-atomic", "true")
    announcement.className = "sr-only"
    announcement.textContent = message

    document.body.appendChild(announcement)
    setTimeout(() => document.body.removeChild(announcement), 1000)
  }, [])

  const focusFirstInteractiveElement = useCallback(() => {
    const interactiveElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    const firstElement = interactiveElements[0] as HTMLElement
    if (firstElement) {
      firstElement.focus()
    }
  }, [])

  const focusLastInteractiveElement = useCallback(() => {
    const interactiveElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    const lastElement = interactiveElements[interactiveElements.length - 1] as HTMLElement
    if (lastElement) {
      lastElement.focus()
    }
  }, [])

  useEffect(() => {
    if (enabled) {
      document.addEventListener("keydown", handleKeyDown)
      return () => document.removeEventListener("keydown", handleKeyDown)
    }
  }, [enabled, handleKeyDown])

  return {
    announceToScreenReader,
    focusFirstInteractiveElement,
    focusLastInteractiveElement,
  }
}
