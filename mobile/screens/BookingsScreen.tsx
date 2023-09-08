import React, { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useIsFocused } from '@react-navigation/native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import * as bookcarsTypes from  '../miscellaneous/bookcarsTypes'

import Master from '../components/Master'
import i18n from '../lang/i18n'
import * as UserService from '../services/UserService'
import BookingList from '../components/BookingList'
import SupplierFilter from '../components/SupplierFilter'
import * as Env from '../config/env.config'
import StatusFilter from '../components/StatusFilter'
import * as BookingService from '../services/BookingService'
import BookingFilter from '../components/BookingFilter'

const BookingsScreen = ({ navigation, route }: NativeStackScreenProps<StackParams, 'Bookings'>) => {
  const isFocused = useIsFocused()
  const [language, setLanguage] = useState(Env.DEFAULT_LANGUAGE)
  const [reload, setReload] = useState(false)
  const [visible, setVisible] = useState(false)
  const [user, setUser] = useState<bookcarsTypes.User>()
  const [hasBookings, setHasBookings] = useState(false)
  const [companies, setCompanies] = useState<string[]>([])
  const [statuses, setStatuses] = useState<string[]>([])
  const [filter, setFilter] = useState<bookcarsTypes.Filter>()

  const _init = async () => {
    try {
      setVisible(false)
      setUser(undefined)
      setCompanies([])
      setFilter(undefined)

      const language = await UserService.getLanguage()
      i18n.locale = language
      setLanguage(language)

      const currentUser = await UserService.getCurrentUser()

      if (!currentUser || !currentUser._id) {
        await UserService.signout(navigation, false, true)
        return
      }

      const user = await UserService.getUser(currentUser._id)

      if (!user?._id) {
        await UserService.signout(navigation, false, true)
        return
      }

      setUser(user)

      const hasBookingsStatus = await BookingService.hasBookings(user._id)
      const hasBookings = hasBookingsStatus === 200
      setHasBookings(hasBookings)

      setVisible(true)
    } catch (err) {
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

  const onLoadCompanies = (companies: string[]) => {
    setCompanies(companies)
  }

  const onChangeCompanies = (companies: string[]) => {
    setCompanies(companies)
  }

  const onLoadStatuses = (statuses: string[]) => {
    setStatuses(statuses)
  }

  const onChangeStatuses = (statuses: string[]) => {
    setStatuses(statuses)
  }

  const onSubmitBookingFilter = (filter: bookcarsTypes.Filter) => {
    setFilter(filter)
  }

  return (
    <Master style={styles.master} navigation={navigation} route={route} onLoad={onLoad} reload={reload} strict>
      {visible && user?._id && (
        <BookingList
          user={user._id}
          language={language}
          companies={companies}
          statuses={statuses}
          filter={filter}
          header={
            <View>
              <SupplierFilter
                style={styles.filter}
                visible={hasBookings}
                onLoad={onLoadCompanies}
                onChange={onChangeCompanies}
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
          }
        />
      )}
    </Master>
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
