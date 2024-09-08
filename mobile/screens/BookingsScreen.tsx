import React, { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useIsFocused } from '@react-navigation/native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'

import * as UserService from '@/services/UserService'
import * as SupplierService from '@/services/SupplierService'
import i18n from '@/lang/i18n'
import Layout from '@/components/Layout'
import BookingList from '@/components/BookingList'
import SupplierFilter from '@/components/SupplierFilter'
import * as env from '@/config/env.config'
import StatusFilter from '@/components/StatusFilter'
import * as BookingService from '@/services/BookingService'
import BookingFilter from '@/components/BookingFilter'
import Indicator from '@/components/Indicator'

const BookingsScreen = ({ navigation, route }: NativeStackScreenProps<StackParams, 'Bookings'>) => {
  const isFocused = useIsFocused()
  const [language, setLanguage] = useState(env.DEFAULT_LANGUAGE)
  const [reload, setReload] = useState(false)
  const [visible, setVisible] = useState(false)
  const [user, setUser] = useState<bookcarsTypes.User>()
  const [hasBookings, setHasBookings] = useState(false)
  const [suppliers, setSuppliers] = useState<bookcarsTypes.User[]>([])
  const [supplierIds, setSupplierIds] = useState<string[]>([])
  const [statuses, setStatuses] = useState<string[]>([])
  const [filter, setFilter] = useState<bookcarsTypes.Filter>()

  const _init = async () => {
    try {
      setVisible(false)
      setUser(undefined)
      setSupplierIds([])
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

      const _suppliers = await SupplierService.getAllSuppliers()
      const _supplierIds = bookcarsHelper.flattenSuppliers(_suppliers)
      setSuppliers(_suppliers)
      setSupplierIds(_supplierIds)

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

  const onChangeSuppliers = (_suppliers: string[]) => {
    setSupplierIds(_suppliers)
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
      {!visible && <Indicator style={{ marginVertical: 10 }} />}
      {visible && user?._id && (
        <BookingList
          navigation={navigation}
          user={user._id}
          language={language}
          suppliers={supplierIds}
          statuses={statuses}
          filter={filter}
          header={(
            <View>
              <SupplierFilter
                style={styles.filter}
                visible={hasBookings}
                suppliers={suppliers}
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
                backgroundColor="#fff"
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
