import React, { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useIsFocused } from '@react-navigation/native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import * as bookcarsTypes from ':bookcars-types'

import Layout from '../components/Layout'
import i18n from '../lang/i18n'
import * as UserService from '../services/UserService'
import BookingList from '../components/BookingList'
import SupplierFilter from '../components/SupplierFilter'
import * as env from '../config/env.config'
import StatusFilter from '../components/StatusFilter'
import * as BookingService from '../services/BookingService'
import BookingFilter from '../components/BookingFilter'

const BookingsScreen = ({ navigation, route }: NativeStackScreenProps<StackParams, 'Bookings'>) => {
  const isFocused = useIsFocused()
  const [language, setLanguage] = useState(env.DEFAULT_LANGUAGE)
  const [reload, setReload] = useState(false)
  const [visible, setVisible] = useState(false)
  const [user, setUser] = useState<bookcarsTypes.User>()
  const [hasBookings, setHasBookings] = useState(false)
  const [suppliers, setSuppliers] = useState<string[]>([])
  const [statuses, setStatuses] = useState<string[]>([])
  const [filter, setFilter] = useState<bookcarsTypes.Filter>()

  const _init = async () => {
    try {
      setVisible(false)
      setUser(undefined)
      setSuppliers([])
      setFilter(undefined)

      const _language = await UserService.getLanguage()
      i18n.locale = _language
      setLanguage(_language)

      const currentUser = await UserService.getCurrentUser()

      if (!currentUser || !currentUser._id) {
        await UserService.signout(navigation, false, true)
        return
      }

      const _user = await UserService.getUser(currentUser._id)

      if (!_user?._id) {
        await UserService.signout(navigation, false, true)
        return
      }

      setUser(_user)

      const hasBookingsStatus = await BookingService.hasBookings(_user._id)
      const _hasBookings = hasBookingsStatus === 200
      setHasBookings(_hasBookings)

      setVisible(true)
    } catch {
      await UserService.signout(navigation, false, true)
    }
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

  const onLoadSuppliers = (_suppliers: string[]) => {
    setSuppliers(_suppliers)
  }

  const onChangeSuppliers = (_suppliers: string[]) => {
    setSuppliers(_suppliers)
  }

  const onLoadStatuses = (_statuses: string[]) => {
    setStatuses(_statuses)
  }

  const onChangeStatuses = (_statuses: string[]) => {
    setStatuses(_statuses)
  }

  const onSubmitBookingFilter = (_filter: bookcarsTypes.Filter) => {
    setFilter(_filter)
  }

  return (
    <Layout style={styles.master} navigation={navigation} route={route} onLoad={onLoad} reload={reload} strict>
      {visible && user?._id && (
        <BookingList
          user={user._id}
          language={language}
          suppliers={suppliers}
          statuses={statuses}
          filter={filter}
          header={(
            <View>
              <SupplierFilter
                style={styles.filter}
                visible={hasBookings}
                onLoad={onLoadSuppliers}
                onChange={onChangeSuppliers}
              />
              <StatusFilter
                style={styles.filter}
                visible={hasBookings}
                onLoad={onLoadStatuses}
                onChange={onChangeStatuses}
              />
              <BookingFilter
                style={styles.filter}
                visible={hasBookings}
                onSubmit={onSubmitBookingFilter}
              />
            </View>
          )}
        />
      )}
    </Layout>
  )
}

const styles = StyleSheet.create({
  master: {
    flex: 1,
  },
  filter: {
    marginRight: 7,
    marginBottom: 10,
    marginLeft: 7,
  },
})

export default BookingsScreen
