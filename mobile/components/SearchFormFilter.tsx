import React from 'react'
import { StyleSheet, View } from 'react-native'

import i18n from '@/lang/i18n'
import Accordion from './Accordion'
import SearchForm, { SearchFormProps } from './SearchForm'

type SearchFormFilterProps = SearchFormProps & {
  visible?: boolean
  style?: object
}

const SearchFormFilter = (
  {
    navigation,
    pickupLocation,
    dropOffLocation,
    pickupLocationText,
    dropOffLocationText,
    fromDate,
    fromTime,
    toDate,
    toTime,
    visible,
    style,
  }: SearchFormFilterProps
) => (
  visible && (
    <View style={{ ...styles.container, ...style }}>
      <Accordion style={styles.accordion} title={i18n.t('LOCATION_TERM')}>
        <View style={styles.contentContainer}>
          <SearchForm
            navigation={navigation}
            pickupLocation={pickupLocation}
            dropOffLocation={dropOffLocation}
            pickupLocationText={pickupLocationText}
            dropOffLocationText={dropOffLocationText}
            fromDate={fromDate}
            fromTime={fromTime}
            toDate={toDate}
            toTime={toTime}
            backgroundColor="#fff"
            size="small"
          />
        </View>
      </Accordion>
    </View>
  )
)

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
})

export default SearchFormFilter
