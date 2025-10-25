import React, { useState, useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import { createDrawerNavigator } from '@react-navigation/drawer'
import {
  useNavigationState
} from '@react-navigation/native'
import { MaterialIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

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
import * as UserService from '@/services/UserService'
import i18n from '@/lang/i18n'
import * as env from '@/config/env.config'
import SettingsScreen from '@/screens/SettingsScreen'
import ChangePasswordScreen from '@/screens/ChangePasswordScreen'
import DrawerContent from './DrawerContent'
import CheckoutScreen from '@/screens/CheckoutScreen'
import NotificationsScreen from '@/screens/NotificationsScreen'
import { useAuth } from '@/context/AuthContext'

const DrawerNavigator = () => {
  const { loggedIn, language } = useAuth()

  const Drawer = createDrawerNavigator<StackParams>()
  const insets = useSafeAreaInsets()

  const drawerItems: DrawerItem[] = [
    {
      name: 'Home',
      title: i18n.t('HOME'),
      iconName: 'home',
      hideTitle: true,
    },
    {
      name: 'Cars',
      title: i18n.t('CARS'),
      iconName: 'directions-car',
      hidden: true,
      hideTitle: true,
    },
    {
      name: 'Checkout',
      title: i18n.t('CREATE_BOOKING'),
      iconName: 'event-seat',
      hidden: true,
    },
    {
      name: 'Bookings',
      title: i18n.t('BOOKINGS'),
      iconName: 'event-seat',
      hidden: !loggedIn,
    },
    {
      name: 'Booking',
      title: '',
      iconName: 'event-seat',
      hidden: true,
      hideTitle: true,
    },
    {
      name: 'About',
      title: i18n.t('ABOUT'),
      iconName: 'info',
    },
    {
      name: 'ToS',
      title: i18n.t('TOS_MENU'),
      iconName: 'description',
    },
    {
      name: 'Contact',
      title: i18n.t('CONTACT'),
      iconName: 'mail',
    },
    {
      name: 'Settings',
      title: i18n.t('SETTINGS'),
      iconName: 'settings',
      hidden: !loggedIn,
    },
    {
      name: 'ChangePassword',
      title: i18n.t('CHANGE_PASSWORD_TITLE'),
      iconName: 'vpn-key',
      hidden: true,
    },
    {
      name: 'SignIn',
      title: i18n.t('SIGN_IN_TITLE'),
      iconName: 'login',
      hidden: loggedIn,
    },
    {
      name: 'SignUp',
      title: i18n.t('SIGN_UP_TITLE'),
      iconName: 'login',
      hidden: true,
    },
    {
      name: 'ForgotPassword',
      title: i18n.t('FORGOT_PASSWORD'),
      iconName: 'login',
      hidden: true,
    },
    {
      name: 'Notifications',
      title: '',
      iconName: 'notifications',
      hidden: true,
      hideTitle: true,
    },
  ]

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
          // unmountOnBlur: true,
        }}
        drawerContent={(props) => (
          <DrawerContent
            index={props.state.index}
            drawerItems={drawerItems}
            loggedIn={loggedIn}
            language={language}
            activeBackgroundColor="#feeee4"
            activeTintColor="#f37022"
            props={props}
          />
        )}
      // useLegacyImplementation
      >
        {drawerItems.map((drawer) => (
          drawer.name === 'Home'
            ? (
              <Drawer.Screen
                key={drawer.name}
                name={drawer.name}
                component={HomeScreen}
                options={{
                  title: drawer.title,
                  drawerItemStyle: {
                    height: drawer.hidden ? 0 : 'auto',
                  },
                  drawerIcon: () => (
                    <MaterialIcons
                      name={drawer.iconName as keyof typeof MaterialIcons.glyphMap}
                      size={24}
                      color="rgba(0, 0, 0, 0.54)"
                    />
                  ),
                  headerShown: false,
                }}
              />
            )
            : drawer.name === 'Cars'
              ? (
                <Drawer.Screen
                  key={drawer.name}
                  name={drawer.name}
                  component={SearchScreen}
                  options={{
                    title: drawer.title,
                    drawerItemStyle: {
                      height: drawer.hidden ? 0 : 'auto',
                    },
                    drawerIcon: () => (
                      <MaterialIcons
                        name={drawer.iconName as keyof typeof MaterialIcons.glyphMap}
                        size={24}
                        color="rgba(0, 0, 0, 0.54)"
                      />
                    ),
                    headerShown: false,
                  }}
                />
              )
              : drawer.name === 'Checkout'
                ? (
                  <Drawer.Screen
                    key={drawer.name}
                    name={drawer.name}
                    component={CheckoutScreen}
                    options={{
                      title: drawer.title,
                      drawerItemStyle: {
                        height: drawer.hidden ? 0 : 'auto',
                      },
                      drawerIcon: () => (
                        <MaterialIcons
                          name={drawer.iconName as keyof typeof MaterialIcons.glyphMap}
                          size={24}
                          color="rgba(0, 0, 0, 0.54)"
                        />
                      ),
                      headerShown: false,
                    }}
                  />
                )
                : drawer.name === 'Bookings'
                  ? (
                    <Drawer.Screen
                      key={drawer.name}
                      name={drawer.name}
                      component={BookingsScreen}
                      options={{
                        title: drawer.title,
                        drawerItemStyle: {
                          height: drawer.hidden || !loggedIn ? 0 : 'auto',
                        },
                        drawerIcon: () => (
                          <MaterialIcons
                            name={drawer.iconName as keyof typeof MaterialIcons.glyphMap}
                            size={24}
                            color="rgba(0, 0, 0, 0.54)"
                          />
                        ),
                        headerShown: false,
                      }}
                    />
                  )
                  : drawer.name === 'Booking'
                    ? (
                      <Drawer.Screen
                        key={drawer.name}
                        name={drawer.name}
                        component={BookingScreen}
                        options={{
                          title: drawer.title,
                          drawerItemStyle: {
                            height: drawer.hidden ? 0 : 'auto',
                          },
                          drawerIcon: () => (
                            <MaterialIcons
                              name={drawer.iconName as keyof typeof MaterialIcons.glyphMap}
                              size={24}
                              color="rgba(0, 0, 0, 0.54)"
                            />
                          ),
                          headerShown: false,
                        }}
                      />
                    )
                    : drawer.name === 'About'
                      ? (
                        <Drawer.Screen
                          key={drawer.name}
                          name={drawer.name}
                          component={AboutScreen}
                          options={{
                            title: drawer.title,
                            drawerItemStyle: {
                              height: drawer.hidden ? 0 : 'auto',
                            },
                            drawerIcon: () => (
                              <MaterialIcons
                                name={drawer.iconName as keyof typeof MaterialIcons.glyphMap}
                                size={24}
                                color="rgba(0, 0, 0, 0.54)"
                              />
                            ),
                            headerShown: false,
                          }}
                        />
                      )
                      : drawer.name === 'ToS'
                        ? (
                          <Drawer.Screen
                            key={drawer.name}
                            name={drawer.name}
                            component={ToSScreen}
                            options={{
                              title: drawer.title,
                              drawerItemStyle: {
                                height: drawer.hidden ? 0 : 'auto',
                              },
                              drawerIcon: () => (
                                <MaterialIcons
                                  name={drawer.iconName as keyof typeof MaterialIcons.glyphMap}
                                  size={24}
                                  color="rgba(0, 0, 0, 0.54)"
                                />
                              ),
                              headerShown: false,
                            }}
                          />
                        )
                        : drawer.name === 'Contact'
                          ? (
                            <Drawer.Screen
                              key={drawer.name}
                              name={drawer.name}
                              component={ContactScreen}
                              options={{
                                title: drawer.title,
                                drawerItemStyle: {
                                  height: drawer.hidden ? 0 : 'auto',
                                },
                                drawerIcon: () => (
                                  <MaterialIcons
                                    name={drawer.iconName as keyof typeof MaterialIcons.glyphMap}
                                    size={24}
                                    color="rgba(0, 0, 0, 0.54)"
                                  />
                                ),
                                headerShown: false,
                              }}
                            />
                          )
                          : drawer.name === 'Settings'
                            ? (
                              <Drawer.Screen
                                key={drawer.name}
                                name={drawer.name}
                                component={SettingsScreen}
                                options={{
                                  title: drawer.title,
                                  drawerItemStyle: {
                                    height: drawer.hidden || !loggedIn ? 0 : 'auto',
                                  },
                                  drawerIcon: () => (
                                    <MaterialIcons
                                      name={drawer.iconName as keyof typeof MaterialIcons.glyphMap}
                                      size={24}
                                      color="rgba(0, 0, 0, 0.54)"
                                    />
                                  ),
                                  headerShown: false,
                                }}
                              />
                            )
                            : drawer.name === 'ChangePassword'
                              ? (
                                <Drawer.Screen
                                  key={drawer.name}
                                  name={drawer.name}
                                  component={ChangePasswordScreen}
                                  options={{
                                    title: drawer.title,
                                    drawerItemStyle: {
                                      height: drawer.hidden ? 0 : 'auto',
                                    },
                                    drawerIcon: () => (
                                      <MaterialIcons
                                        name={drawer.iconName as keyof typeof MaterialIcons.glyphMap}
                                        size={24}
                                        color="rgba(0, 0, 0, 0.54)"
                                      />
                                    ),
                                    headerShown: false,
                                  }}
                                />
                              )
                              : drawer.name === 'SignIn'
                                ? (
                                  <Drawer.Screen
                                    key={drawer.name}
                                    name={drawer.name}
                                    component={SignInScreen}
                                    options={{
                                      title: drawer.title,
                                      drawerItemStyle: {
                                        height: drawer.hidden || loggedIn ? 0 : 'auto',
                                      },
                                      drawerIcon: () => (
                                        <MaterialIcons
                                          name={drawer.iconName as keyof typeof MaterialIcons.glyphMap}
                                          size={24}
                                          color="rgba(0, 0, 0, 0.54)"
                                        />
                                      ),
                                      headerShown: false,
                                    }}
                                  />
                                )
                                : drawer.name === 'SignUp'
                                  ? (
                                    <Drawer.Screen
                                      key={drawer.name}
                                      name={drawer.name}
                                      component={SignUpScreen}
                                      options={{
                                        title: drawer.title,
                                        drawerItemStyle: {
                                          height: drawer.hidden ? 0 : 'auto',
                                        },
                                        drawerIcon: () => (
                                          <MaterialIcons
                                            name={drawer.iconName as keyof typeof MaterialIcons.glyphMap}
                                            size={24}
                                            color="rgba(0, 0, 0, 0.54)"
                                          />
                                        ),
                                        headerShown: false,
                                      }}
                                    />
                                  )
                                  : drawer.name === 'ForgotPassword'
                                    ? (
                                      <Drawer.Screen
                                        key={drawer.name}
                                        name={drawer.name}
                                        component={ForgotPasswordScreen}
                                        options={{
                                          title: drawer.title,
                                          drawerItemStyle: {
                                            height: drawer.hidden ? 0 : 'auto',
                                          },
                                          drawerIcon: () => (
                                            <MaterialIcons
                                              name={drawer.iconName as keyof typeof MaterialIcons.glyphMap}
                                              size={24}
                                              color="rgba(0, 0, 0, 0.54)"
                                            />
                                          ),
                                          headerShown: false,
                                        }}
                                      />
                                    )
                                    : drawer.name === 'Notifications'
                                      ? (
                                        <Drawer.Screen
                                          key={drawer.name}
                                          name={drawer.name}
                                          component={NotificationsScreen}
                                          options={{
                                            title: drawer.title,
                                            drawerItemStyle: {
                                              height: drawer.hidden ? 0 : 'auto',
                                            },
                                            drawerIcon: () => (
                                              <MaterialIcons
                                                name={drawer.iconName as keyof typeof MaterialIcons.glyphMap}
                                                size={24}
                                                color="rgba(0, 0, 0, 0.54)"
                                              />
                                            ),
                                            headerShown: false,
                                          }}
                                        />
                                      )
                                      : null
        ))}
      </Drawer.Navigator>
    </View>
  )
}

export default DrawerNavigator
