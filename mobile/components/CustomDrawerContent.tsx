import React, { useState, useEffect, useRef } from 'react'
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer'
import { StyleSheet, Text, View, Pressable, ScrollView, DimensionValue } from 'react-native'
import { router, useNavigation, usePathname } from 'expo-router'
import { MaterialIcons } from '@expo/vector-icons'
import { RouteProp } from '@react-navigation/native'

import i18n from '@/lang/i18n'
import * as env from '@/config/env.config'
import * as helper from '@/utils/helper'
import * as UserService from '@/services/UserService'
import * as bookcarsTypes from ':bookcars-types'
import { useAuth } from '@/context/AuthContext'

const CustomDrawerContent = (props: any) => {
  const { loggedIn, language: authLanguage } = useAuth()
  const pathname = usePathname()

  const [openLanguageMenu, setOpenLanguageMenu] = useState(false)
  const [language, setLanguage] = useState(authLanguage)

  const ref = useRef<ScrollView>(null)
  const yOffset = useRef(0)

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

        // 1. Get current navigation state from props
        const { index, routes } = props.state
        const currentRoute = routes[index]

        const getCurrentRouteName = () => currentRoute.name === 'index' ? 'Home' : currentRoute.name

        // 2. Call the new simplified helper
        // We pass 'true' for the reload parameter to trigger router.replace with the 'd' timestamp
        helper.navigate(
          { name: getCurrentRouteName(), params: currentRoute.params },
          true
        )
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
  }

  return (
    <DrawerContentScrollView
      {...props}
      ref={ref}
      onScroll={(event) => {
        yOffset.current = event.nativeEvent.contentOffset.y
      }}
      onContentSizeChange={() => {
        if (ref.current) {
          ref.current.scrollTo({ x: 0, y: yOffset.current, animated: false })
        }
      }}
      contentContainerStyle={styles.drawer}
    >
      <View>
        <DrawerItemList {...props} />

        {loggedIn && (
          <Pressable style={styles.signout} onPress={handleSignOut}>
            <MaterialIcons name="logout" size={24} color="rgba(0, 0, 0, 0.54)" />
            <Text style={styles.text}>{i18n.t('SIGN_OUT')}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.language}>
        <Pressable
          style={styles.languageButton}
          onPress={() => setOpenLanguageMenu((prev) => !prev)}
        >
          <MaterialIcons style={styles.languageIcon} name="language" size={24} color="rgba(0, 0, 0, 0.54)" />
          <Text style={styles.text}>{i18n.t('LANGUAGE')}</Text>
        </Pressable>

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
      </View>
    </DrawerContentScrollView>
  )
}

const styles = StyleSheet.create({
  drawer: {
    flexGrow: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  signout: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 15,
    marginBottom: 25,
    padding: 5,
  },
  text: {
    color: 'rgba(0, 0, 0, 0.54)',
    fontWeight: '600',
    marginLeft: 25,
  },
  language: {
    justifyContent: 'flex-end',
    marginBottom: 20,
    marginLeft: 15,
    marginTop: 100,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
  languageIcon: {
    marginRight: 5,
  },
  languageMenu: {
    position: 'absolute',
    bottom: 35,
    right: 10,
    width: '100%',
    borderRadius: 7,
    backgroundColor: '#fff', // Added background for visibility
    elevation: 3, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  languageMenuItem: {
    width: '100%',
    height: 43,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageMenuText: {
    color: 'rgba(0, 0, 0, 0.54)',
    fontWeight: '600',
    marginLeft: 25,
  },
  languageMenuSelectedItem: {
    width: '100%',
    height: 43,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#feeee4',
  },
  languageMenuSelectedText: {
    color: '#f37022',
    fontWeight: '600',
    marginLeft: 25,
  },
})

export default CustomDrawerContent
