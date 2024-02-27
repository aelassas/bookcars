import React, { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import * as bookcarsTypes from '../miscellaneous/bookcarsTypes'
import * as bookcarsHelper from '../miscellaneous/bookcarsHelper'

import i18n from '../lang/i18n'
import Accordion from './Accordion'
import Link from './Link'
import Switch from './Switch'

interface FuelFilterProps {
  visible?: boolean
  style?: object
  onChange?: (values: bookcarsTypes.CarType[]) => void
}

const FuelFilter = ({
  visible,
  style,
  onChange
}: FuelFilterProps) => {
  const [diesel, setDiesel] = useState(true)
  const [gasoline, setGasoline] = useState(true)
  const [values, setValues] = useState([bookcarsTypes.CarType.Diesel, bookcarsTypes.CarType.Gasoline])
  const [allChecked, setAllChecked] = useState(true)

  const onValueChangeDiesel = (checked: boolean) => {
    if (checked) {
      values.push(bookcarsTypes.CarType.Diesel)

      if (values.length === 2) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.CarType.Diesel),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setDiesel(checked)
    setValues(values)
    if (onChange) {
      onChange(bookcarsHelper.clone(values))
    }
  }

  const onValueChangeGasoline = (checked: boolean) => {
    if (checked) {
      values.push(bookcarsTypes.CarType.Gasoline)

      if (values.length === 2) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.CarType.Gasoline),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setGasoline(checked)
    setValues(values)
    if (onChange) {
      onChange(bookcarsHelper.clone(values))
    }
  }

  return (
    visible && (
      <View style={{ ...styles.container, ...style }}>
        <Accordion style={styles.accordion} title={i18n.t('ENGINE')}>
          <View style={styles.contentContainer}>
            <Switch style={styles.component} textStyle={styles.text} value={diesel} label={i18n.t('DIESEL')} onValueChange={onValueChangeDiesel} />
            <Switch style={styles.component} textStyle={styles.text} value={gasoline} label={i18n.t('GASOLINE')} onValueChange={onValueChangeGasoline} />
          </View>
          <Link
            style={styles.link}
            textStyle={styles.linkText}
            label={allChecked ? i18n.t('UNCHECK_ALL') : i18n.t('CHECK_ALL')}
            onPress={() => {
              if (allChecked) {
                setDiesel(false)
                setGasoline(false)
                setAllChecked(false)
                setValues([])
              } else {
                const _values = [bookcarsTypes.CarType.Diesel, bookcarsTypes.CarType.Gasoline]
                setDiesel(true)
                setGasoline(true)
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

export default FuelFilter
