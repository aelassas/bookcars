import React, { createContext, useContext, useState, useEffect } from 'react'
import * as UserService from '@/services/UserService'
import * as env from '@/config/env.config'

interface AuthContextType {
  loggedIn: boolean
  language: string
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [loggedIn, setLoggedIn] = useState(false)
  const [language, setLanguage] = useState(env.DEFAULT_LANGUAGE)

  const refresh = async () => {
    const _loggedIn = await UserService.loggedIn()
    const _language = await UserService.getLanguage()

    setLoggedIn(_loggedIn)
    setLanguage(_language)
  }

  useEffect(() => {
    refresh()
  }, [])

  return (
    <AuthContext.Provider value={{ loggedIn, language, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
