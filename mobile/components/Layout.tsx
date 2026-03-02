import React, { useState, useEffect } from 'react'
import { StyleSheet, View, Text } from 'react-native'
import { useLocalSearchParams } from 'expo-router' // Add this
import * as bookcarsTypes from ':bookcars-types'

import * as UserService from '@/services/UserService'
import Button from './Button'
import i18n from '@/lang/i18n'
import * as helper from '@/utils/helper'
import Header from './Header'
import { useAuth } from '@/context/AuthContext'

interface LayoutProps {
  // navigation and route are no longer passed as props in Expo Router
  strict?: boolean
  reload?: boolean
  style?: object
  title?: string
  hideTitle?: boolean
  avatar?: string | null
  children: React.ReactNode
  onLoad: (user?: bookcarsTypes.User) => void
}

const Layout = ({
  strict,
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

  // Get current route params (specifically 'd' for reloads)
  const params = useLocalSearchParams()

  const exit = async (_reload = false) => {
    if (strict) {
      await UserService.signout(false, true)
      if (onLoad) {
        onLoad()
      }
    } else {
      await UserService.signout(false, false)
      refresh()

      if (onLoad) {
        onLoad()
      }

      if (_reload) {
        // Use the new helper with the current route name
        // We assume the caller knows the screen name or we use the pathname
        helper.navigate({ name: params.screenName as string || 'Home' })
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

  // Triggered when 'reload' prop is true OR when the cache-buster 'd' changes
  useEffect(() => {
    if (reload || params.d) {
      _init()
    }
  }, [reload, params.d]) // eslint-disable-line react-hooks/exhaustive-deps

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
    <View style={[styles.container, style]}>
      {/* Header also needs to be updated to stop relying on 'route' prop 
         internally, using useLocalSearchParams instead.
      */}
      <Header
        title={title}
        hideTitle={hideTitle}
        loggedIn={loggedIn}
        _avatar={avatar}
        reload={reload}
      />

      {(!loading && ((!user && !strict) || (user && user.verified) ? (
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
    flex: 1, // Added flex: 1 to ensure it fills the screen
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
