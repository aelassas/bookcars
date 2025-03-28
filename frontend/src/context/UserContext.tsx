/* eslint-disable react-refresh/only-export-components */
import React, { ReactNode, createContext, useContext, useMemo, useState } from 'react'
import * as bookcarsTypes from ':bookcars-types'

// Create context
export interface UserContextType {
  user: bookcarsTypes.User | null
  setUser: React.Dispatch<React.SetStateAction<bookcarsTypes.User | null>>
  userLoaded: boolean
  setUserLoaded: React.Dispatch<React.SetStateAction<boolean>>
}

const UserContext = createContext<UserContextType | null>(null)

// Create a provider
interface UserProviderProps {
  children: ReactNode
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<bookcarsTypes.User | null>(null)
  const [userLoaded, setUserLoaded] = useState(false)
  const value = useMemo(() => ({ user, setUser, userLoaded, setUserLoaded }), [user, userLoaded])

  return (
    <UserContext.Provider value={value}>{children}</UserContext.Provider>
  )
}

// Create a custom hook to access context
export const useUserContext = () => useContext(UserContext)
