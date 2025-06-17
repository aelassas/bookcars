/* eslint-disable react-refresh/only-export-components */
import React, { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { UserContextType, useUserContext } from './UserContext'
import * as NotificationService from '@/services/NotificationService'
import * as UserService from '@/services/UserService'

// Create context
export interface NotificationContextType {
  notificationCount: number,
  setNotificationCount: React.Dispatch<React.SetStateAction<number>>
}

const NotificationContext = createContext<NotificationContextType | null>(null)

// Create a provider
interface NotificationProviderProps {
  children: ReactNode
  refreshKey?: number
}

export const NotificationProvider = ({ children, refreshKey }: NotificationProviderProps) => {
  const { userLoaded } = useUserContext() as UserContextType
  const [notificationCount, setNotificationCount] = useState(0)
  const value = useMemo(() => ({ notificationCount, setNotificationCount }), [notificationCount])

  const checkNotifications = useCallback(async () => {
    const currentUser = UserService.getCurrentUser()

    if (currentUser) {
      const notificationCounter = await NotificationService.getNotificationCounter(currentUser._id!)
      setNotificationCount(notificationCounter.count)
    }
  }, [])

  // Ref to track the previous refreshKey
  const prevRefreshKey = useRef(refreshKey)

  useEffect(() => {
    // Check if refreshKey has actually changed
    if (userLoaded && prevRefreshKey.current !== refreshKey) {
      checkNotifications()
      prevRefreshKey.current = refreshKey // Update the ref to the current refreshKey
    }
  }, [userLoaded, refreshKey, checkNotifications])

  useEffect(() => {
    if (refreshKey === undefined) {
      checkNotifications()
    }
  }, [refreshKey, checkNotifications])

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  )
}

// Create a custom hook to access context
export const useNotificationContext = () => useContext(NotificationContext)
