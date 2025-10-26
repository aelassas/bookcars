import React, { createContext, useContext, useState, useEffect } from 'react'
import * as bookcarsTypes from ':bookcars-types'
import * as SettingService from '@/services/SettingService'
import * as helper from '@/utils/helper'
import { ActivityIndicator, Text, View } from 'react-native'
import i18n from '@/lang/i18n'

interface SettingContextType {
  settings: bookcarsTypes.Setting
  refresh: () => Promise<void>
}

const SettingContext = createContext<SettingContextType | undefined>(undefined)

export const SettingProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<bookcarsTypes.Setting>()
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    try {
      const _settings = await SettingService.getSettings()
      if (!_settings) {
        throw new Error('No settings returned from API')
      }
      setSettings(_settings)
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#f37022" />
      </View>
    )
  }

  if (!settings) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>{i18n.t('SETTINGS_NOT_LOADED')}</Text>
      </View>
    )
  }

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
  if (!context.settings) {
    throw new Error('Settings not loaded yet')
  }
  return context
}
