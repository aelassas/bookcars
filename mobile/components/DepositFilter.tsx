import React, { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import * as env from '@/config/env.config'
import i18n from '@/lang/i18n'
import Accordion from './Accordion'
import RadioButton from './RadioButton'

interface DepositFilterProps {
  visible?: boolean
  style?: object
  onChange?: (value: number) => void
}

const DepositFilter = ({
  visible,
  style,
  onChange
}: DepositFilterProps) => {
  const [depositValue1, setDepositValue1] = useState(false)
  const [depositValue2, setDepositValue2] = useState(false)
  const [depositValue3, setDepositValue3] = useState(false)
  const [depositall, setDepositall] = useState(true)

  const handleChange = (value: number) => {
    if (onChange) {
      onChange(value)
    }
  }

  const onValueChangeDepositValue1 = (checked: boolean) => {
    if (checked) {
      setDepositValue1(true)
      setDepositValue2(false)
      setDepositValue3(false)
      setDepositall(false)

      handleChange(env.DEPOSIT_FILTER_VALUE_1)
    }
  }

  const onValueChangeDepositValue2 = (checked: boolean) => {
    if (checked) {
      setDepositValue1(false)
      setDepositValue2(true)
      setDepositValue3(false)
      setDepositall(false)

      handleChange(env.DEPOSIT_FILTER_VALUE_2)
    }
  }

  const onValueChangeDepositValue3 = (checked: boolean) => {
    if (checked) {
      setDepositValue1(false)
      setDepositValue2(false)
      setDepositValue3(true)
      setDepositall(false)

      handleChange(env.DEPOSIT_FILTER_VALUE_3)
    }
  }

  const onValueChangeDepositall = (checked: boolean) => {
    if (checked) {
      const value = -1
      setDepositValue1(false)
      setDepositValue2(false)
      setDepositValue3(false)
      setDepositall(true)

      if (onChange) {
        onChange(value)
      }
    }
  }

  return (
    visible && (
      <View style={{ ...styles.container, ...style }}>
        <Accordion style={styles.accordion} title={i18n.t('DEPOSIT')}>
          <View style={styles.contentContainer}>
            <RadioButton style={styles.component} textStyle={styles.text} checked={depositValue1} label={i18n.t('DEPOSIT_LESS_THAN_VALUE_1')} onValueChange={onValueChangeDepositValue1} />
            <RadioButton style={styles.component} textStyle={styles.text} checked={depositValue2} label={i18n.t('DEPOSIT_LESS_THAN_VALUE_2')} onValueChange={onValueChangeDepositValue2} />
            <RadioButton style={styles.component} textStyle={styles.text} checked={depositValue3} label={i18n.t('DEPOSIT_LESS_THAN_VALUE_3')} onValueChange={onValueChangeDepositValue3} />
            <RadioButton style={styles.component} textStyle={styles.text} checked={depositall} label={i18n.t('ALL')} onValueChange={onValueChangeDepositall} />
          </View>
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
    paddingLeft: 10,
  },
  accordion: {
    width: '100%',
    maxWidth: 480,
  },
  component: {
    marginTop: -3,
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

export default DepositFilter
