import React, { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import i18n from '@/lang/i18n'
import Accordion from './Accordion'
import RadioButton from './RadioButton'

interface CarRatingFilterProps {
  visible?: boolean
  style?: object
  onChange?: (value: number) => void
}

const CarRatingFilter = ({
  visible,
  style,
  onChange
}: CarRatingFilterProps) => {
  const [rating1, setRating1] = useState(false)
  const [rating2, setRating2] = useState(false)
  const [rating3, setRating3] = useState(false)
  const [rating4, setRating4] = useState(false)
  const [any, setAny] = useState(true)

  const handleChange = (value: number) => {
    if (onChange) {
      onChange(value)
    }
  }

  const onValueChangeValue1 = (checked: boolean) => {
    if (checked) {
      setRating1(true)
      setRating2(false)
      setRating3(false)
      setRating4(false)
      setAny(false)

      handleChange(1)
    }
  }

  const onValueChangeValue2 = (checked: boolean) => {
    if (checked) {
      setRating1(false)
      setRating2(true)
      setRating3(false)
      setRating4(false)
      setAny(false)

      handleChange(2)
    }
  }

  const onValueChangeValue3 = (checked: boolean) => {
    if (checked) {
      setRating1(false)
      setRating2(false)
      setRating3(true)
      setRating4(false)
      setAny(false)

      handleChange(3)
    }
  }

  const onValueChangeValue4 = (checked: boolean) => {
    if (checked) {
      setRating1(false)
      setRating2(false)
      setRating3(false)
      setRating4(true)
      setAny(false)

      handleChange(4)
    }
  }

  const onValueChangeAny = (checked: boolean) => {
    if (checked) {
      setRating1(false)
      setRating2(false)
      setRating3(false)
      setRating4(false)
      setAny(true)

      handleChange(-1)
    }
  }

  return (
    visible && (
      <View style={{ ...styles.container, ...style }}>
        <Accordion style={styles.accordion} title={i18n.t('RATING')}>
          <View style={styles.contentContainer}>
            <RadioButton style={styles.component} textStyle={styles.text} checked={rating1} label={i18n.t('RATING_1')} onValueChange={onValueChangeValue1} />
            <RadioButton style={styles.component} textStyle={styles.text} checked={rating2} label={i18n.t('RATING_2')} onValueChange={onValueChangeValue2} />
            <RadioButton style={styles.component} textStyle={styles.text} checked={rating3} label={i18n.t('RATING_3')} onValueChange={onValueChangeValue3} />
            <RadioButton style={styles.component} textStyle={styles.text} checked={rating4} label={i18n.t('RATING_4')} onValueChange={onValueChangeValue4} />
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
  link: {
    marginTop: 10,
  },
  linkText: {
    fontSize: 12,
  },
})

export default CarRatingFilter
