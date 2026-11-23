import React from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

/**
 * SafarRent mobile is a thin native shell around the responsive customer site.
 * The site owns customer flows so the mobile and web experiences stay in sync.
 */
const RootLayout = () => (
  <SafeAreaProvider>
    <StatusBar style="dark" />
    <Stack screenOptions={{ headerShown: false }} />
  </SafeAreaProvider>
)

export default RootLayout
