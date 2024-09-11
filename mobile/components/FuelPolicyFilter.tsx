import React, { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'

import i18n from '@/lang/i18n'
import Accordion from './Accordion'
import Link from './Link'
import Switch from './Switch'

interface FuelPolicyFilterProps {
  visible?: boolean
  style?: object
  onChange?: (values: bookcarsTypes.FuelPolicy[]) => void
}

const allValues = bookcarsHelper.getAllFuelPolicies()

const FuelPolicyFilter = ({
  visible,
  style,
  onChange
}: FuelPolicyFilterProps) => {
  const [freeTank, setFreeTank] = useState(false)
  const [likeForLike, setlikeForLike] = useState(false)
  const [values, setValues] = useState<bookcarsTypes.FuelPolicy[]>([])
  const [allChecked, setAllChecked] = useState(false)

  const handleChange = (_values: bookcarsTypes.FuelPolicy[]) => {
    if (onChange) {
      onChange(_values.length === 0 ? allValues : bookcarsHelper.clone(_values))
    }
  }

  const onValueChangeFreeTank = (checked: boolean) => {
    if (checked) {
      values.push(bookcarsTypes.FuelPolicy.FreeTank)

      if (values.length === 2) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.FuelPolicy.FreeTank),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setFreeTank(checked)
    setValues(values)
    handleChange(values)
  }

  const onValueChangelikeForLike = (checked: boolean) => {
    if (checked) {
      values.push(bookcarsTypes.FuelPolicy.LikeForLike)

      if (values.length === 2) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.FuelPolicy.LikeForLike),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setlikeForLike(checked)
    setValues(values)
    handleChange(values)
  }

  return (
    visible && (
      <View style={{ ...styles.container, ...style }}>
        <Accordion style={styles.accordion} title={i18n.t('FUEL_POLICY')}>
          <View style={styles.contentContainer}>
            <Switch style={styles.component} textStyle={styles.text} value={freeTank} label={i18n.t('FUEL_POLICY_FREE_TANK')} onValueChange={onValueChangeFreeTank} />
            <Switch style={styles.component} textStyle={styles.text} value={likeForLike} label={i18n.t('FUEL_POLICY_LIKE_FOR_LIKE')} onValueChange={onValueChangelikeForLike} />
          </View>
          <Link
            style={styles.link}
            textStyle={styles.linkText}
            label={allChecked ? i18n.t('UNCHECK_ALL') : i18n.t('CHECK_ALL')}
            onPress={() => {
              if (allChecked) {
                setFreeTank(false)
                setlikeForLike(false)
                setAllChecked(false)
                setValues([])
              } else {
                const _values = allValues
                setFreeTank(true)
                setlikeForLike(true)
                setAllChecked(true)
                setValues(_values)
                handleChange(_values)
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

export default FuelPolicyFilter
