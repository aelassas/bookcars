import React, { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import i18n from '../lang/i18n'
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
  const [deposit2500, setDeposit2500] = useState(false)
  const [deposit5000, setDeposit5000] = useState(false)
  const [deposit7500, setDeposit7500] = useState(false)
  const [depositall, setDepositall] = useState(true)

  const onValueChangeDeposit2500 = (checked: boolean) => {
    if (checked) {
      const value = 2500
      setDeposit2500(true)
      setDeposit5000(false)
      setDeposit7500(false)
      setDepositall(false)

      if (onChange) {
        onChange(value)
      }
    }
  }

  const onValueChangeDeposit5000 = (checked: boolean) => {
    if (checked) {
      const value = 5000
      setDeposit2500(false)
      setDeposit5000(true)
      setDeposit7500(false)
      setDepositall(false)

      if (onChange) {
        onChange(value)
      }
    }
  }

  const onValueChangeDeposit7500 = (checked: boolean) => {
    if (checked) {
      const value = 7500
      setDeposit2500(false)
      setDeposit5000(false)
      setDeposit7500(true)
      setDepositall(false)

      if (onChange) {
        onChange(value)
      }
    }
  }

  const onValueChangeDepositall = (checked: boolean) => {
    if (checked) {
      const value = -1
      setDeposit2500(false)
      setDeposit5000(false)
      setDeposit7500(false)
      setDepositall(true)

      if (onChange) {
        onChange(value)
      }
    }
  }

  return null

  // TODO
  return (
    visible && (
      <View style={{ ...styles.container, ...style }}>
        <Accordion style={styles.accordion} title={i18n.t('DEPOSIT')}>
          <View style={styles.contentContainer}>
            <RadioButton style={styles.component} textStyle={styles.text} checked={deposit2500} label={i18n.t('LESS_THAN_2500')} onValueChange={onValueChangeDeposit2500} />
            <RadioButton style={styles.component} textStyle={styles.text} checked={deposit5000} label={i18n.t('LESS_THAN_5000')} onValueChange={onValueChangeDeposit5000} />
            <RadioButton style={styles.component} textStyle={styles.text} checked={deposit7500} label={i18n.t('LESS_THAN_7500')} onValueChange={onValueChangeDeposit7500} />
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
