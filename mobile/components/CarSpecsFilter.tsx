import React, { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'

import i18n from '@/lang/i18n'
import Accordion from './Accordion'
import Link from './Link'
import Switch from './Switch'

interface CarSpecsFilterProps {
  visible?: boolean
  style?: object
  onChange?: (value: bookcarsTypes.CarSpecs) => void
}

const CarSpecsFilter = ({
  visible,
  style,
  onChange
}: CarSpecsFilterProps) => {
  const [aircon, setAircon] = useState(false)
  const [moreThanFourDoors, setMoreThanFourDoors] = useState(false)
  const [moreThanFiveSeats, setMoreThanFiveSeats] = useState(false)
  const [value, setValue] = useState<bookcarsTypes.CarSpecs>({})
  const [allChecked, setAllChecked] = useState(false)

  const handleChange = (_value: bookcarsTypes.CarSpecs) => {
    if (onChange) {
      onChange(bookcarsHelper.clone(_value))
    }
  }

  const onValueChangeAircon = (checked: boolean) => {
    if (checked) {
      value.aircon = true

      if (value.aircon && value.moreThanFourDoors && value.moreThanFiveSeats) {
        setAllChecked(true)
      }
    } else {
      value.aircon = undefined

      if (!value.aircon || !value.moreThanFourDoors || !value.moreThanFiveSeats) {
        setAllChecked(false)
      }
    }

    setValue(value)
    handleChange(value)
  }

  const onValueChangeMoreThanFourDoors = (checked: boolean) => {
    if (checked) {
      value.moreThanFourDoors = true

      if (value.aircon && value.moreThanFourDoors && value.moreThanFiveSeats) {
        setAllChecked(true)
      }
    } else {
      value.moreThanFourDoors = undefined
      if (!value.aircon || !value.moreThanFourDoors || !value.moreThanFiveSeats) {
        setAllChecked(false)
      }
    }

    setValue(value)
    handleChange(value)
  }

  const onValueChangeMoreThanFiveSeats = (checked: boolean) => {
    if (checked) {
      value.moreThanFiveSeats = true

      if (value.aircon && value.moreThanFiveSeats && value.moreThanFiveSeats) {
        setAllChecked(true)
      }
    } else {
      value.moreThanFiveSeats = undefined
      if (!value.aircon || !value.moreThanFiveSeats || !value.moreThanFiveSeats) {
        setAllChecked(false)
      }
    }

    setValue(value)
    handleChange(value)
  }

  return (
    visible && (
      <View style={{ ...styles.container, ...style }}>
        <Accordion style={styles.accordion} title={i18n.t('CAR_SPECS')}>
          <View style={styles.contentContainer}>
            <Switch style={styles.component} textStyle={styles.text} value={aircon} label={i18n.t('AIRCON')} onValueChange={onValueChangeAircon} />
            <Switch style={styles.component} textStyle={styles.text} value={moreThanFourDoors} label={i18n.t('MORE_THAN_FOOR_DOORS')} onValueChange={onValueChangeMoreThanFourDoors} />
            <Switch style={styles.component} textStyle={styles.text} value={moreThanFiveSeats} label={i18n.t('MORE_THAN_FIVE_SEATS')} onValueChange={onValueChangeMoreThanFiveSeats} />
          </View>
          <Link
            style={styles.link}
            textStyle={styles.linkText}
            label={allChecked ? i18n.t('UNCHECK_ALL') : i18n.t('CHECK_ALL')}
            onPress={() => {
              if (allChecked) {
                setAircon(false)
                setMoreThanFourDoors(false)
                setMoreThanFiveSeats(false)
                setAllChecked(false)
                const _value: bookcarsTypes.CarSpecs = {}
                setValue(_value)
                handleChange(_value)
              } else {
                setAircon(true)
                setMoreThanFourDoors(true)
                setMoreThanFiveSeats(true)
                setAllChecked(true)
                const _value: bookcarsTypes.CarSpecs = { aircon: true, moreThanFourDoors: true, moreThanFiveSeats: true }
                setValue(_value)
                handleChange(_value)
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

export default CarSpecsFilter
