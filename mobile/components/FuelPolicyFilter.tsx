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
  const [likeForLike, setLikeForLike] = useState(false)
  const [fullToFull, setFullToFull] = useState(false)
  const [fullToEmpty, setFullToEmpty] = useState(false)
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

      if (values.length === allValues.length) {
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

  const onValueChangeLikeForLike = (checked: boolean) => {
    if (checked) {
      values.push(bookcarsTypes.FuelPolicy.LikeForLike)

      if (values.length === allValues.length) {
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

    setLikeForLike(checked)
    setValues(values)
    handleChange(values)
  }

  const onValueChangeFullToFull = (checked: boolean) => {
    if (checked) {
      values.push(bookcarsTypes.FuelPolicy.FullToFull)

      if (values.length === allValues.length) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.FuelPolicy.FullToFull),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setFullToFull(checked)
    setValues(values)
    handleChange(values)
  }

  const onValueChangeFullToEmpty = (checked: boolean) => {
    if (checked) {
      values.push(bookcarsTypes.FuelPolicy.FullToEmpty)

      if (values.length === allValues.length) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.FuelPolicy.FullToEmpty),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setFullToEmpty(checked)
    setValues(values)
    handleChange(values)
  }

  return (
    visible && (
      <View style={{ ...styles.container, ...style }}>
        <Accordion style={styles.accordion} title={i18n.t('FUEL_POLICY')}>
          <View style={styles.contentContainer}>
            <Switch style={styles.component} textStyle={styles.text} value={freeTank} label={i18n.t('FUEL_POLICY_FREE_TANK')} onValueChange={onValueChangeFreeTank} />
            <Switch style={styles.component} textStyle={styles.text} value={likeForLike} label={i18n.t('FUEL_POLICY_LIKE_FOR_LIKE')} onValueChange={onValueChangeLikeForLike} />
            <Switch style={styles.component} textStyle={styles.text} value={fullToFull} label={i18n.t('FUEL_POLICY_FULL_TO_FULL')} onValueChange={onValueChangeFullToFull} />
            <Switch style={styles.component} textStyle={styles.text} value={fullToEmpty} label={i18n.t('FUEL_POLICY_FULL_TO_EMPTY')} onValueChange={onValueChangeFullToEmpty} />
          </View>
          <Link
            style={styles.link}
            textStyle={styles.linkText}
            label={allChecked ? i18n.t('UNCHECK_ALL') : i18n.t('CHECK_ALL')}
            onPress={() => {
              if (allChecked) {
                setFreeTank(false)
                setLikeForLike(false)
                setAllChecked(false)
                setValues([])
              } else {
                const _values = allValues
                setFreeTank(true)
                setLikeForLike(true)
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
