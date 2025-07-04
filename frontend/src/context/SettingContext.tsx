import React, { createContext, useContext, useState, useEffect } from 'react'
import * as bookcarsTypes from ':bookcars-types'
import * as SettingService from '@/services/SettingService'

interface SettingContextType {
  settings?: bookcarsTypes.Setting
  refresh: () => Promise<void>
}

const SettingContext = createContext<SettingContextType | undefined>(undefined)

export const SettingProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<bookcarsTypes.Setting>()

  const refresh = async () => {
    const _settings = await SettingService.getSettings()
    if (!_settings) {
      console.error('No settings returned from API')
      throw new Error('Settings not found')
    }
    setSettings(_settings)
  }

  useEffect(() => {
    refresh()
  }, [])

  return (
    <SettingContext.Provider value={{ settings, refresh }}>
      {children}
    </SettingContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSetting = () => {
  const context = useContext(SettingContext)
  if (!context) {
    throw new Error('useSetting must be used within an SettingProvider')
  }
  return context
}
