/**
 * Theme utility helpers
 * Issue #321: Polished dark mode with smooth transitions
 */

export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'soroban-ajo-theme'

/** Read the stored theme preference from localStorage */
export function getStoredTheme(): 'light' | 'dark' | 'system' {
  if (typeof window === 'undefined') return 'system'
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    // ignore
  }
  return 'system'
}

/** Detect the OS-level color scheme preference */
export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Apply a theme class to <html> and persist the choice */
export function applyTheme(theme: 'light' | 'dark' | 'system'): ResolvedTheme {
  const resolved = theme === 'system' ? getSystemTheme() : theme
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(resolved)
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // ignore
  }
  return resolved
}

/**
 * Returns Tailwind classes for a surface that adapts to dark mode.
 * Useful for components that can't use CSS-layer overrides.
 */
export function surfaceClasses(elevated = false): string {
  return elevated
    ? 'bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700'
    : 'bg-gray-50 dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border'
}

/** Returns the correct text color class for primary/secondary text */
export function textClasses(variant: 'primary' | 'secondary' | 'muted' = 'primary'): string {
  const map = {
    primary: 'text-gray-900 dark:text-slate-100',
    secondary: 'text-gray-600 dark:text-slate-400',
    muted: 'text-gray-400 dark:text-slate-500',
  }
  return map[variant]
}
