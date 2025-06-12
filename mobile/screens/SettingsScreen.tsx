import React, { useEffect, useState } from 'react'
import { StyleSheet, View, ScrollView, Pressable } from 'react-native'
import { useIsFocused } from '@react-navigation/native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { MaterialIcons } from '@expo/vector-icons'
import { Avatar, Dialog, Portal, Button as NativeButton, Paragraph } from 'react-native-paper'
import * as ImagePicker from 'expo-image-picker'
import validator from 'validator'
import { intervalToDuration } from 'date-fns'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'

import Layout from '@/components/Layout'
import i18n from '@/lang/i18n'
import * as UserService from '@/services/UserService'
import TextInput from '@/components/TextInput'
import DateTimePicker from '@/components/DateTimePicker'
import Switch from '@/components/Switch'
import Button from '@/components/Button'
import * as helper from '@/common/helper'
import * as env from '@/config/env.config'
import DriverLicense from '@/components/DriverLicense'

const SettingsScreen = ({ navigation, route }: NativeStackScreenProps<StackParams, 'Settings'>) => {
  const isFocused = useIsFocused()
  const [reload, setReload] = useState(false)
  const [visible, setVisible] = useState(false)
  const [language, setLanguage] = useState(env.DEFAULT_LANGUAGE)
  const [user, setUser] = useState<bookcarsTypes.User>()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [birthDate, setBirthDate] = useState<Date>()
  const [location, setLocation] = useState('')
  const [bio, setBio] = useState('')
  const [enableEmailNotifications, setEnableEmailNotifications] = useState(false)
  const [avatar, setAvatar] = useState<string | null>(null)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [fullNameRequired, setFullNameRequired] = useState(false)
  const [phoneRequired, setPhoneRequired] = useState(false)
  const [phoneValid, setPhoneValid] = useState(true)
  const [birthDateRequired, setBirthDateRequired] = useState(false)
  const [birthDateValid, setBirthDateValid] = useState(true)

  const _init = async () => {
    try {
      const _language = await UserService.getLanguage()
      i18n.locale = _language
      setLanguage(_language)

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

      setUser(_user)
      if (_user.avatar) {
        setAvatar(_user.avatar.startsWith('https://') ? _user.avatar : bookcarsHelper.joinURL(env.CDN_USERS, _user.avatar))
      } else {
        setAvatar(null)
      }
      setFullName(_user.fullName)
      if (_user.email) {
        setEmail(_user.email)
      }
      if (_user.phone) {
        setPhone(_user.phone)
      }
      if (_user.birthDate) {
        setBirthDate(new Date(_user.birthDate))
      }
      if (_user.location) {
        setLocation(_user.location)
      }
      if (_user.bio) {
        setBio(_user.bio)
      }
      if (typeof _user.enableEmailNotifications !== 'undefined') {
        setEnableEmailNotifications(_user.enableEmailNotifications)
      }

      setFullNameRequired(false)
      setPhoneRequired(false)
      setPhoneValid(true)
      setBirthDateRequired(false)
      setBirthDateValid(true)

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

  const validateFullName = () => {
    const valid = fullName !== ''
    setFullNameRequired(!valid)
    return valid
  }

  const onChangeFullName = (text: string) => {
    setFullName(text)

    if (text) {
      setFullNameRequired(false)
    }
  }

  const validatePhone = () => {
    if (phone) {
      const _phoneValid = validator.isMobilePhone(phone)
      setPhoneRequired(false)
      setPhoneValid(_phoneValid)

      return _phoneValid
    }
    setPhoneRequired(true)
    setPhoneValid(true)

    return false
  }

  const onChangePhone = (text: string) => {
    setPhone(text)
    setPhoneRequired(false)
    setPhoneValid(true)
  }

  const validateBirthDate = () => {
    if (birthDate) {
      setBirthDateRequired(false)

      const sub = intervalToDuration({
        start: birthDate,
        end: new Date(),
      }).years ?? 0
      const _birthDateValid = sub >= env.MINIMUM_AGE

      setBirthDateValid(_birthDateValid)
      return _birthDateValid
    }
    setBirthDateRequired(true)
    setBirthDateValid(true)

    return false
  }

  const onChangeBirthDate = (date: Date | undefined) => {
    setBirthDate(date)
    setBirthDateRequired(false)
    setBirthDateValid(true)
  }

  const onChangeLocation = (text: string) => {
    setLocation(text)
  }

  const onChangeBio = (text: string) => {
    setBio(text)
  }

  const onChangeEnableEmailNotificationsChecked = (checked: boolean) => {
    setEnableEmailNotifications(checked)
  }

  const onPressSave = async () => {
    try {
      if (!user || !user._id) {
        return
      }

      const fullNameValid = validateFullName()
      if (!fullNameValid) {
        return
      }

      const _phoneValid = validatePhone()
      if (!_phoneValid) {
        return
      }

      const _birthDateValid = validateBirthDate()
      if (!_birthDateValid) {
        return
      }

      const data: bookcarsTypes.UpdateUserPayload = {
        _id: user._id,
        fullName,
        birthDate,
        phone,
        location,
        bio,
        enableEmailNotifications,
      }

      const status = await UserService.updateUser(data)

      if (status === 200) {
        helper.toast(i18n.t('SETTINGS_UPDATED'))
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const onPressChangePassword = () => {
    navigation.navigate('ChangePassword', {})
  }

  const handleUpdateAvatar = async () => {
    try {
      if (!user || !user._id) {
        helper.error()
        return
      }

      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (permissionResult.granted === false) {
        alert(i18n.t('CAMERA_PERMISSION'))
        return
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync()

      if (pickerResult.canceled === true) {
        return
      }

      const { uri } = pickerResult.assets[0]
      const name = helper.getFileName(uri)
      const type = helper.getMimeType(name)
      const image: BlobInfo = { uri, name, type }
      const status = await UserService.updateAvatar(user._id, image)

      if (status === 200) {
        const _user = await UserService.getUser(user._id)
        setUser(_user)
        const _avatar = bookcarsHelper.joinURL(env.CDN_USERS, _user.avatar)
        setAvatar(_avatar)
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    }
  }

  return (
    <Layout style={styles.master} navigation={navigation} route={route} onLoad={onLoad} reload={reload} avatar={avatar} strict>
      {visible && language && (
        <>
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps={helper.android() ? 'handled' : 'always'}
          >
            <View style={styles.contentContainer}>
              <View style={styles.avatar}>
                {
                  avatar
                    ? <Avatar.Image size={94} source={{ uri: avatar }} />
                    : <MaterialIcons name="account-circle" size={94} color="#bdbdbd" />
                }
                <View style={styles.avatarActions}>
                  {avatar && (
                    <Pressable
                      style={styles.deleteAvatar}
                      hitSlop={15}
                      disabled
                      onPress={() => {
                        setOpenDeleteDialog(true)
                      }}
                    >
                      {/* <Badge style={styles.badge} size={36}> */}
                      <View style={styles.badge}>
                        <MaterialIcons name="broken-image" size={22} color="#373737" />
                      </View>
                      {/* </Badge> */}
                    </Pressable>
                  )}
                  <Pressable
                    style={styles.updateAvatar}
                    hitSlop={15}
                    disabled
                    onPress={handleUpdateAvatar}
                  >
                    {/* <Badge style={styles.badge} size={36}> */}
                    <View style={styles.badge}>
                      <MaterialIcons name="photo-camera" size={22} color="#373737" />
                    </View>
                    {/* </Badge> */}
                  </Pressable>
                </View>
              </View>

              <TextInput
                style={styles.component}
                label={i18n.t('FULL_NAME')}
                value={fullName}
                error={fullNameRequired}
                helperText={(fullNameRequired && i18n.t('REQUIRED')) || ''}
                onChangeText={onChangeFullName}
              />

              <TextInput style={styles.component} label={i18n.t('EMAIL')} value={email} readOnly />

              <TextInput
                style={styles.component}
                label={i18n.t('PHONE')}
                value={phone}
                error={phoneRequired || !phoneValid}
                helperText={(phoneRequired && i18n.t('REQUIRED')) || (!phoneValid && i18n.t('PHONE_NOT_VALID')) || ''}
                onChangeText={onChangePhone}
              />

              <DateTimePicker
                mode="date"
                locale={language}
                style={styles.date}
                label={i18n.t('BIRTH_DATE')}
                value={birthDate}
                error={birthDateRequired || !birthDateValid}
                helperText={(birthDateRequired && i18n.t('REQUIRED')) || (!birthDateValid && i18n.t('BIRTH_DATE_NOT_VALID')) || ''}
                onChange={onChangeBirthDate}
              />

              <TextInput style={styles.component} label={i18n.t('LOCATION')} value={location} onChangeText={onChangeLocation} />

              <TextInput style={styles.component} label={i18n.t('BIO')} value={bio} onChangeText={onChangeBio} />

              <DriverLicense user={user} />

              <Switch
                style={styles.component}
                textStyle={styles.enableEmailNotificationsText}
                label={i18n.t('ENABLE_EMAIL_NOTIFICATIONS')}
                value={enableEmailNotifications}
                onValueChange={onChangeEnableEmailNotificationsChecked}
              />

              <Button
                style={styles.component}
                label={i18n.t('SAVE')}
                // onPress={onPressSave}
              />

              <Button
                style={styles.component}
                color="secondary"
                label={i18n.t('CHANGE_PASSWORD')}
                // onPress={onPressChangePassword}
              />
            </View>
          </ScrollView>

          <Portal>
            <Dialog visible={openDeleteDialog} dismissable={false}>
              <Dialog.Title style={styles.dialogTitleContent}>{i18n.t('CONFIRM_TITLE')}</Dialog.Title>
              <Dialog.Content style={styles.dialogContent}>
                <Paragraph>{i18n.t('DELETE_AVATAR')}</Paragraph>
              </Dialog.Content>
              <Dialog.Actions style={styles.dialogActions}>
                <NativeButton
                  // color='#f37022'
                  onPress={() => {
                    setOpenDeleteDialog(false)
                  }}
                >
                  {i18n.t('CANCEL')}
                </NativeButton>
                <NativeButton
                  // color='#f37022'
                  onPress={async () => {
                    try {
                      if (user?._id) {
                        const status = await UserService.deleteAvatar(user._id)

                        if (status === 200) {
                          setAvatar(null)
                          setOpenDeleteDialog(false)
                        } else {
                          helper.error()
                        }
                      } else {
                        helper.error()
                      }
                    } catch (err) {
                      helper.error(err)
                    }
                  }}
                >
                  {i18n.t('DELETE')}
                </NativeButton>
              </Dialog.Actions>
            </Dialog>
          </Portal>
        </>
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
  avatar: {
    marginTop: 10,
    marginBottom: 10,
  },
  avatarActions: {
    flexDirection: 'row',
    marginTop: -26,
  },
  updateAvatar: {
    alignSelf: 'flex-end',
    marginLeft: 'auto',
    padding: 5,
  },
  deleteAvatar: {
    alignSelf: 'flex-start',
    padding: 5,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 36,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ddd',
  },
  component: {
    alignSelf: 'stretch',
    margin: 10,
  },
  date: {
    alignSelf: 'stretch',
    marginTop: 10,
    marginRight: 10,
    marginBottom: 25,
    marginLeft: 10,
  },
  enableEmailNotificationsText: {
    fontSize: 12,
  },
  dialogTitleContent: {
    textAlign: 'center',
  },
  dialogContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogActions: {
    height: 75,
  },
})

export default SettingsScreen
