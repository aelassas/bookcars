export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'safarrent-admin-theme'

export const getThemeMode = (): ThemeMode => {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'dark' ? 'dark' : 'light'
}

export const setThemeMode = (mode: ThemeMode) => {
  window.localStorage.setItem(STORAGE_KEY, mode)
  document.documentElement.dataset.theme = mode
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', mode === 'dark' ? '#0F0F10' : '#F6F6F7')
  window.dispatchEvent(new CustomEvent('safarrent-theme-change', { detail: mode }))
}

export const initThemeMode = () => {
  const mode = getThemeMode()
  document.documentElement.dataset.theme = mode
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', mode === 'dark' ? '#0F0F10' : '#F6F6F7')
}
