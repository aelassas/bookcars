import React, { useEffect, useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Switch as ReactSwitch
} from 'react-native'

interface SwitchProps {
  value?: boolean
  style?: object
  textStyle?: object
  label?: string
  disabled?: boolean
  children?: React.ReactNode
  onValueChange?: (value: boolean) => void
}

const Switch = ({
  value: switchValue,
  style,
  textStyle,
  label,
  disabled,
  children,
  onValueChange: onSwitchValueChange
}: SwitchProps) => {
  const [value, setValue] = useState(switchValue)

  useEffect(() => {
    setValue(switchValue)
  }, [switchValue])

  const onValueChange = (_value: boolean) => {
    setValue(_value)
    if (onSwitchValueChange) {
      onSwitchValueChange(_value)
    }
  }

  const onPress = () => {
    if (!disabled) {
      onValueChange(!value)
    }
  }

  return (
    <View style={{ ...styles.container, ...style }}>
      <ReactSwitch trackColor={{ true: '#f7b68f', false: '#9d9d9d' }} thumbColor="#f37022" value={value} onValueChange={onValueChange} disabled={disabled} />
      {typeof label !== 'undefined' && (
        <Pressable style={styles.pressable} onPress={onPress}>
          <Text style={{ ...styles.text, ...textStyle }}>{label}</Text>
        </Pressable>
      )}
      {typeof children !== 'undefined' && (
        <Pressable style={styles.children} onPress={onPress}>
          {children}
        </Pressable>
      )}
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
  children: {
    marginLeft: 5,
  },
})

export default Switch
