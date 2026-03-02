import React, { useEffect, useState } from 'react'
import { StyleSheet } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useIsFocused } from '@react-navigation/native'

import * as bookcarsTypes from ':bookcars-types'
import i18n from '@/lang/i18n'
import * as UserService from '@/services/UserService'
import Layout from '@/components/Layout'
import BookingList from '@/components/BookingList'
import * as env from '@/config/env.config'


const BookingScreen = () => {
  const isFocused = useIsFocused()
  // 1. Get params (id for the booking, d for the reload timestamp)
  const { id, d } = useLocalSearchParams<{ id: string; d: string }>()

  const [language, setLanguage] = useState(env.DEFAULT_LANGUAGE)
  const [reload, setReload] = useState(false)
  const [visible, setVisible] = useState(false)
  const [user, setUser] = useState<bookcarsTypes.User>()

  const _init = async () => {
    setVisible(false)
    const _language = await UserService.getLanguage()
    setLanguage(_language)
    i18n.locale = _language

    const currentUser = await UserService.getCurrentUser()

    if (!currentUser || !currentUser._id) {
      await UserService.signout(false, true)
      return
    }

    const _user = await UserService.getUser(currentUser._id)

    if (!_user) {
      await UserService.signout(false, true)
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
  }, [id, d, isFocused])

  const onLoad = () => {
    setReload(false)
  }

  return (
    // 3. Removed navigation/route props from Layout as they aren't needed in Expo Router
    <Layout style={styles.master} onLoad={onLoad} reload={reload} strict>
      {visible && user && (
        <BookingList
          user={user._id as string}
          booking={id as string}
          language={language}
        />
      )}
    </Layout>
  )
}

const styles = StyleSheet.create({
  master: {
    flex: 1,
  },
})

export default BookingScreen
