import React from 'react'
import { StyleSheet, Text, Pressable } from 'react-native'

function Link({
    style,
    textStyle,
    label,
    onPress: onLinkPress
  }: {
    style?: object
    textStyle?: object
    label: string
    onPress?: () => void
  }) {
  const onPress = () => {
    if (onLinkPress) {
      onLinkPress()
    }
  }

  return (
    <Pressable style={style} onPress={onPress}>
      <Text style={{ ...styles.text, ...textStyle }}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  text: {
    color: '#1976d2',
    textDecorationLine: 'underline',
  },
})

export default Link
