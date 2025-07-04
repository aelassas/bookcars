import React, { useEffect, useRef, useState } from 'react'
import { ScrollView, StyleSheet, View, TextInput as ReactTextInput } from 'react-native'
import { useIsFocused } from '@react-navigation/native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import * as bookcarsTypes from ':bookcars-types'

import Layout from '@/components/Layout'
import i18n from '@/lang/i18n'
import * as UserService from '@/services/UserService'
import * as helper from '@/utils/helper'
import TextInput from '@/components/TextInput'
import Button from '@/components/Button'

const ChangePasswordScreen = ({ navigation, route }: NativeStackScreenProps<StackParams, 'ChangePassword'>) => {
  const isFocused = useIsFocused()
  const [reload, setReload] = useState(false)
  const [visible, setVisible] = useState(false)
  const [user, setUser] = useState<bookcarsTypes.User>()
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [currentPasswordRequired, setCurrentPasswordRequired] = useState(false)
  const [currentPasswordError, setCurrentPasswordError] = useState(false)
  const [passwordRequired, setPasswordRequired] = useState(false)
  const [confirmPasswordRequired, setConfirmPasswordRequired] = useState(false)
  const [passwordLengthError, setPasswordLengthError] = useState(false)
  const [confirmPasswordError, setConfirmPasswordError] = useState(false)
  const [hasPassword, setHasPassword] = useState(false)

  const currentPasswordRef = useRef<ReactTextInput>(null)
  const passwordRef = useRef<ReactTextInput>(null)
  const confirmPasswordRef = useRef<ReactTextInput>(null)

  const clear = () => {
    setCurrentPassword('')
    setPassword('')
    setConfirmPassword('')

    if (currentPasswordRef.current) {
      currentPasswordRef.current.clear()
    }
    if (passwordRef.current) {
      passwordRef.current.clear()
    }
    if (confirmPasswordRef.current) {
      confirmPasswordRef.current.clear()
    }

    setCurrentPasswordRequired(false)
    setCurrentPasswordError(false)
    setPasswordRequired(false)
    setConfirmPasswordRequired(false)
    setPasswordLengthError(false)
    setConfirmPasswordError(false)
  }

  const _init = async () => {
    try {
      const language = await UserService.getLanguage()
      i18n.locale = language

      clear()

      const currentUser = await UserService.getCurrentUser()

      if (!currentUser || !currentUser._id) {
        await UserService.signout(navigation, false, true)
        return
      }

      const _user = await UserService.getUser(currentUser._id)

      if (!_user) {
        await UserService.signout(navigation, false, true)
        return
      }

      const status = await UserService.hasPassword(_user!._id!)
      setHasPassword(status === 200)

      setUser(_user)
      setVisible(true)
    } catch {
      await UserService.signout(navigation, false, true)
    }
  }

  useEffect(() => {
    if (isFocused) {
      _init()
      setReload(true)
    } else {
      setVisible(false)
    }
  }, [route.params, isFocused]) // eslint-disable-line react-hooks/exhaustive-deps

  const onLoad = () => {
    setReload(false)
  }

  const validatePassword = async () => {
    try {
      if (user && user._id) {
        if (hasPassword && !currentPassword) {
          setCurrentPasswordRequired(true)
          setCurrentPasswordError(false)
          return false
        }

        let status = 200
        if (hasPassword) {
          status = await UserService.checkPassword(user._id, currentPassword)
        }

        if (status !== 200) {
          setCurrentPasswordRequired(false)
          setCurrentPasswordError(true)
          return false
        }

        if (!password) {
          setPasswordRequired(true)
          setPasswordLengthError(false)
          return false
        }

        if (password.length < 6) {
          setPasswordLengthError(true)
          setPasswordRequired(false)
          return false
        }

        if (!confirmPassword) {
          setConfirmPasswordRequired(true)
          setConfirmPasswordError(false)
          return false
        }

        if (password !== confirmPassword) {
          setConfirmPasswordError(true)
          setConfirmPasswordRequired(false)
          return false
        }

        return true
      }
    } catch (err) {
      helper.error(err)
    }
    return false
  }

  const onChangeCurrentPassword = (text: string) => {
    setCurrentPassword(text)
    setCurrentPasswordRequired(false)
    setCurrentPasswordError(false)
  }

  const onChangePassword = (text: string) => {
    setPassword(text)
    setPasswordRequired(false)
    setPasswordLengthError(false)
  }

  const onChangeConfirmPassword = (text: string) => {
    setConfirmPassword(text)
    setConfirmPasswordRequired(false)
    setConfirmPasswordError(false)
  }

  const onPressUpdate = async () => {
    try {
      if (!user || !user._id) {
        helper.error()
        return
      }

      const passwordValid = await validatePassword()

      if (!passwordValid) {
        return
      }

      const data: bookcarsTypes.ChangePasswordPayload = {
        _id: user._id,
        password: currentPassword,
        newPassword: password,
        strict: hasPassword,
      }

      const status = await UserService.changePassword(data)

      if (status === 200) {
        setHasPassword(true)
        clear()
        helper.toast(i18n.t('PASSWORD_UPDATE'))
      } else {
        helper.toast(i18n.t('PASSWORD_UPDATE_ERROR'))
      }
    } catch (err) {
      helper.error(err)
    }
  }

  return (
    <Layout style={styles.master} navigation={navigation} route={route} onLoad={onLoad} reload={reload} strict>
      {visible && (
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps={helper.android() ? 'handled' : 'always'}
        >
          <View style={styles.contentContainer}>
            {hasPassword && (
              <TextInput
                ref={currentPasswordRef}
                style={styles.component}
                secureTextEntry
                label={i18n.t('CURRENT_PASSWORD')}
                value={currentPassword}
                error={currentPasswordRequired || currentPasswordError}
                helperText={
                  (currentPasswordRequired && i18n.t('REQUIRED'))
                  || (currentPasswordError && i18n.t('PASSWORD_ERROR'))
                  || ''
                }
                onChangeText={onChangeCurrentPassword}
              />
            )}

            <TextInput
              ref={passwordRef}
              style={styles.component}
              secureTextEntry
              label={i18n.t('NEW_PASSWORD')}
              value={password}
              error={passwordRequired || passwordLengthError}
              helperText={
                (passwordRequired && i18n.t('REQUIRED'))
                || (passwordLengthError && i18n.t('PASSWORD_LENGTH_ERROR'))
                || ''
              }
              onChangeText={onChangePassword}
            />

            <TextInput
              ref={confirmPasswordRef}
              style={styles.component}
              secureTextEntry
              label={i18n.t('CONFIRM_PASSWORD')}
              value={confirmPassword}
              error={confirmPasswordRequired || confirmPasswordError}
              helperText={
                (confirmPasswordRequired && i18n.t('REQUIRED'))
                || (confirmPasswordError && i18n.t('PASSWORDS_DONT_MATCH'))
                || ''
              }
              onChangeText={onChangeConfirmPassword}
            />

            <Button style={styles.component} label={i18n.t('UPDATE')} onPress={onPressUpdate} />
          </View>
        </ScrollView>
      )}
    </Layout>
  )
}

const styles = StyleSheet.create({
  master: {
    flex: 1,
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    flexGrow: 1,
  },
  contentContainer: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 20,
  },
  component: {
    alignSelf: 'stretch',
    margin: 10,
  },
})

export default ChangePasswordScreen
