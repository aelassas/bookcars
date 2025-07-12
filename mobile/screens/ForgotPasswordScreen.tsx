import React, { useEffect, useRef, useState } from 'react'
import { StyleSheet, ScrollView, View, Text, TextInput as ReactTextInput } from 'react-native'
import { useIsFocused } from '@react-navigation/native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'

import validator from 'validator'

import TextInput from '@/components/TextInput'
import Button from '@/components/Button'
import i18n from '@/lang/i18n'
import * as UserService from '@/services/UserService'
import * as helper from '@/utils/helper'
import Link from '@/components/Link'
import Header from '@/components/Header'

const ForgotPasswordScreen = ({ navigation, route }: NativeStackScreenProps<StackParams, 'ForgotPassword'>) => {
  const isFocused = useIsFocused()
  const [email, setEmail] = useState('')
  const [emailRequired, setEmailRequired] = useState(false)
  const [emailError, setEmailError] = useState(false)
  const [emailValid, setEmailValid] = useState(true)
  const [sent, setSent] = useState(false)
  const ref = useRef<ReactTextInput>(null)

  const _init = async () => {
    const language = await UserService.getLanguage()
    i18n.locale = language
    setEmail('')
    setEmailRequired(false)
    setEmailValid(true)
    setEmailError(false)
    setSent(false)
    if (ref.current) {
      ref.current.clear()
    }
  }

  useEffect(() => {
    if (isFocused) {
      _init()
    }
  }, [route.params, isFocused])

  const validateEmail = async () => {
    if (email) {
      setEmailRequired(false)

      if (validator.isEmail(email)) {
        try {
          const status = await UserService.validateEmail({ email })
          if (status === 200) {
            setEmailError(true)
            setEmailValid(true)
            return false
          }
          setEmailError(false)
          setEmailValid(true)
          return true
        } catch {
          helper.toast(i18n.t('GENERIC_ERROR'))
          setEmailError(false)
          setEmailValid(true)
          return false
        }
      } else {
        setEmailError(false)
        setEmailValid(false)
        return false
      }
    } else {
      setEmailError(false)
      setEmailValid(true)
      setEmailRequired(true)
      return false
    }
  }

  const onChangeEmail = (text: string) => {
    setEmail(text)
    setEmailRequired(false)
    setEmailValid(true)
    setEmailError(false)
  }

  const onPressReset = async () => {
    try {
      const _emailValid = await validateEmail()
      if (!_emailValid) {
        return
      }

      const status = await UserService.resend(email, true)

      if (status === 200) {
        setEmailRequired(false)
        setEmailValid(true)
        setEmailError(false)
        setSent(true)
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    }
  }

  return (
    <View style={styles.master}>
      <Header route={route} title={i18n.t('FORGOT_PASSWORD')} hideTitle={false} loggedIn={false} />

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps={helper.android() ? 'handled' : 'always'}
      >
        {sent && (
          <View style={styles.contentContainer}>
            <Text style={styles.text}>{i18n.t('RESET_EMAIL_SENT')}</Text>
            <Link label={i18n.t('GO_TO_HOME')} onPress={() => navigation.navigate('Home', {})} />
          </View>
        )}
        {!sent && (
          <View style={styles.contentContainer}>
            <Text style={styles.text}>{i18n.t('RESET_PASSWORD')}</Text>

            <TextInput
              ref={ref}
              style={styles.component}
              label={i18n.t('EMAIL')}
              error={emailRequired || !emailValid || emailError}
              helperText={(emailRequired && i18n.t('REQUIRED')) || (!emailValid && i18n.t('EMAIL_NOT_VALID')) || (emailError && i18n.t('EMAIL_ERROR')) || ''}
              onSubmitEditing={onPressReset}
              onChangeText={onChangeEmail}
            />

            <Button style={styles.component} label={i18n.t('RESET')} onPress={onPressReset} />
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  master: {
    flex: 1,
  },
  text: {
    color: 'rgba(0, 0, 0, 0.6)',
    fontSize: 15,
    fontWeight: '400',
    alignSelf: 'stretch',
    margin: 10,
    padding: 5,
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    flexGrow: 1,
    backgroundColor: '#F5F5F5',
  },
  contentContainer: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
  },
  component: {
    alignSelf: 'stretch',
    marginTop: 10,
    marginRight: 10,
    marginLeft: 10,
  },
})

export default ForgotPasswordScreen
