import React, { useEffect, useState } from 'react'
import { IconButton, Tooltip } from '@mui/material'
import { DarkMode, LightMode } from '@mui/icons-material'
import { getThemeMode, setThemeMode, ThemeMode } from '@/utils/themeMode'

const ThemeToggle = () => {
  const [mode, setMode] = useState<ThemeMode>(() => getThemeMode())

  useEffect(() => {
    const sync = (event: Event) => setMode((event as CustomEvent<ThemeMode>).detail)
    window.addEventListener('safarrent-theme-change', sync)
    return () => window.removeEventListener('safarrent-theme-change', sync)
  }, [])

  const nextMode = mode === 'light' ? 'dark' : 'light'

  return (
    <Tooltip title={`Switch to ${nextMode} theme`}>
      <IconButton className="sr-theme-toggle" aria-label={`Switch to ${nextMode} theme`} onClick={() => setThemeMode(nextMode)} size="large">
        {mode === 'light' ? <DarkMode /> : <LightMode />}
      </IconButton>
    </Tooltip>
  )
}

export default ThemeToggle
