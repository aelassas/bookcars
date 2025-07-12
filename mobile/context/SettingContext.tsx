import React, { createContext, useContext, useState, useEffect } from 'react'
import * as bookcarsTypes from ':bookcars-types'
import * as SettingService from '@/services/SettingService'
import * as helper from '@/utils/helper'

interface SettingContextType {
  settings?: bookcarsTypes.Setting
  refresh: () => Promise<void>
}

const SettingContext = createContext<SettingContextType | undefined>(undefined)

export const SettingProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<bookcarsTypes.Setting>()

  const refresh = async () => {
    try {
      const _settings = await SettingService.getSettings()
      if (!_settings) {
        throw new Error('No settings returned from API')
      }
      setSettings(_settings)
    } catch (err) {
      helper.error(err)
    }
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

export const useSetting = () => {
  const context = useContext(SettingContext)
  if (!context) {
    throw new Error('useSetting must be used within an SettingProvider')
  }
  return context
}
