import React, { useState, useEffect } from 'react'
import { StyleSheet, View, Text } from 'react-native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import * as bookcarsTypes from ':bookcars-types'

import * as UserService from '@/services/UserService'
import Button from './Button'
import i18n from '@/lang/i18n'
import * as helper from '@/utils/helper'
import Header from './Header'
import { useAuth } from '@/context/AuthContext'

interface LayoutProps {
  navigation: NativeStackNavigationProp<StackParams, keyof StackParams>
  strict?: boolean
  route?: RouteProp<StackParams, keyof StackParams>
  reload?: boolean
  style?: object
  title?: string
  hideTitle?: boolean
  avatar?: string | null
  children: React.ReactNode
  onLoad: (user?: bookcarsTypes.User) => void
}

const Layout = ({
  navigation,
  strict,
  route,
  reload,
  style,
  title,
  hideTitle,
  avatar,
  children,
  onLoad
}: LayoutProps) => {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<bookcarsTypes.User | null>(null)
  const { loggedIn, refresh } = useAuth()

  const exit = async (_reload = false) => {
    if (strict) {
      await UserService.signout(navigation, false, true)

      if (onLoad) {
        onLoad()
      }
    } else {
      await UserService.signout(navigation, false, false)
      refresh()

      if (onLoad) {
        onLoad()
      }

      if (_reload && route) {
        helper.navigate(route, navigation)
      } else {
        setLoading(false)
      }
    }
  }

  const _init = async () => {
    try {
      setLoading(true)

      const language = await UserService.getLanguage()
      i18n.locale = language

      const currentUser = await UserService.getCurrentUser()

      if (currentUser?._id) {
        const status = await UserService.validateAccessToken()

        if (status === 200) {
          const _user = await UserService.getUser(currentUser._id)

          if (_user) {
            if (_user.blacklisted) {
              await exit(true)
              return
            }

            refresh()
            setUser(_user)
            setLoading(false)

            if (onLoad) {
              onLoad(_user)
            }
          } else {
            await exit(true)
          }
        } else {
          await exit(true)
        }
      } else {
        setUser(null)
        await exit(false)
      }
    } catch (err) {
      helper.error(err, false)
      await exit(true)
    }
  }

  useEffect(() => {
    if (reload) {
      _init()
    }
  }, [reload]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleResend = async () => {
    try {
      if (user) {
        const data = { email: user.email }

        const status = await UserService.resendLink(data)

        if (status === 200) {
          helper.toast(i18n.t('VALIDATION_EMAIL_SENT'))
        } else {
          helper.toast(i18n.t('VALIDATION_EMAIL_ERROR'))
        }
      }
    } catch (err) {
      helper.error(err)
    }
  }

  return (
    <View style={{ ...styles.container, ...style }}>
      <Header route={route} title={title} hideTitle={hideTitle} loggedIn={loggedIn} reload={reload} _avatar={avatar} />
      {(!loading
        && ((!user && !strict) || (user && user.verified) ? (
          children
        ) : (
          <View style={styles.validate}>
            <Text style={styles.validateText}>{i18n.t('VALIDATE_EMAIL')}</Text>
            <Button style={styles.validateButton} label={i18n.t('RESEND')} onPress={handleResend} />
          </View>
        ))) || null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F5F5F5',
  },
  validate: {
    marginTop: 15,
    padding: 15,
  },
  validateText: {
    color: 'rgba(0, 0, 0, .7)',
    fontSize: 14,
    lineHeight: 20,
  },
  validateButton: {
    marginTop: 15,
  },
})

export default Layout
