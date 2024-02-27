import React from 'react'
import { Pressable, StyleSheet } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'

interface CheckboxProps {
  indeterminate?: boolean
  checked?: boolean
  onChange?: (_checked: boolean) => void
}

const Checkbox = ({
  indeterminate,
  checked,
  onChange
}: CheckboxProps) => (
    <Pressable
      onPress={() => {
        if (onChange) {
          onChange(!checked)
        }
      }}
      hitSlop={15}
      style={styles.checkbox}
    >
      <MaterialIcons
        name={indeterminate ? 'indeterminate-check-box' : checked ? 'check-box' : 'check-box-outline-blank'}
        size={24}
        color={indeterminate || checked ? '#1976d2' : '#606264'}
      />
    </Pressable>
  )

const styles = StyleSheet.create({
  checkbox: {
    paddingTop: 5,
    paddingBottom: 5,
  },
})

export default Checkbox
