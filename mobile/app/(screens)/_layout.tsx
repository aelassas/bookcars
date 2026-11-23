import { Stack } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const DrawerLayout = () => {
  const insets = useSafeAreaInsets()

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
        contentStyle: {
          backgroundColor: 'transparent',
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      }}
    />
  )
}

export default DrawerLayout
