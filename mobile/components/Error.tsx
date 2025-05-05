import React from 'react'
import { StyleSheet, View, Text } from 'react-native'

interface ErrorProps {
  style?: object
  message: string
}

const Error = ({
  style,
  message
}: ErrorProps) => (
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
