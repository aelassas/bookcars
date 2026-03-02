import React, { useState, useEffect, useRef } from 'react'
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native'
import { router, useGlobalSearchParams, usePathname } from 'expo-router'
import { MaterialIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import i18n from '@/lang/i18n'
import * as env from '@/config/env.config'
import * as helper from '@/utils/helper'
import * as UserService from '@/services/UserService'
import * as bookcarsTypes from ':bookcars-types'
import { useAuth } from '@/context/AuthContext'

interface CustomDrawerContentProps {
  closeDrawer: () => void
}

const CustomDrawerContent = ({ closeDrawer }: CustomDrawerContentProps) => {
  const { loggedIn, language: authLanguage } = useAuth()
  const pathname = usePathname()
  const params = useGlobalSearchParams()
  const insets = useSafeAreaInsets()

  const [openLanguageMenu, setOpenLanguageMenu] = useState(false)
  const [language, setLanguage] = useState(authLanguage)

  const navigateTo = (path: string) => {
    closeDrawer()

    // If we are already on this path, don't do anything
    if (pathname === path) {
      return
    }

    // Use replace to avoid the "stack push" animation
    router.replace(path as any)
  }

  // Sync internal state with AuthContext language
  useEffect(() => {
    setLanguage(authLanguage)
  }, [authLanguage])

  const updateLanguage = async (_language: string) => {
    try {
      const setLang = async (__language: string) => {
        i18n.locale = __language
        await UserService.setLanguage(__language)
        setLanguage(__language)

        closeDrawer()

        // Reload current page with new language data
        const routeName = helper.getCurrentRouteName(pathname)
        helper.navigate({ name: routeName, params: { ...params } }, true)
      }

      const currentUser = await UserService.getCurrentUser()
      if (currentUser?._id) {
        const data: bookcarsTypes.UpdateLanguagePayload = {
          id: currentUser._id,
          language: _language,
        }
        const status = await UserService.updateLanguage(data)

        if (status === 200) {
          await setLang(_language)
        } else {
          helper.error()
        }
      } else {
        await setLang(_language)
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const handleSignOut = async () => {
    await UserService.signout()
    closeDrawer()
  }

  return (
    <View
      style={[
        styles.drawerSurface,
        {
          marginTop: insets.top,
          marginBottom: insets.bottom
        }
      ]}
    >
      <ScrollView contentContainerStyle={styles.drawer}>
        <View style={styles.menuSection}>
          {/* 1. Home - Always Visible */}
          <Pressable
            style={[styles.menuItem, pathname === '/' && styles.activeMenuItem]}
            onPress={() => navigateTo('/')}
          >
            <MaterialIcons name="home" size={24} color={pathname === '/' ? '#f37022' : 'rgba(0, 0, 0, 0.54)'} />
            <Text style={[styles.text, pathname === '/' && styles.activeText]}>{i18n.t('HOME')}</Text>
          </Pressable>

          {/* 2. Bookings - Conditional Visibility (Logged In Only) */}
          {loggedIn && (
            <Pressable
              style={[styles.menuItem, pathname === '/bookings' && styles.activeMenuItem]}
              onPress={() => navigateTo('/bookings')}
            >
              <MaterialIcons name="event-seat" size={24} color={pathname === '/bookings' ? '#f37022' : 'rgba(0, 0, 0, 0.54)'} />
              <Text style={[styles.text, pathname === '/bookings' && styles.activeText]}>{i18n.t('BOOKINGS')}</Text>
            </Pressable>
          )}

          {/* 3. About - Always Visible */}
          <Pressable
            style={[styles.menuItem, pathname === '/about' && styles.activeMenuItem]}
            onPress={() => navigateTo('/about')}
          >
            <MaterialIcons name="info" size={24} color={pathname === '/about' ? '#f37022' : 'rgba(0, 0, 0, 0.54)'} />
            <Text style={[styles.text, pathname === '/about' && styles.activeText]}>{i18n.t('ABOUT')}</Text>
          </Pressable>

          {/* 4. ToS - Always Visible */}
          <Pressable
            style={[styles.menuItem, pathname === '/tos' && styles.activeMenuItem]}
            onPress={() => navigateTo('/tos')}
          >
            <MaterialIcons name="description" size={24} color={pathname === '/tos' ? '#f37022' : 'rgba(0, 0, 0, 0.54)'} />
            <Text style={[styles.text, pathname === '/tos' && styles.activeText]}>{i18n.t('TOS_MENU')}</Text>
          </Pressable>

          {/* 5. Contact - Always Visible */}
          <Pressable
            style={[styles.menuItem, pathname === '/contact' && styles.activeMenuItem]}
            onPress={() => navigateTo('/contact')}
          >
            <MaterialIcons name="mail" size={24} color={pathname === '/contact' ? '#f37022' : 'rgba(0, 0, 0, 0.54)'} />
            <Text style={[styles.text, pathname === '/contact' && styles.activeText]}>{i18n.t('CONTACT')}</Text>
          </Pressable>

          {/* 6. Settings - Conditional Visibility (Logged In Only) */}
          {loggedIn && (
            <Pressable
              style={[styles.menuItem, pathname === '/settings' && styles.activeMenuItem]}
              onPress={() => navigateTo('/settings')}
            >
              <MaterialIcons name="settings" size={24} color={pathname === '/settings' ? '#f37022' : 'rgba(0, 0, 0, 0.54)'} />
              <Text style={[styles.text, pathname === '/settings' && styles.activeText]}>{i18n.t('SETTINGS')}</Text>
            </Pressable>
          )}

          {/* 7. Sign In - Visible only when NOT logged in */}
          {!loggedIn && (
            <Pressable
              style={[styles.menuItem, pathname === '/sign-in' && styles.activeMenuItem]}
              onPress={() => navigateTo('/sign-in')}
            >
              <MaterialIcons name="login" size={24} color={pathname === '/sign-in' ? '#f37022' : 'rgba(0, 0, 0, 0.54)'} />
              <Text style={[styles.text, pathname === '/sign-in' && styles.activeText]}>{i18n.t('SIGN_IN_TITLE')}</Text>
            </Pressable>
          )}

          {/* 8. Sign Out - Only if logged in */}
          {loggedIn && (
            <Pressable style={styles.signout} onPress={handleSignOut}>
              <MaterialIcons name="logout" size={24} color="rgba(0, 0, 0, 0.54)" />
              <Text style={styles.text}>{i18n.t('SIGN_OUT')}</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.languageSection}>
          {openLanguageMenu && (
            <View style={styles.languageMenu}>
              {env.LANGUAGES.map((lang) => (
                <Pressable
                  key={lang.code}
                  style={lang.code === language ? styles.languageMenuSelectedItem : styles.languageMenuItem}
                  onPress={async () => {
                    if (lang.code !== language) {
                      await updateLanguage(lang.code)
                      setOpenLanguageMenu(false)
                    }
                  }}
                >
                  <Text style={lang.code === language ? styles.languageMenuSelectedText : styles.languageMenuText}>
                    {lang.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          <Pressable
            style={styles.languageButton}
            onPress={() => setOpenLanguageMenu((prev) => !prev)}
          >
            <MaterialIcons name="language" size={24} color="rgba(0, 0, 0, 0.54)" />
            <Text style={styles.text}>{i18n.t('LANGUAGE')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  drawerSurface: {
    flex: 1, // Takes available space but respects margins
    width: 280, // Ensure it doesn't span the full width
    backgroundColor: '#fff',
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    // Add elevation/shadow to make the "gap" visible
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  drawer: {
    flexGrow: 1,
    paddingTop: 50,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  menuSection: {
    paddingHorizontal: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 5,
  },
  activeMenuItem: {
    backgroundColor: '#feeee4',
    borderRadius: 8,
  },
  signout: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 10,
  },
  text: {
    color: 'rgba(0, 0, 0, 0.54)',
    fontWeight: '600',
    marginLeft: 20,
    fontSize: 15,
  },
  activeText: {
    color: '#f37022',
  },
  languageSection: {
    paddingHorizontal: 15,
    marginTop: 50,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  languageMenu: {
    marginTop: 10,
    borderRadius: 7,
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  languageMenuItem: {
    padding: 12,
    paddingLeft: 44,
  },
  languageMenuSelectedItem: {
    padding: 12,
    paddingLeft: 44,
    backgroundColor: '#feeee4',
  },
  languageMenuText: {
    color: 'rgba(0, 0, 0, 0.54)',
    fontWeight: '600',
  },
  languageMenuSelectedText: {
    color: '#f37022',
    fontWeight: '600',
  },
})

export default CustomDrawerContent
