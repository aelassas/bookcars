import React, { useEffect, useState } from 'react'
import { StyleSheet } from 'react-native'
import { useIsFocused } from '@react-navigation/native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { enUS, fr } from 'date-fns/locale'
import * as bookcarsTypes from ':bookcars-types'

import i18n from '@/lang/i18n'
import * as UserService from '@/services/UserService'
import Layout from '@/components/Layout'
import NotificationList from '@/components/NotificationList'

const NotificationsScreen = ({ navigation, route }: NativeStackScreenProps<StackParams, 'Notifications'>) => {
  const isFocused = useIsFocused()
  const [reload, setReload] = useState(false)
  const [visible, setVisible] = useState(false)
  const [user, setUser] = useState<bookcarsTypes.User>()
  const [locale, setLoacle] = useState(fr)

  const _init = async () => {
    setVisible(false)
    const language = await UserService.getLanguage()
    i18n.locale = language
    setLoacle(language === 'fr' ? fr : enUS)

    const currentUser = await UserService.getCurrentUser()

    if (!currentUser || !currentUser._id) {
      await UserService.signout(navigation, false, true)
      return
    }

    const _user = await UserService.getUser(currentUser._id)

    if (!_user) {
      await UserService.signout(navigation, false, true)
      return
    }

    setUser(_user)
    setVisible(true)
  }

  useEffect(() => {
    if (isFocused) {
      _init()
      setReload(true)
    } else {
      setVisible(false)
    }
  }, [route.params, isFocused]) // eslint-disable-line react-hooks/exhaustive-deps

  const onLoad = () => {
    setReload(false)
  }

  return (
    <Layout style={styles.master} navigation={navigation} route={route} onLoad={onLoad} reload={reload} strict>
      {visible && (
        <NotificationList navigation={navigation} user={user} locale={locale} />
      )}
    </Layout>
  )
}

const styles = StyleSheet.create({
  master: {
    flex: 1,
  },
})

export default NotificationsScreen
