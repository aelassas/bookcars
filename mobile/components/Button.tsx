import React from 'react'
import { StyleSheet, Text, Pressable } from 'react-native'

interface ButtonProps {
  size?: 'small'
  color?: string
  style?: object
  label: string
  onPress?: () => void
}

const Button = ({
  size,
  color,
  style,
  label,
  onPress: onButtonPress
}: ButtonProps) => {
  const small = size === 'small'

  const onPress = () => {
    if (onButtonPress) {
      onButtonPress()
    }
  }

  const styles = StyleSheet.create({
    button: {
      height: small ? 37 : 55,
      borderRadius: 10,
      backgroundColor: color === 'secondary' ? '#999' : '#f37022',
      alignItems: 'center',
      justifyContent: 'center',
      maxWidth: 480,
    },
    text: {
      color: '#fff',
      textTransform: 'uppercase',
      fontSize: small ? 14 : 17,
      fontWeight: '600',
    },
  })

  return (
    <Pressable style={{ ...style, ...styles.button }} onPress={onPress}>
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  )
}

export default Button
