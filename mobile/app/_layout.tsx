import { useCallback, useEffect, useRef, useState } from 'react'
import { Slot, useRouter } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Provider as PaperProvider } from 'react-native-paper'
import { StripeProvider } from '@stripe/stripe-react-native'
import * as SplashScreen from 'expo-splash-screen'
import * as Notifications from 'expo-notifications'
import { StatusBar as ExpoStatusBar } from 'expo-status-bar'
import Toast from 'react-native-toast-message'

import * as helper from '@/utils/helper'
import * as NotificationService from '@/services/NotificationService'
import * as UserService from '@/services/UserService'
import { AutocompleteDropdownContextProvider } from '@/components/AutocompleteDropdown-v4.3.1'
import { AuthProvider } from '@/context/AuthContext'
import { GlobalProvider } from '@/context/GlobalContext'
import { SettingProvider } from '@/context/SettingContext'
import * as env from '@/config/env.config'
import { View } from 'react-native'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowList: true,
  }),
})

//
// Keep the splash screen visible while we fetch resources
//
SplashScreen.preventAutoHideAsync()

const RootLayout = () => {
  const router = useRouter()
  const [appIsReady, setAppIsReady] = useState(false)

  const responseListener = useRef<Notifications.EventSubscription | null>(null)

  useEffect(() => {
    const register = async () => {
      try {
        // Register Push Token
        const loggedIn = await UserService.loggedIn()
        if (loggedIn) {
          const currentUser = await UserService.getCurrentUser()
          if (currentUser?._id) {
            await helper.registerPushToken(currentUser._id)
          }
        }
      } catch (e) {
        console.warn(e)
      } finally {
        // Only set ready once the registration logic is finished
        setAppIsReady(true)
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
        const { data } = response.notification.request.content

        if (data?.booking) {
          if (data.user && data.notification) {
            await NotificationService.markAsRead(data.user as string, [data.notification as string])
          }
          router.push({ pathname: '/booking', params: { id: data.booking as string } })
        } else {
          router.push('/notifications')
        }
      } catch (err) {
        helper.error(err, false)
      }
    })

    return () => {
      responseListener.current?.remove()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps


  const onLayoutRootView = useCallback(async () => {
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
    <View style={{ flex: 1 }}>
      <ExpoStatusBar style="dark" backgroundColor="#ffffff" translucent={false} />

      <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <SettingProvider>
          <GlobalProvider>
            <AuthProvider>
              <SafeAreaProvider>
                <PaperProvider>
                  <StripeProvider
                    publishableKey={env.STRIPE_PUBLISHABLE_KEY}
                    merchantIdentifier={env.STRIPE_MERCHANT_IDENTIFIER}
                  >
                    <AutocompleteDropdownContextProvider>
                      {/* Slot renders the child (drawer) layout */}
                      <Slot />
                    </AutocompleteDropdownContextProvider>
                  </StripeProvider>
                </PaperProvider>
              </SafeAreaProvider>
            </AuthProvider>
          </GlobalProvider>
        </SettingProvider>
      </GestureHandlerRootView>

      <Toast />
    </View>
  )
}

export default RootLayout
