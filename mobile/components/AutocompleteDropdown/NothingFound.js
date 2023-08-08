import React, { memo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { withFadeAnimation } from './HOC/withFadeAnimation'

const EmptyResult = ({ ...props }) => {
  const EL = withFadeAnimation(
    () => (
      <View style={{ ...styles.container }}>
        <Text style={styles.text}>{props.emptyResultText || 'Nothing found'}</Text>
      </View>
    ),
    {},
  )
  return <EL />
}

export const NothingFound = memo(EmptyResult)

const styles = StyleSheet.create({
  container: {
    padding: 10,
  },
  text: { textAlign: 'center' },
})
