import { ref } from 'vue'

const STORAGE_KEY = 'vue_playground_theme'

function resolveInitial() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // localStorage niedostępny (np. tryb prywatny) — jedziemy na preferencji systemowej
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function apply(theme) {
  document.documentElement.setAttribute('data-theme', theme)
}

// Prosty przełącznik jasny/ciemny. Startuje od zapamiętanego wyboru, a w
// jego braku — od preferencji systemowej przeglądarki. Po pierwszym
// kliknięciu wybór jest jawny i trzyma się niezależnie od systemu.
export function useTheme() {
  const theme = ref(resolveInitial())
  apply(theme.value)

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    apply(theme.value)
    try {
      localStorage.setItem(STORAGE_KEY, theme.value)
    } catch {
      // nieistotne — po prostu nie przeżyje odświeżenia
    }
  }

  return { theme, toggleTheme }
}
