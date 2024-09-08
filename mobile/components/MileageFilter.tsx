import React, { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'

import i18n from '@/lang/i18n'
import Accordion from './Accordion'
import Link from './Link'
import Switch from './Switch'

interface MileageFilterProps {
  visible?: boolean
  style?: object
  onChange?: (values: bookcarsTypes.Mileage[]) => void
}

const MileageFilter = ({
  visible,
  style,
  onChange
}: MileageFilterProps) => {
  const [limited, setLimited] = useState(false)
  const [unlimited, setUnlimited] = useState(false)
  const [values, setValues] = useState<bookcarsTypes.Mileage[]>([])
  const [allChecked, setAllChecked] = useState(false)

  const handleChange = (_values: bookcarsTypes.Mileage[]) => {
    if (onChange) {
      onChange(_values.length === 0 ? [bookcarsTypes.Mileage.Limited, bookcarsTypes.Mileage.Unlimited] : bookcarsHelper.clone(_values))
    }
  }

  const onValueChangeLimited = (checked: boolean) => {
    if (checked) {
      values.push(bookcarsTypes.Mileage.Limited)

      if (values.length === 2) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.Mileage.Limited),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setLimited(checked)
    setValues(values)
    handleChange(values)
  }

  const onValueChangeUnlimited = (checked: boolean) => {
    if (checked) {
      values.push(bookcarsTypes.Mileage.Unlimited)

      if (values.length === 2) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.Mileage.Unlimited),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setUnlimited(checked)
    setValues(values)
    handleChange(values)
  }

  return (
    visible && (
      <View style={{ ...styles.container, ...style }}>
        <Accordion style={styles.accordion} title={i18n.t('MILEAGE')}>
          <View style={styles.contentContainer}>
            <Switch style={styles.component} textStyle={styles.text} value={limited} label={i18n.t('LIMITED')} onValueChange={onValueChangeLimited} />
            <Switch style={styles.component} textStyle={styles.text} value={unlimited} label={i18n.t('UNLIMITED')} onValueChange={onValueChangeUnlimited} />
          </View>
          <Link
            style={styles.link}
            textStyle={styles.linkText}
            label={allChecked ? i18n.t('UNCHECK_ALL') : i18n.t('CHECK_ALL')}
            onPress={() => {
              if (allChecked) {
                setLimited(false)
                setUnlimited(false)
                setAllChecked(false)
                setValues([])
              } else {
                const _values = [bookcarsTypes.Mileage.Limited, bookcarsTypes.Mileage.Unlimited]
                setLimited(true)
                setUnlimited(true)
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

export default MileageFilter
