import type { FC } from 'react'
import React, { memo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { withFadeAnimation } from './HOC/withFadeAnimation'

interface NothingFoundProps {
  emptyResultText?: string
}

export const NothingFound: FC<NothingFoundProps> = memo(({ ...props }) => {
  const EL = withFadeAnimation(
    () => (
      <View style={{ ...styles.container }}>
        <Text style={styles.text}>{props.emptyResultText || 'Nothing found'}</Text>
      </View>
    ),
    {},
  )
  return <EL />
})

const styles = StyleSheet.create({
  container: {
    padding: 10,
  },
  text: { textAlign: 'center' },
})
