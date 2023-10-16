import React from 'react'
import { StyleSheet, View, Text } from 'react-native'

interface ErrorProps {
  style?: object
  message: string
}

function Error({
  style,
  message
}: ErrorProps) {
  return (
    <View style={style}>
      <Text style={styles.text}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  text: {
    color: '#d32f2f',
  },
})

export default Error
