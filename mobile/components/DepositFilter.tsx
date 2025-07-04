import React, { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'

import * as env from '@/config/env.config'
import i18n from '@/lang/i18n'
import Accordion from './Accordion'
import RadioButton from './RadioButton'
import * as helper from '@/utils/helper'

interface DepositFilterProps {
  language: string
  visible?: boolean
  style?: object
  onChange?: (value: number) => void
}

const DepositFilter = ({
  language,
  visible,
  style,
  onChange
}: DepositFilterProps) => {
  const [depositValue1, setDepositValue1] = useState(false)
  const [depositValue2, setDepositValue2] = useState(false)
  const [depositValue3, setDepositValue3] = useState(false)
  const [depositall, setDepositall] = useState(true)
  const [depositValue1Text, setDepositValue1Text] = useState('')
  const [depositValue2Text, setDepositValue2Text] = useState('')
  const [depositValue3Text, setDepositValue3Text] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      setDepositValue1Text(await helper.getDepositFilterValue(language, 'value1'))
      setDepositValue2Text(await helper.getDepositFilterValue(language, 'value2'))
      setDepositValue3Text(await helper.getDepositFilterValue(language, 'value3'))
      setLoading(false)
    }

    init()
  }, [language])

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
    !loading && visible && (
      <View style={{ ...styles.container, ...style }}>
        <Accordion style={styles.accordion} title={i18n.t('DEPOSIT')}>
          <View style={styles.contentContainer}>
            <RadioButton style={styles.component} textStyle={styles.text} checked={depositValue1} label={depositValue1Text} onValueChange={onValueChangeDepositValue1} />
            <RadioButton style={styles.component} textStyle={styles.text} checked={depositValue2} label={depositValue2Text} onValueChange={onValueChangeDepositValue2} />
            <RadioButton style={styles.component} textStyle={styles.text} checked={depositValue3} label={depositValue3Text} onValueChange={onValueChangeDepositValue3} />
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
