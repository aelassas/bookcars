import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { createDrawerNavigator } from '@react-navigation/drawer'
import { MaterialIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

// Screens
import HomeScreen from '@/screens/HomeScreen'
import BookingsScreen from '@/screens/BookingsScreen'
import BookingScreen from '@/screens/BookingScreen'
import AboutScreen from '@/screens/AboutScreen'
import ToSScreen from '@/screens/ToSScreen'
import ContactScreen from '@/screens/ContactScreen'
import SignInScreen from '@/screens/SignInScreen'
import SignUpScreen from '@/screens/SignUpScreen'
import ForgotPasswordScreen from '@/screens/ForgotPasswordScreen'
import SearchScreen from '@/screens/SearchScreen'
import SettingsScreen from '@/screens/SettingsScreen'
import ChangePasswordScreen from '@/screens/ChangePasswordScreen'
import CheckoutScreen from '@/screens/CheckoutScreen'
import NotificationsScreen from '@/screens/NotificationsScreen'

// Context & Helpers
import DrawerContent from './DrawerContent'
import { useAuth } from '@/context/AuthContext'
import i18n from '@/lang/i18n'

const Drawer = createDrawerNavigator<StackParams>()

// Map route names to their respective components
const componentMap: Record<string, React.ComponentType<any>> = {
  Home: HomeScreen,
  Cars: SearchScreen,
  Checkout: CheckoutScreen,
  Bookings: BookingsScreen,
  Booking: BookingScreen,
  About: AboutScreen,
  ToS: ToSScreen,
  Contact: ContactScreen,
  Settings: SettingsScreen,
  ChangePassword: ChangePasswordScreen,
  SignIn: SignInScreen,
  SignUp: SignUpScreen,
  ForgotPassword: ForgotPasswordScreen,
  Notifications: NotificationsScreen,
}

const DrawerNavigator = () => {
  const { loggedIn, language } = useAuth()
  const insets = useSafeAreaInsets()

  // Define drawer items with useMemo so they only update when loggedIn changes
  const drawerItems: DrawerItem[] = useMemo(() => [
    { name: 'Home', title: i18n.t('HOME'), iconName: 'home' },
    { name: 'Cars', title: i18n.t('CARS'), iconName: 'directions-car', hidden: true },
    { name: 'Checkout', title: i18n.t('CREATE_BOOKING'), iconName: 'event-seat', hidden: true },
    { name: 'Bookings', title: i18n.t('BOOKINGS'), iconName: 'event-seat', hidden: !loggedIn },
    { name: 'Booking', title: '', iconName: 'event-seat', hidden: true },
    { name: 'About', title: i18n.t('ABOUT'), iconName: 'info' },
    { name: 'ToS', title: i18n.t('TOS_MENU'), iconName: 'description' },
    { name: 'Contact', title: i18n.t('CONTACT'), iconName: 'mail' },
    { name: 'Settings', title: i18n.t('SETTINGS'), iconName: 'settings', hidden: !loggedIn },
    { name: 'ChangePassword', title: i18n.t('CHANGE_PASSWORD_TITLE'), iconName: 'vpn-key', hidden: true },
    { name: 'SignIn', title: i18n.t('SIGN_IN_TITLE'), iconName: 'login', hidden: loggedIn },
    { name: 'SignUp', title: i18n.t('SIGN_UP_TITLE'), iconName: 'login', hidden: true },
    { name: 'ForgotPassword', title: i18n.t('FORGOT_PASSWORD'), iconName: 'login', hidden: true },
    { name: 'Notifications', title: '', iconName: 'notifications', hidden: true },
  ], [loggedIn])

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      marginTop: insets.top,
      marginBottom: insets.bottom,
    },
  })

  return (
    <View style={styles.container}>
      <Drawer.Navigator
        initialRouteName="Home"
        backBehavior="history"
        screenOptions={{
          drawerActiveTintColor: '#f37022',
          headerShown: false,
        }}
        drawerContent={(props) => (
          <DrawerContent
            props={props}
            index={props.state.index}
            drawerItems={drawerItems}
            loggedIn={loggedIn}
            language={language}
            activeBackgroundColor="#feeee4"
            activeTintColor="#f37022"
          />
        )}
      >
        {drawerItems.map((drawer) => (
          <Drawer.Screen
            key={drawer.name}
            name={drawer.name as keyof StackParams}
            component={componentMap[drawer.name]}
            options={{
              title: drawer.title,
              drawerItemStyle: {
                height: drawer.hidden ? 0 : 'auto',
                display: drawer.hidden ? 'none' : 'flex', // Cleanly hide items
              },
              drawerIcon: ({ color }) => (
                <MaterialIcons
                  name={drawer.iconName as any}
                  size={24}
                  color={color}
                />
              ),
            }}
          />
        ))}
      </Drawer.Navigator>
    </View>
  )
}

export default DrawerNavigator
