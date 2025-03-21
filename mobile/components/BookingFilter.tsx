import React, { useEffect, useRef, useState } from 'react'
import { StyleSheet, View, TextInput as ReactTextInput } from 'react-native'
import * as bookcarsTypes from ':bookcars-types'

import i18n from '@/lang/i18n'
import Accordion from './Accordion'
import Button from './Button'
import DateTimePicker from './DateTimePicker'
import LocationSelectList from './LocationSelectList'
import TextInput from './TextInput'

interface BookingFilterProps {
  visible?: boolean
  style?: object
  backgroundColor?: string
  language?: string
  onSubmit: (filter: bookcarsTypes.Filter) => void
}

const BookingFilter = ({
  visible,
  style,
  backgroundColor = '#F5F5F5',
  language,
  onSubmit
}: BookingFilterProps) => {
  const [init, setInit] = useState(false)
  const [from, setFrom] = useState<Date | undefined>(undefined)
  const [to, setTo] = useState<Date | undefined>(undefined)
  const [blur, setBlur] = useState(false)
  const [closePickupLocation, setClosePickupLocation] = useState(false)
  const [closeDropOffLocation, setCloseDropOffLocation] = useState(false)
  const [pickupLocation, setPickupLocation] = useState<string>()
  const [dropOffLocation, setDropOffLocation] = useState<string>()
  const [keyword, setKeyword] = useState('')
  const [minDate, setMinDate] = useState<Date>()

  const searchRef = useRef<ReactTextInput>(null)

  const _init = async () => {
    setInit(false)
    setKeyword('')
    setPickupLocation(undefined)
    setDropOffLocation(undefined)
    if (searchRef.current) {
      searchRef.current.clear()
    }
    setInit(true)
  }

  useEffect(() => {
    _init()
  }, [])

  const blurLocations = () => {
    setBlur(true)
    setClosePickupLocation(true)
    setCloseDropOffLocation(true)
  }

  const handlePickupLocationSelect = (_pickupLocation: string) => {
    setPickupLocation(_pickupLocation)
  }

  const handleDropOffLocationSelect = (_dropOffLocation: string) => {
    setDropOffLocation(_dropOffLocation)
  }

  const onPressSearch = () => {
    const filter: bookcarsTypes.Filter = {
      from,
      to,
      pickupLocation,
      dropOffLocation,
      keyword
    }

    if (onSubmit) {
      onSubmit(filter)
    }
  }

  return (
    init
    && visible && (
      <View style={{ ...styles.container, ...style }}>
        <Accordion style={styles.accordion} title={i18n.t('SEARCH')}>
          <DateTimePicker
            mode="date"
            backgroundColor={backgroundColor}
            locale={language}
            style={styles.component}
            size="small"
            label={i18n.t('FROM')}
            value={from}
            onChange={(date) => {
              if (date) {
                date.setHours(12, 0, 0, 0)

                if (to && to.getTime() <= date.getTime()) {
                  setTo(undefined)
                }

                const _minDate = new Date(date)
                _minDate.setDate(date.getDate() + 1)
                setMinDate(_minDate)
              } else {
                setMinDate(undefined)
              }

              setFrom(date)
            }}
            onPress={blurLocations}
          />

          <DateTimePicker
            mode="date"
            backgroundColor={backgroundColor}
            locale={language}
            style={styles.component}
            size="small"
            label={i18n.t('TO')}
            value={to}
            minDate={minDate}
            onChange={(date) => {
              if (date) {
                date.setHours(12, 0, 0, 0)
              }
              setTo(date)
            }}
            onPress={blurLocations}
          />

          <LocationSelectList
            backgroundColor={backgroundColor}
            placeholderTextColor="#a3a3a3"
            label={i18n.t('PICKUP_LOCATION')}
            style={styles.component}
            size="small"
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

          <LocationSelectList
            backgroundColor={backgroundColor}
            placeholderTextColor="#a3a3a3"
            label={i18n.t('DROP_OFF_LOCATION')}
            style={styles.component}
            size="small"
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

          <TextInput
            ref={searchRef}
            backgroundColor={backgroundColor}
            style={styles.component}
            size="small"
            hideLabel
            label={i18n.t('SEARCH_PLACEHOLDER')}
            value={keyword}
            onChangeText={setKeyword}
          />

          <Button style={styles.component} size="small" label={i18n.t('SEARCH')} onPress={onPressSearch} />
        </Accordion>
      </View>
    )
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  accordion: {
    width: '100%',
    maxWidth: 480,
  },
  component: {
    alignSelf: 'stretch',
    margin: 10,
  },
})

export default BookingFilter
