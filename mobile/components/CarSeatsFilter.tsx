import React, { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import i18n from '@/lang/i18n'
import RadioButton from './RadioButton'
import Accordion from './Accordion'

interface CarSeatsFilterProps {
  visible?: boolean
  style?: object
  onChange?: (value: number) => void
}

const CarSeatsFilter = ({
  visible,
  style,
  onChange
}: CarSeatsFilterProps) => {
  const [two, setTwo] = useState(false)
  const [four, setFour] = useState(false)
  const [five, setFive] = useState(false)
  const [fivePlus, setFivePlus] = useState(false)
  const [any, setAny] = useState(true)

  const handleOnChange = (value: number) => {
    if (onChange) {
      onChange(value)
    }
  }

  const onValueChangeTwo = (checked: boolean) => {
    setTwo(checked)
    if (checked) {
      setFour(false)
      setFive(false)
      setFivePlus(false)
      setAny(false)
    }
    handleOnChange(2)
  }

  const onValueChangeFour = (checked: boolean) => {
    setFour(checked)
    if (checked) {
      setTwo(false)
      setFive(false)
      setFivePlus(false)
      setAny(false)
    }
    handleOnChange(4)
  }

  const onValueChangeFive = (checked: boolean) => {
    setFive(checked)
    if (checked) {
      setTwo(false)
      setFour(false)
      setFivePlus(false)
      setAny(false)
    }
    handleOnChange(5)
  }

  const onValueChangeFivePlus = (checked: boolean) => {
    setFivePlus(checked)
    if (checked) {
      setTwo(false)
      setFour(false)
      setFive(false)
      setAny(false)
    }
    handleOnChange(6)
  }

  const onValueChangeAny = (checked: boolean) => {
    setAny(checked)
    if (checked) {
      setTwo(false)
      setFour(false)
      setFive(false)
      setFivePlus(false)
    }
    handleOnChange(-1)
  }

  return (
    visible && (
      <View style={{ ...styles.container, ...style }}>
        <Accordion style={styles.accordion} title={i18n.t('CAR_SEATS')}>
          <View style={styles.contentContainer}>
            <RadioButton style={styles.component} textStyle={styles.text} checked={two} label={i18n.t('CAR_SEATS_TWO')} onValueChange={onValueChangeTwo} />
            <RadioButton style={styles.component} textStyle={styles.text} checked={four} label={i18n.t('CAR_SEATS_FOUR')} onValueChange={onValueChangeFour} />
            <RadioButton style={styles.component} textStyle={styles.text} checked={five} label={i18n.t('CAR_SEATS_FIVE')} onValueChange={onValueChangeFive} />
            <RadioButton style={styles.component} textStyle={styles.text} checked={fivePlus} label={i18n.t('CAR_SEATS_FIVE_PLUS')} onValueChange={onValueChangeFivePlus} />
            <RadioButton style={styles.component} textStyle={styles.text} checked={any} label={i18n.t('ANY')} onValueChange={onValueChangeAny} />
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
})

export default CarSeatsFilter
