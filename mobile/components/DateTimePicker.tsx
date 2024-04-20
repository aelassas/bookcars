import React, { useState, useEffect } from 'react'
import { StyleSheet, View, Pressable, Text } from 'react-native'
import ReactDateTimePicker from '@react-native-community/datetimepicker'
import { format } from 'date-fns'
import { enUS, fr } from 'date-fns/locale'
import { MaterialIcons } from '@expo/vector-icons'
import * as bookcarsHelper from ':bookcars-helper'

interface DateTimePickerProps {
  value?: Date
  locale?: string,
  mode?: 'date' | 'datetime' | 'time' | 'countdown'
  size?: 'small'
  label: string
  backgroundColor?: string
  error?: boolean
  style?: object
  helperText?: string
  minDate?: Date
  maxDate?: Date
  readOnly?: boolean
  hideClearButton?: boolean
  onPress?: () => void
  onChange?: (date: Date | undefined) => void
}

const DateTimePicker = ({
  value: dateTimeValue,
  locale: dateTimeLocale,
  mode,
  size,
  label: dateTimeLabel,
  backgroundColor,
  error,
  style,
  helperText,
  minDate,
  maxDate,
  readOnly,
  hideClearButton,
  onPress,
  onChange
}: DateTimePickerProps) => {
  const [label, setLabel] = useState('')
  const [value, setValue] = useState<Date | undefined>(dateTimeValue)
  const [show, setShow] = useState(false)
  const [locale, setLoacle] = useState(dateTimeLocale === 'fr' ? fr : enUS)
  const _format = mode === 'date' ? 'eeee, d LLLL yyyy' : 'kk:mm'
  const now = new Date()
  const small = size === 'small'

  useEffect(() => {
    const _locale = dateTimeLocale === 'fr' ? fr : enUS
    setLoacle(_locale)
    setLabel((value && bookcarsHelper.capitalize(format(value, _format, { locale: _locale }))) || dateTimeLabel)
  }, [dateTimeLocale]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setValue(dateTimeValue)
    setLabel((dateTimeValue && bookcarsHelper.capitalize(format(dateTimeValue, _format, { locale }))) || dateTimeLabel)
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
    clear: {
      flex: 0,
      position: 'absolute',
      right: 10,
      top: small ? 7 : 17,
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
          {!readOnly && value !== undefined && !hideClearButton && (
            <MaterialIcons
              style={styles.clear}
              name="clear"
              size={22}
              color="rgba(0, 0, 0, 0.28)"
              onPress={() => {
                setLabel(dateTimeLabel)
                setValue(undefined)
                if (onChange) {
                  onChange(undefined)
                }
              }}
            />
          )}
        </Pressable>
        {helperText && <Text style={styles.helperText}>{helperText}</Text>}
        {show && (
          <ReactDateTimePicker
            mode={mode}
            value={value || now}
            minimumDate={minDate}
            maximumDate={maxDate}
            onChange={(event, date) => {
              setShow(false)
              if (event.type === 'set' && date) {
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
