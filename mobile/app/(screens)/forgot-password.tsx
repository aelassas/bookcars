import React, { useEffect, useRef, useState } from 'react'
import { StyleSheet, ScrollView, View, Text, TextInput as ReactTextInput } from 'react-native'
import { useIsFocused, useLocalSearchParams, useRouter } from 'expo-router'

import validator from 'validator'

import TextInput from '@/components/TextInput'
import Button from '@/components/Button'
import i18n from '@/lang/i18n'
import * as UserService from '@/services/UserService'
import * as helper from '@/utils/helper'
import Link from '@/components/Link'
import Header from '@/components/Header'
import SocialLogin from '@/components/SocialLogin'

const ForgotPasswordScreen = () => {
  const isFocused = useIsFocused()
  const router = useRouter()
  const { d } = useLocalSearchParams<{ d: string }>()
  const [email, setEmail] = useState('')
  const [emailRequired, setEmailRequired] = useState(false)
  const [emailValid, setEmailValid] = useState(true)
  const [sent, setSent] = useState(false)
  const ref = useRef<ReactTextInput>(null)

  const _init = async () => {
    const language = await UserService.getLanguage()
    i18n.locale = language
    setEmail('')
    setEmailRequired(false)
    setEmailValid(true)
    setSent(false)
    if (ref.current) {
      ref.current.clear()
    }
  }

  useEffect(() => {
    if (isFocused) {
      _init()
    }
  }, [d, isFocused])

  const validateEmail = () => {
    if (email) {
      setEmailRequired(false)
      const valid = validator.isEmail(email)
      setEmailValid(valid)
      return valid
    } else {
      setEmailValid(true)
      setEmailRequired(true)
      return false
    }
  }

  const onChangeEmail = (text: string) => {
    setEmail(text)
    setEmailRequired(false)
    setEmailValid(true)
  }

  const onPressReset = async () => {
    try {
      const _emailValid = validateEmail()
      if (!_emailValid) {
        return
      }

      const status = await UserService.resend(email, true)

      if (status === 200) {
        setEmailRequired(false)
        setEmailValid(true)
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
      <Header title={i18n.t('FORGOT_PASSWORD')} hideTitle={false} loggedIn={false} />

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps={helper.android() ? 'handled' : 'always'}
      >
        {sent && (
          <View style={styles.contentContainer}>
            <Text style={styles.text}>{i18n.t('RESET_EMAIL_SENT')}</Text>
            <Link label={i18n.t('GO_TO_HOME')} onPress={() => router.push('/')} />
          </View>
        )}
        {!sent && (
          <View style={styles.contentContainer}>
            <Text style={styles.text}>{i18n.t('RESET_PASSWORD')}</Text>

            <TextInput
              ref={ref}
              style={styles.component}
              label={i18n.t('EMAIL')}
              error={emailRequired || !emailValid}
              helperText={(emailRequired && i18n.t('REQUIRED')) || (!emailValid && i18n.t('EMAIL_NOT_VALID')) || ''}
              onSubmitEditing={onPressReset}
              onChangeText={onChangeEmail}
            />

            <SocialLogin />

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
    textAlign: 'center',
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
