import React, { useState, useEffect } from 'react'
import { StyleSheet, View, Pressable, Text } from 'react-native'
import ReactDateTimePicker from '@react-native-community/datetimepicker'
import { format } from 'date-fns'
import { enUS, fr } from 'date-fns/locale'
import * as bookcarsHelper from '../miscellaneous/bookcarsHelper'

import * as Env from '../config/env.config'

const DateTimePicker = (
  {
    value: dateTimeValue,
    locale: dateTimeLocale,
    mode,
    size,
    label: dateTimeLabel,
    backgroundColor,
    error,
    style,
    helperText,
    minimumDate,
    onPress,
    onChange
  }: {
    value?: Date
    locale?: string,
    mode?: 'date' | 'datetime' | 'time' | 'countdown'
    size?: 'small'
    label: string
    backgroundColor?: string
    error?: boolean
    style?: object
    helperText?: string
    minimumDate?: Date
    onPress?: () => void
    onChange?: (date: Date) => void
  }
) => {
  const [label, setLabel] = useState('')
  const [value, setValue] = useState<Date | undefined>(dateTimeValue)
  const [show, setShow] = useState(false)
  const [locale, setLoacle] = useState(dateTimeLocale === Env.LANGUAGE.FR ? fr : enUS)
  const _format = mode === 'date' ? 'eeee, d LLLL yyyy' : 'kk:mm'
  const now = new Date()
  const small = size === 'small'

  useEffect(() => {
    const _locale = dateTimeLocale === Env.LANGUAGE.FR ? fr : enUS
    setLoacle(_locale)
    setLabel((value && bookcarsHelper.capitalize(format(value, _format, { locale: _locale }))) || dateTimeLabel)
  }, [dateTimeLocale]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setValue(dateTimeValue)
    setLabel((value && bookcarsHelper.capitalize(format(value, _format, { locale }))) || dateTimeLabel)
  }, [dateTimeValue]) // eslint-disable-line react-hooks/exhaustive-deps

  const styles = StyleSheet.create({
    container: {
      maxWidth: 480,
    },
    label: {
      backgroundColor: backgroundColor ?? '#fafafa',
      color: 'rgba(0, 0, 0, 0.6)',
      fontSize: 12,
      fontWeight: '400',
      paddingRight: 5,
      paddingLeft: 5,
      marginLeft: 15,
      position: 'absolute',
      top: -10,
      zIndex: 1,
    },
    dateContainer: {
      alignSelf: 'stretch',
      height: small ? 37 : 55,
      fontSize: small ? 14 : 16,
      borderWidth: 1,
      borderRadius: 10,
      borderColor: error ? '#d32f2f' : 'rgba(0, 0, 0, 0.23)',
      backgroundColor: backgroundColor ?? '#fafafa',
    },
    dateButton: {
      height: 55,
      alignSelf: 'stretch',
      flexDirection: 'row',
    },
    dateText: {
      flex: 1,
      fontSize: small ? 14 : 16,
      paddingTop: small ? 8 : 15,
      paddingRight: 15,
      paddingBottom: small ? 8 : 15,
      paddingLeft: 15,
    },
    helperText: {
      color: error ? '#d32f2f' : 'rgba(0, 0, 0, 0.23)',
      fontSize: 12,
      fontWeight: '400',
      paddingLeft: 5,
    },
  })

  return (
    <View style={{ ...style, ...styles.container }}>
      {value && <Text style={styles.label}>{dateTimeLabel}</Text>}
      <View style={styles.dateContainer}>
        <Pressable
          style={styles.dateButton}
          onPress={() => {
            setShow(true)
            if (onPress) {
              onPress()
            }
          }}
        >
          <Text
            style={{
              ...styles.dateText,
              color: value ? 'rgba(0, 0, 0, 0.87)' : 'rgba(0, 0, 0, .4)',
            }}
          >
            {label}
          </Text>
        </Pressable>
        {helperText && <Text style={styles.helperText}>{helperText}</Text>}
        {show && (
          <ReactDateTimePicker
            mode={mode}
            value={value ?? now}
            minimumDate={minimumDate}
            onChange={(event, date) => {
              setShow(false)
              if (date && date.getTime() !== now.getTime()) {
                setValue(date)
                if (onChange) {
                  onChange(date)
                }
              }
            }}
          />
        )}
      </View>
    </View>
  )
}

export default DateTimePicker
