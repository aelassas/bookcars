import React, { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'

import i18n from '@/lang/i18n'
import Accordion from './Accordion'
import Link from './Link'
import Switch from './Switch'

interface CarMultimediaFilterProps {
  visible?: boolean
  style?: object
  onChange?: (values: bookcarsTypes.CarMultimedia[]) => void
}

const allMultimedias = bookcarsHelper.getAllMultimedias()

const CarMultimediaFilter = ({
  visible,
  style,
  onChange
}: CarMultimediaFilterProps) => {
  const [mini, setTouchscreen] = useState(false)
  const [midi, setBluetooth] = useState(false)
  const [maxi, setAndroidAuto] = useState(false)
  const [scooter, setAppleCarPlay] = useState(false)
  const [values, setValues] = useState<bookcarsTypes.CarMultimedia[]>([])
  const [allChecked, setAllChecked] = useState(false)

  const handleChange = (_values: bookcarsTypes.CarMultimedia[]) => {
    if (onChange) {
      // onChange(_values.length === 0 ? allMultimedias : bookcarsHelper.clone(_values))
      onChange(bookcarsHelper.clone(_values))
    }
  }

  const onValueChangeTouchscreen = (checked: boolean) => {
    if (checked) {
      values.push(bookcarsTypes.CarMultimedia.Touchscreen)

      if (values.length === allMultimedias.length) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.CarMultimedia.Touchscreen),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setTouchscreen(checked)
    setValues(values)
    handleChange(values)
  }

  const onValueChangeBluetooth = (checked: boolean) => {
    if (checked) {
      values.push(bookcarsTypes.CarMultimedia.Bluetooth)

      if (values.length === allMultimedias.length) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.CarMultimedia.Bluetooth),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setBluetooth(checked)
    setValues(values)
    handleChange(values)
  }

  const onValueChangeAndroidAuto = (checked: boolean) => {
    if (checked) {
      values.push(bookcarsTypes.CarMultimedia.AndroidAuto)

      if (values.length === allMultimedias.length) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.CarMultimedia.AndroidAuto),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setAndroidAuto(checked)
    setValues(values)
    handleChange(values)
  }

  const onValueChangeAppleCarPlay = (checked: boolean) => {
    if (checked) {
      values.push(bookcarsTypes.CarMultimedia.AppleCarPlay)

      if (values.length === allMultimedias.length) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.CarMultimedia.AppleCarPlay),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setAppleCarPlay(checked)
    setValues(values)
    handleChange(values)
  }

  return (
    visible && (
      <View style={{ ...styles.container, ...style }}>
        <Accordion style={styles.accordion} title={i18n.t('CAR_MULTIMEDIA')}>
          <View style={styles.contentContainer}>
            <Switch style={styles.component} textStyle={styles.text} value={mini} label={i18n.t('CAR_MULTIMEDIA_TOUCHSCREEN')} onValueChange={onValueChangeTouchscreen} />
            <Switch style={styles.component} textStyle={styles.text} value={midi} label={i18n.t('CAR_MULTIMEDIA_BLUETOOTH')} onValueChange={onValueChangeBluetooth} />
            <Switch style={styles.component} textStyle={styles.text} value={maxi} label={i18n.t('CAR_MULTIMEDIA_ANDROID_AUTO')} onValueChange={onValueChangeAndroidAuto} />
            <Switch style={styles.component} textStyle={styles.text} value={scooter} label={i18n.t('CAR_MULTIMEDIA_APPLE_CAR_PLAY')} onValueChange={onValueChangeAppleCarPlay} />
          </View>
          <Link
            style={styles.link}
            textStyle={styles.linkText}
            label={allChecked ? i18n.t('UNCHECK_ALL') : i18n.t('CHECK_ALL')}
            onPress={() => {
              if (allChecked) {
                setTouchscreen(false)
                setBluetooth(false)
                setAndroidAuto(false)
                setAppleCarPlay(false)
                setAllChecked(false)
                setValues([])
              } else {
                const _values = allMultimedias
                setTouchscreen(true)
                setBluetooth(true)
                setAndroidAuto(true)
                setAppleCarPlay(true)
                setAllChecked(true)
                setValues(_values)
                if (onChange) {
                  onChange(bookcarsHelper.clone(_values))
                }
              }
            }}
          />
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
  contentContainer: {
    width: '100%',
    alignItems: 'flex-start',
    marginTop: 10,
  },
  accordion: {
    width: '100%',
    maxWidth: 480,
  },
  component: {
    marginTop: 0,
  },
  text: {
    fontSize: 12,
  },
  link: {
    marginTop: 10,
  },
  linkText: {
    fontSize: 12,
  },
})

export default CarMultimediaFilter
