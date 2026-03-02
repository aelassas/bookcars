import { Stack } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SimpleDrawerProvider } from '@/context/DrawerContext' 

const DrawerLayout = () => {
  const insets = useSafeAreaInsets()

  return (
    <SimpleDrawerProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
          contentStyle: {
            backgroundColor: 'transparent',
            // Applying the offsets
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        }}
      />
    </SimpleDrawerProvider>
  )
}

export default DrawerLayout
