import React from 'react'
import { StyleSheet, View, Text } from 'react-native'

const Error = (
  {
    style,
    message
  }: {
    style?: object
    message: string
  }) => (
  <View style={style}>
    <Text style={styles.text}>{message}</Text>
  </View>
)

const styles = StyleSheet.create({
  text: {
    color: '#d32f2f',
  },
})

export default Error
