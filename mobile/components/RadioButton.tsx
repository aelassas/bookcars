import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'

interface RadioButtonProps {
  checked: boolean
  style?: object
  textStyle?: object
  label: string
  onValueChange?: (_checked: boolean) => void
}

const RadioButton = ({
  checked,
  style,
  textStyle,
  label,
  onValueChange: onRadioButtonValueChange
}: RadioButtonProps) => {
  const onPress = () => {
    if (onRadioButtonValueChange) {
      onRadioButtonValueChange(!checked)
    }
  }

  return (
    <View style={{ ...styles.container, ...style }}>
      <MaterialIcons name={checked ? 'radio-button-on' : 'radio-button-off'} size={18} color="#f37022" onPress={onPress} />
      <Pressable style={styles.pressable} onPress={onPress}>
        <Text style={{ ...styles.text, ...textStyle }}>{label}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    display: 'flex',
    alignItems: 'center',
    maxWidth: 480,
  },
  pressable: {
    flexShrink: 1,
  },
  text: {
    color: 'rgba(0, 0, 0, .7)',
    padding: 5,
  },
})

export default RadioButton
