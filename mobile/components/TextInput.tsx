import React, { forwardRef, useEffect, useRef, useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  TextInput as ReactTextInput,
  NativeSyntheticEvent,
  TextInputKeyPressEventData
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'

interface TextInputProps {
  size?: 'small' | 'large'
  value?: string
  style?: object
  inputStyle?: object
  backgroundColor?: string
  error?: boolean
  label?: string
  hideLabel?: boolean
  secureTextEntry?: boolean
  readOnly?: boolean
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad' | 'numeric' | 'email-address' | 'phone-pad'
  maxLength?: number
  autoCorrect?: boolean
  hideClearButton?: boolean
  helperText?: string
  onKeyPress?: (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => void
  onFocus?: () => void
  onBlur?: () => void
  onSubmitEditing?: () => void
  onChangeText?: (text: string) => void
}

const TextInputComponent = (
props: TextInputProps,
  ref: React.ForwardedRef<ReactTextInput>
) => {
  const [value, setValue] = useState('')
  const _ref = useRef<ReactTextInput | null>(null)
  const small = props.size === 'small'

  useEffect(() => {
    setValue(props.value ?? '')
  }, [props.value])

  const onChangeText = (text: string) => {
    setValue(text)
    if (props.onChangeText) {
      props.onChangeText(text)
    }
  }

  const styles = StyleSheet.create({
    container: {
      maxWidth: 480,
    },
    label: {
      backgroundColor: props.backgroundColor ?? '#fafafa',
      color: 'rgba(0, 0, 0, 0.6)',
      fontSize: 12,
      fontWeight: '400',
      paddingRight: 5,
      paddingLeft: 5,
      marginLeft: 15,
      position: 'absolute',
      top: -9,
      zIndex: 1,
    },
    inputContainer: {
      flexDirection: 'row',
    },
    input: {
      flex: 1,
      height: small ? 37 : 55,
      borderWidth: 1,
      borderRadius: 10,
      borderColor: props.error ? '#d32f2f' : 'rgba(0, 0, 0, 0.23)',
      fontSize: small ? 14 : 16,
      paddingTop: small ? 8 : 15,
      paddingRight: 40,
      paddingBottom: small ? 8 : 15,
      paddingLeft: 15,
    },
    helperText: {
      color: props.error ? '#d32f2f' : 'rgba(0, 0, 0, 0.45)',
      fontSize: 11,
      fontWeight: '400',
      paddingLeft: 5,
    },
    clear: {
      flex: 0,
      position: 'absolute',
      right: 10,
      top: small ? 7 : 17,
    },
  })

  return (
    <View style={{ ...props.style, ...styles.container }}>
      {value !== '' && !props.hideLabel && <Text style={styles.label}>{props.label}</Text>}
      <View style={styles.inputContainer}>
        <ReactTextInput
          ref={(inputRef) => {
            if (ref) {
              if (typeof ref === 'function') {
                ref(inputRef)
              } else {
                ref.current = inputRef
              }
            }
            _ref.current = inputRef
          }}
          secureTextEntry={props.secureTextEntry}
          placeholder={props.label}
          value={value}
          onChangeText={onChangeText}
          onKeyPress={props.onKeyPress}
          onSubmitEditing={props.onSubmitEditing}
          onFocus={props.onFocus}
          onBlur={props.onBlur}
          autoCapitalize="none"
          editable={!props.readOnly}
          keyboardType={props.keyboardType ?? 'default'}
          maxLength={props.maxLength}
          // autoComplete={Platform.OS === 'web' ? 'none' : 'off'}
          autoCorrect={props.autoCorrect}
          style={{ ...styles.input, ...props.inputStyle }}
        />
        {!props.readOnly && value !== '' && !props.hideClearButton && (
          <MaterialIcons
            style={styles.clear}
            name="clear"
            size={22}
            color="rgba(0, 0, 0, 0.28)"
            onPress={() => {
              onChangeText('')
              if (_ref && _ref.current) {
                _ref.current.focus()
              }
            }}
          />
        )}
      </View>
      <Text style={styles.helperText}>{props.helperText}</Text>
    </View>
  )
}

const TextInput = forwardRef<ReactTextInput, TextInputProps>(TextInputComponent)

TextInput.displayName = 'TextInput'

export default TextInput
