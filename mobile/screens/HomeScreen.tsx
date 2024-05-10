import React, { useState, useEffect } from 'react'
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Keyboard } from 'react-native'
import { useIsFocused } from '@react-navigation/native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'

import * as env from '../config/env.config'
import i18n from '../lang/i18n'
import * as UserService from '../services/UserService'
import * as helper from '../common/helper'
import Layout from '../components/Layout'
import Switch from '../components/Switch'
import Button from '../components/Button'
import LocationSelectList from '../components/LocationSelectList'
import DateTimePicker from '../components/DateTimePicker'

const HomeScreen = ({ navigation, route }: NativeStackScreenProps<StackParams, 'Home'>) => {
  const isFocused = useIsFocused()

  const dateOffset = 3

  const _fromDate = new Date()
  _fromDate.setDate(_fromDate.getDate() + 1)
  _fromDate.setHours(0)
  _fromDate.setMinutes(0)
  _fromDate.setSeconds(0)
  _fromDate.setMilliseconds(0)

  const _fromTime = new Date(_fromDate)
  _fromTime.setHours(10)

  const _toDate = new Date(_fromDate)
  _toDate.setDate(_toDate.getDate() + dateOffset)

  const _toTime = new Date(_toDate)
  _toTime.setHours(10)

  const _minDate = new Date()
  _minDate.setDate(_minDate.getDate() + 2)

  const _maxDate = new Date(_toDate)
  _maxDate.setDate(_maxDate.getDate() - 1)

  const [init, setInit] = useState(false)
  const [visible, setVisible] = useState(false)
  const [pickupLocation, setPickupLocation] = useState('')
  const [dropOffLocation, setDropOffLocation] = useState('')
  const [closePickupLocation, setClosePickupLocation] = useState(false)
  const [closeDropOffLocation, setCloseDropOffLocation] = useState(false)
  const [sameLocation, setSameLocation] = useState(true)
  const [fromDate, setFromDate] = useState<Date | undefined>(_fromDate)
  const [fromTime, setFromTime] = useState<Date | undefined>(_fromTime)
  const [toTime, setToTime] = useState<Date | undefined>(_toTime)
  const [toDate, setToDate] = useState<Date | undefined>(_toDate)
  const [minDate, setMinDate] = useState(_minDate)
  const [maxDate, setMaxDate] = useState(_maxDate)
  const [language, setLanguage] = useState(env.DEFAULT_LANGUAGE)
  const [blur, setBlur] = useState(false)
  const [reload, setReload] = useState(false)

  const _init = async () => {
    const _language = await UserService.getLanguage()
    i18n.locale = _language
    setLanguage(_language)

    setPickupLocation('')
    setDropOffLocation('')
    setSameLocation(true)
    setFromDate(_fromDate)
    setFromTime(_fromTime)
    setToDate(_toDate)
    setToTime(_toTime)

    Keyboard.addListener('keyboardDidHide', () => {
      setBlur(true)
    })

    setInit(true)
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

  const handlePickupLocationSelect = (_pickupLocation: string) => {
    setPickupLocation(_pickupLocation)
    if (sameLocation) {
      setDropOffLocation(_pickupLocation)
    }
  }

  const handleDropOffLocationSelect = (_dropOffLocation: string) => {
    setDropOffLocation(_dropOffLocation)
  }

  const blurLocations = () => {
    setBlur(true)
    setClosePickupLocation(true)
    setCloseDropOffLocation(true)
  }

  const handleTouchableOpacityClick = () => {
    blurLocations()
  }

  const handleSameLocationChange = (checked: boolean) => {
    setSameLocation(checked)
    blurLocations()
    if (checked) {
      setDropOffLocation(pickupLocation)
    } else {
      setDropOffLocation('')
    }
  }

  const handleSearch = () => {
    blurLocations()

    if (!pickupLocation) {
      helper.toast(i18n.t('PICKUP_LOCATION_EMPTY'))
      return
    }

    if (!dropOffLocation) {
      helper.toast(i18n.t('DROP_OFF_LOCATION_EMPTY'))
      return
    }

    if (!fromDate) {
      helper.toast(i18n.t('FROM_DATE_EMPTY'))
      return
    }

    if (!fromTime) {
      helper.toast(i18n.t('FROM_TIME_EMPTY'))
      return
    }

    if (!toDate) {
      helper.toast(i18n.t('TO_DATE_EMPTY'))
      return
    }

    if (!toTime) {
      helper.toast(i18n.t('TO_TIME_EMPTY'))
      return
    }

    const from = helper.dateTime(fromDate, fromTime)
    const to = helper.dateTime(toDate, toTime)

    const params = {
      pickupLocation,
      dropOffLocation,
      from: from.getTime(),
      to: to.getTime(),
    }
    navigation.navigate('Cars', params)
  }

  return (
    <Layout style={styles.master} navigation={navigation} onLoad={onLoad} reload={reload} route={route}>
      {init && visible && (
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
          <View style={styles.contentContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoMain}>BookCars</Text>
              <Text style={styles.logoRegistered}>®</Text>
            </View>

            <TouchableOpacity
              style={{
                position: 'absolute',
                backgroundColor: 'rgba(0, 0, 0, 0)',
                opacity: 0,
                width: '100%',
                height: '100%',
                left: 0,
                top: 0,
              }}
              onPress={handleTouchableOpacityClick}
            />

            <LocationSelectList
              label={i18n.t('PICKUP_LOCATION')}
              style={styles.component}
              onSelectItem={handlePickupLocationSelect}
              selectedItem={pickupLocation}
              onFetch={() => {
                setClosePickupLocation(false)
              }}
              onFocus={() => {
                setBlur(false)
                setCloseDropOffLocation(true)
              }}
              close={closePickupLocation}
              blur={blur}
            />

            <DateTimePicker
              mode="date"
              locale={language}
              style={styles.component}
              label={i18n.t('FROM_DATE')}
              value={fromDate}
              minDate={_fromDate}
              maxDate={maxDate}
              hideClearButton
              onChange={(date) => {
                if (date) {
                  if (toDate && toDate.getTime() <= date.getTime()) {
                    setToDate(undefined)
                  }

                  const __minDate = new Date(date)
                  __minDate.setDate(date.getDate() + 1)
                  setMinDate(__minDate)
                } else {
                  setMinDate(_minDate)
                }

                setFromDate(date)
              }}
              onPress={blurLocations}
            />

            <DateTimePicker
              mode="time"
              locale={language}
              style={styles.component}
              label={i18n.t('FROM_TIME')}
              value={fromTime}
              hideClearButton
              onChange={(time) => {
                setFromTime(time)
              }}
              onPress={blurLocations}
            />

            <DateTimePicker
              mode="date"
              locale={language}
              style={styles.component}
              label={i18n.t('TO_DATE')}
              value={toDate}
              minDate={minDate}
              hideClearButton
              onChange={(date) => {
                if (date) {
                  setToDate(date)
                  const __maxDate = new Date(date)
                  __maxDate.setDate(__maxDate.getDate() - 1)
                  setMaxDate(__maxDate)
                } else {
                  setMaxDate(_maxDate)
                }
              }}
              onPress={blurLocations}
            />

            <DateTimePicker
              mode="time"
              locale={language}
              style={styles.component}
              label={i18n.t('TO_TIME')}
              value={toTime}
              hideClearButton
              onChange={(time) => {
                setToTime(time)
              }}
              onPress={blurLocations}
            />

            <Button style={styles.component} label={i18n.t('SEARCH')} onPress={handleSearch} />

            {!sameLocation && (
              <LocationSelectList
                label={i18n.t('DROP_OFF_LOCATION')}
                style={styles.component}
                onSelectItem={handleDropOffLocationSelect}
                selectedItem={dropOffLocation}
                onFetch={() => {
                  setCloseDropOffLocation(false)
                }}
                onFocus={() => {
                  setBlur(false)
                  setClosePickupLocation(true)
                }}
                close={closeDropOffLocation}
                blur={blur}
              />
            )}

            <Switch
              style={styles.component}
              label={i18n.t('SAME_LOCATION')}
              value={sameLocation}
              onValueChange={handleSameLocationChange}
            />
          </View>
        </ScrollView>
      )}
    </Layout>
  )
}

const styles = StyleSheet.create({
  master: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 10,
  },
  contentContainer: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
  },
  logo: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 10,
    maxWidth: 480,
  },
  logoMain: {
    color: '#f37022',
    fontSize: 70,
    fontWeight: '700',
    lineHeight: 125,
  },
  logoRegistered: {
    color: '#f37022',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 40,
  },
  component: {
    alignSelf: 'stretch',
    margin: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    borderTopWidth: 1,
    borderTopColor: '#ebebeb',
    alignSelf: 'stretch',
    flexDirection: 'row',
  },
  copyright: {
    fontSize: 12,
    color: '#70757a',
  },
  copyrightRegistered: {
    fontSize: 6,
    color: '#70757a',
    position: 'relative',
    top: -5,
  },
})

export default HomeScreen
