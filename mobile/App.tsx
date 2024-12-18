import 'react-native-gesture-handler'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native'
import { StatusBar as ExpoStatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Provider } from 'react-native-paper'
import * as SplashScreen from 'expo-splash-screen'
import * as Notifications from 'expo-notifications'
import { StripeProvider } from '@stripe/stripe-react-native'
import Toast from 'react-native-toast-message'
import DrawerNavigator from './components/DrawerNavigator'
import * as helper from './common/helper'
import * as NotificationService from './services/NotificationService'
import * as UserService from './services/UserService'
import { GlobalProvider } from './context/GlobalContext'
import * as env from './config/env.config'
import { AutocompleteDropdownContextProvider } from '@/components/AutocompleteDropdown-v4.3.1'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

//
// Keep the splash screen visible while we fetch resources
//
SplashScreen.preventAutoHideAsync()

const App = () => {
  const [appIsReady, setAppIsReady] = useState(false)

  const responseListener = useRef<Notifications.EventSubscription>()
  const navigationRef = useRef<NavigationContainerRef<StackParams>>(null)

  useEffect(() => {
    const register = async () => {
      const loggedIn = await UserService.loggedIn()
      if (loggedIn) {
        const currentUser = await UserService.getCurrentUser()
        if (currentUser?._id) {
          await helper.registerPushToken(currentUser._id)
        } else {
          helper.error()
        }
      }
    }

    //
    // Register push notifiations token
    //
    register()

    //
    // This listener is fired whenever a user taps on or interacts with a notification (works when app is foregrounded, backgrounded, or killed)
    //
    responseListener.current = Notifications.addNotificationResponseReceivedListener(async (response) => {
      try {
        if (navigationRef.current) {
          const { data } = response.notification.request.content

          if (data.booking) {
            if (data.user && data.notification) {
              await NotificationService.markAsRead(data.user, [data.notification])
            }
            navigationRef.current.navigate('Booking', { id: data.booking })
          } else {
            navigationRef.current.navigate('Notifications', {})
          }
        }
      } catch (err) {
        helper.error(err, false)
      }
    })

    return () => {
      Notifications.removeNotificationSubscription(responseListener.current!)
    }
  }, [])

  setTimeout(() => {
    setAppIsReady(true)
  }, 500)

  const onReady = useCallback(async () => {
    if (appIsReady) {
      //
      // This tells the splash screen to hide immediately! If we call this after
      // `setAppIsReady`, then we may see a blank screen while the app is
      // loading its initial state and rendering its first pixels. So instead,
      // we hide the splash screen once we know the root view has already
      // performed layout.
      //
      await SplashScreen.hideAsync()
    }
  }, [appIsReady])

  if (!appIsReady) {
    return null
  }

  return (
    <GlobalProvider>
      <SafeAreaProvider>
        <Provider>
          <StripeProvider publishableKey={env.STRIPE_PUBLISHABLE_KEY} merchantIdentifier={env.STRIPE_MERCHANT_IDENTIFIER}>
            <AutocompleteDropdownContextProvider>
              <NavigationContainer ref={navigationRef} onReady={onReady}>
                <ExpoStatusBar style="light" backgroundColor="rgba(0, 0, 0, .9)" />
                <DrawerNavigator />
                <Toast />
              </NavigationContainer>
            </AutocompleteDropdownContextProvider>
          </StripeProvider>
        </Provider>
      </SafeAreaProvider>
    </GlobalProvider>
  )
}

export default App
