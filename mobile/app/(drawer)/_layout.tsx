import { Drawer } from 'expo-router/drawer'
import { MaterialIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import CustomDrawerContent from '@/components/CustomDrawerContent'
import { useAuth } from '@/context/AuthContext'
import i18n from '@/lang/i18n'

const DrawerLayout = () => {
  const insets = useSafeAreaInsets()
  const { loggedIn } = useAuth()

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        drawerActiveTintColor: '#f37022',
        headerShown: false,
        sceneStyle: {
          backgroundColor: '#F5F5F5',
          marginTop: insets.top,
          marginBottom: insets.bottom,
        },
        drawerStyle: {
          marginTop: insets.top,
          marginBottom: insets.bottom,
          maxWidth: 280,
        }
      }}
    >
      {/* Home Screen */}
      <Drawer.Screen
        name="index"
        options={{
          title: i18n.t('HOME'),
          drawerIcon: ({ color }) => <MaterialIcons name="home" size={24} color={color} />,
        }}
      />

      {/* Cars - Hidden from menu but accessible */}
      <Drawer.Screen
        name="cars"
        options={{
          title: i18n.t('CARS'),
          drawerItemStyle: { display: 'none' },
          drawerIcon: ({ color }) => <MaterialIcons name="directions-car" size={24} color={color} />,
        }}
      />

      {/* Checkout - Hidden from menu */}
      <Drawer.Screen
        name="checkout"
        options={{
          title: i18n.t('CREATE_BOOKING'),
          drawerItemStyle: { display: 'none' },
          drawerIcon: ({ color }) => <MaterialIcons name="event-seat" size={24} color={color} />,
        }}
      />

      {/* Bookings - Conditional Visibility */}
      <Drawer.Screen
        name="bookings"
        options={{
          title: i18n.t('BOOKINGS'),
          drawerItemStyle: { display: loggedIn ? 'flex' : 'none' },
          drawerIcon: ({ color }) => <MaterialIcons name="event-seat" size={24} color={color} />,
        }}
      />

      {/* Booking Detail - Hidden from menu */}
      <Drawer.Screen
        name="booking"
        options={{
          drawerItemStyle: { display: 'none' },
        }}
      />

      {/* About */}
      <Drawer.Screen
        name="about"
        options={{
          title: i18n.t('ABOUT'),
          drawerIcon: ({ color }) => <MaterialIcons name="info" size={24} color={color} />,
        }}
      />

      {/* ToS */}
      <Drawer.Screen
        name="tos"
        options={{
          title: i18n.t('TOS_MENU'),
          drawerIcon: ({ color }) => <MaterialIcons name="description" size={24} color={color} />,
        }}
      />

      {/* Contact */}
      <Drawer.Screen
        name="contact"
        options={{
          title: i18n.t('CONTACT'),
          drawerIcon: ({ color }) => <MaterialIcons name="mail" size={24} color={color} />,
        }}
      />

      {/* Settings */}
      <Drawer.Screen
        name="settings"
        options={{
          title: i18n.t('SETTINGS'),
          drawerItemStyle: { display: loggedIn ? 'flex' : 'none' },
          drawerIcon: ({ color }) => <MaterialIcons name="settings" size={24} color={color} />,
        }}
      />

      {/* Change Password - Hidden */}
      <Drawer.Screen
        name="change-password"
        options={{
          drawerItemStyle: { display: 'none' },
        }}
      />

      {/* Sign In - Visible only when NOT logged in */}
      <Drawer.Screen
        name="sign-in"
        options={{
          title: i18n.t('SIGN_IN_TITLE'),
          drawerItemStyle: { display: loggedIn ? 'none' : 'flex' },
          drawerIcon: ({ color }) => <MaterialIcons name="login" size={24} color={color} />,
        }}
      />

      {/* Sign Up - Hidden */}
      <Drawer.Screen
        name="sign-up"
        options={{
          drawerItemStyle: { display: 'none' },
        }}
      />

      {/* Forgot Password - Hidden */}
      <Drawer.Screen
        name="forgot-password"
        options={{
          drawerItemStyle: { display: 'none' },
        }}
      />

      {/* Notifications - Hidden */}
      <Drawer.Screen
        name="notifications"
        options={{
          drawerItemStyle: { display: 'none' },
        }}
      />
    </Drawer>
  )
}

export default DrawerLayout
