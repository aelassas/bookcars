import React, { ReactNode, createContext, useContext, useMemo } from 'react'
import useReCaptcha from '@/hooks/useRecaptcha'

// Create context
export interface RecaptchaContextType {
  reCaptchaLoaded: boolean,
  generateReCaptchaToken: (action?: string) => Promise<string>
}

const RecaptchaContext = createContext<RecaptchaContextType | null>(null)

// Create a provider
interface RecaptchaProviderProps {
  children: ReactNode
}

export const RecaptchaProvider = ({ children }: RecaptchaProviderProps) => {
  const { reCaptchaLoaded, generateReCaptchaToken } = useReCaptcha()
  const value = useMemo(() => ({ reCaptchaLoaded, generateReCaptchaToken }), [reCaptchaLoaded, generateReCaptchaToken])

  return (
    <RecaptchaContext.Provider value={value}>{children}</RecaptchaContext.Provider>
  )
}

// Create a custom hook to access context
// eslint-disable-next-line react-refresh/only-export-components
export const useRecaptchaContext = () => useContext(RecaptchaContext)
