import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useTheme } from '../../composables/useTheme'

function mockMatchMedia(prefersDark) {
  vi.stubGlobal('matchMedia', (query) => ({
    matches: query.includes('dark') ? prefersDark : false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('bez zapisanego wyboru startuje od preferencji systemowej (dark)', () => {
    mockMatchMedia(true)
    const { theme } = useTheme()

    expect(theme.value).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('bez zapisanego wyboru startuje od preferencji systemowej (light)', () => {
    mockMatchMedia(false)
    const { theme } = useTheme()

    expect(theme.value).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('zapamiętany wybór w localStorage wygrywa z preferencją systemową', () => {
    mockMatchMedia(true) // system: dark
    localStorage.setItem('vue_playground_theme', 'light')

    const { theme } = useTheme()

    expect(theme.value).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('toggleTheme przełącza motyw, ustawia atrybut na <html> i zapisuje wybór', () => {
    mockMatchMedia(false) // system: light
    const { theme, toggleTheme } = useTheme()
    expect(theme.value).toBe('light')

    toggleTheme()

    expect(theme.value).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(localStorage.getItem('vue_playground_theme')).toBe('dark')

    toggleTheme()

    expect(theme.value).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(localStorage.getItem('vue_playground_theme')).toBe('light')
  })
})
