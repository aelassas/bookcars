import React, { useState, useEffect, useRef } from 'react'
import { DrawerContentScrollView, DrawerItem, DrawerContentComponentProps } from '@react-navigation/drawer'
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  DimensionValue,
  StyleProp,
  ViewStyle,
} from 'react-native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { MaterialIcons } from '@expo/vector-icons'
import { CommonActions, DrawerActions } from '@react-navigation/routers'
import { useNavigation, RouteProp } from '@react-navigation/native'

import i18n from '@/lang/i18n'
import * as env from '@/config/env.config'
import * as helper from '@/utils/helper'
import * as UserService from '@/services/UserService'
import * as bookcarsTypes from ':bookcars-types'

interface DrawerContentProps {
  language: string
  index: number
  drawerItems: DrawerItem[]
  loggedIn?: boolean
  activeTintColor?: string
  inactiveTintColor?: string
  activeBackgroundColor?: string
  inactiveBackgroundColor?: string
  labelStyle?: StyleProp<ViewStyle>
  itemStyle?: StyleProp<ViewStyle>
  props: DrawerContentComponentProps
}

const DrawerContent = ({
  language: drawerLanguage,
  index,
  drawerItems,
  loggedIn,
  activeTintColor,
  inactiveTintColor,
  activeBackgroundColor,
  inactiveBackgroundColor,
  labelStyle,
  itemStyle,
  props
}: DrawerContentProps) => {
  const navigation = useNavigation<NativeStackNavigationProp<StackParams, keyof StackParams>>()
  const [openLanguageMenu, setOpenLanguageMenu] = useState(false)
  const [language, setLanguage] = useState(drawerLanguage)
  const ref = useRef<ScrollView>(null)
  const yOffset = useRef(0)

  useEffect(() => {
    setLanguage(drawerLanguage)
  }, [drawerLanguage])

  const updateLanguage = async (_language: string) => {
    try {
      const setLang = async (__language: string) => {
        i18n.locale = __language
        await UserService.setLanguage(__language)
        setLanguage(__language)
        const route = props.state.routes[index]
        helper.navigate(route as RouteProp<StackParams, keyof StackParams>, navigation, true)
      }

      const currentUser = await UserService.getCurrentUser()
      if (currentUser && currentUser._id) {
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

  return (
    <DrawerContentScrollView
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
      {...props}
    >
      <View>
        {props?.state?.routes
          && props.state.routes.map((route, i: number) => {
            const focused = i === props.state.index
            const { title, drawerLabel, drawerIcon } = props.descriptors[route.key].options

            const hidden = drawerItems?.find((item) => item.name === route.name)?.hidden
            if (hidden) {
              return <View key={route.key} />
            }

            return (
              <DrawerItem
                key={route.key}
                label={drawerLabel !== undefined ? drawerLabel : title !== undefined ? title : route.name}
                icon={drawerIcon}
                focused={focused}
                activeTintColor={activeTintColor}
                inactiveTintColor={inactiveTintColor}
                activeBackgroundColor={activeBackgroundColor}
                inactiveBackgroundColor={inactiveBackgroundColor}
                labelStyle={labelStyle}
                style={itemStyle}
                // to={buildLink(route.name, route.params)}
                onPress={() => {
                  navigation.dispatch({
                    ...(focused ? DrawerActions.closeDrawer() : CommonActions.navigate(route.name)),
                    target: props.state.key,
                  })
                }}
              />
            )
          })}
        {loggedIn && (
          <Pressable
            style={styles.signout}
            hitSlop={15}
            onPress={async () => {
              await UserService.signout(navigation)
            }}
          >
            <MaterialIcons style={styles.signoutIcon} name="logout" size={24} color="rgba(0, 0, 0, 0.54)" />
            <Text style={styles.text}>{i18n.t('SIGN_OUT')}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.language}>
        <Pressable
          style={styles.languageButton}
          hitSlop={15}
          onPress={() => {
            setOpenLanguageMenu((prev) => !prev)
          }}
        >
          <MaterialIcons style={styles.languageIcon} name="language" size={24} color="rgba(0, 0, 0, 0.54)" />
          <Text style={styles.text}>{i18n.t('LANGUAGE')}</Text>
        </Pressable>

        {openLanguageMenu && (
          <View style={styles.languageMenu}>
            {
              env.LANGUAGES.map((lang) => (
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
                  <Text style={lang.code === language ? styles.languageMenuSelectedText : styles.languageMenuText}>{lang.label}</Text>
                </Pressable>
              ))
            }
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
  drawerList: {
    top: 'always' as DimensionValue,
  },
  signout: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 15,
    marginBottom: 25,
    padding: 5,
  },
  signoutIcon: {
    marginRight: -15,
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

export default DrawerContent
