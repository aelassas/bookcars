import React, { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'

import i18n from '@/lang/i18n'
import Accordion from './Accordion'
import Link from './Link'
import Switch from './Switch'

interface CarTypeFilterProps {
  visible?: boolean
  style?: object
  onChange?: (values: bookcarsTypes.CarType[]) => void
}

const allTypes = bookcarsHelper.getAllCarTypes()

const CarTypeFilter = ({
  visible,
  style,
  onChange
}: CarTypeFilterProps) => {
  const [diesel, setDiesel] = useState(false)
  const [gasoline, setGasoline] = useState(false)
  const [electric, setElectric] = useState(false)
  const [hybrid, setHybrid] = useState(false)
  const [plugInHybrid, setPlugInHybrid] = useState(false)
  const [values, setValues] = useState<bookcarsTypes.CarType[]>([])
  const [allChecked, setAllChecked] = useState(false)

  const handleChange = (_values: bookcarsTypes.CarType[]) => {
    if (onChange) {
      onChange(_values.length === 0 ? allTypes : bookcarsHelper.clone(_values))
    }
  }

  const onValueChangeDiesel = (checked: boolean) => {
    if (checked) {
      values.push(bookcarsTypes.CarType.Diesel)

      if (values.length === allTypes.length) {
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
    handleChange(values)
  }

  const onValueChangeGasoline = (checked: boolean) => {
    if (checked) {
      values.push(bookcarsTypes.CarType.Gasoline)

      if (values.length === allTypes.length) {
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
    handleChange(values)
  }

  const onValueChangeElectric = (checked: boolean) => {
    if (checked) {
      values.push(bookcarsTypes.CarType.Electric)

      if (values.length === allTypes.length) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.CarType.Electric),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setElectric(checked)
    setValues(values)
    handleChange(values)
  }

  const onValueChangeHybrid = (checked: boolean) => {
    if (checked) {
      values.push(bookcarsTypes.CarType.Hybrid)

      if (values.length === allTypes.length) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.CarType.Hybrid),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setHybrid(checked)
    setValues(values)
    handleChange(values)
  }

  const onValueChangePlugInHybrid = (checked: boolean) => {
    if (checked) {
      values.push(bookcarsTypes.CarType.PlugInHybrid)

      if (values.length === allTypes.length) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.CarType.PlugInHybrid),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setPlugInHybrid(checked)
    setValues(values)
    handleChange(values)
  }

  return (
    visible && (
      <View style={{ ...styles.container, ...style }}>
        <Accordion style={styles.accordion} title={i18n.t('ENGINE')}>
          <View style={styles.contentContainer}>
            <Switch style={styles.component} textStyle={styles.text} value={diesel} label={i18n.t('DIESEL')} onValueChange={onValueChangeDiesel} />
            <Switch style={styles.component} textStyle={styles.text} value={gasoline} label={i18n.t('GASOLINE')} onValueChange={onValueChangeGasoline} />
            <Switch style={styles.component} textStyle={styles.text} value={electric} label={i18n.t('ELECTRIC')} onValueChange={onValueChangeElectric} />
            <Switch style={styles.component} textStyle={styles.text} value={hybrid} label={i18n.t('HYBRID')} onValueChange={onValueChangeHybrid} />
            <Switch style={styles.component} textStyle={styles.text} value={plugInHybrid} label={i18n.t('PLUG_IN_HYBRID')} onValueChange={onValueChangePlugInHybrid} />
          </View>
          <Link
            style={styles.link}
            textStyle={styles.linkText}
            label={allChecked ? i18n.t('UNCHECK_ALL') : i18n.t('CHECK_ALL')}
            onPress={() => {
              if (allChecked) {
                setDiesel(false)
                setGasoline(false)
                setElectric(false)
                setHybrid(false)
                setPlugInHybrid(false)
                setAllChecked(false)
                setValues([])
              } else {
                const _values = [bookcarsTypes.CarType.Diesel, bookcarsTypes.CarType.Gasoline]
                setDiesel(true)
                setGasoline(true)
                setElectric(true)
                setHybrid(true)
                setPlugInHybrid(true)
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

export default CarTypeFilter
