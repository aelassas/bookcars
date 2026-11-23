import React, { useState } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import Constants from 'expo-constants'
import * as AppleAuthentication from 'expo-apple-authentication'
import { Paragraph, Dialog, Portal, Button as NativeButton } from 'react-native-paper'
import * as bookcarsTypes from ':bookcars-types'

import i18n from '@/lang/i18n'
import * as helper from '@/utils/helper'
import * as UserService from '@/services/UserService'
import * as env from '@/config/env.config'

interface SocialLoginProps {
  stayConnected?: boolean
  checkoutParams?: CheckoutParams
  onSignInError?: () => void
  onBlackListed?: () => void
}

const SocialLogin = (
  {
    stayConnected,
    checkoutParams,
    onSignInError,
    onBlackListed,
  }: SocialLoginProps
) => {
  const router = useRouter()
  const [openErrorDialog, setOpenErrorDialog] = useState(false)

  const isExpoGo = Constants.appOwnership === 'expo'
  const showGoogleSignIn = !isExpoGo && Boolean(
    env.GOOGLE_WEB_CLIENT_ID && env.GOOGLE_WEB_CLIENT_ID !== 'GOOGLE_WEB_CLIENT_ID'
  )

  const longinError = () => {
    setOpenErrorDialog(true)

    if (onSignInError) {
      onSignInError()
    }
  }

  const loginSuccess = async (socialSignInType: bookcarsTypes.SocialSignInType, accessToken: string, email: string, fullName: string, avatar?: string) => {
    let success = true

    try {
      const data: bookcarsTypes.SignInPayload = {
        socialSignInType,
        accessToken,
        email,
        fullName,
        avatar,
        stayConnected,
        mobile: true,
      }
      const res = await UserService.socialSignin(data)
      if (res.status === 200) {
        if (res.data.blacklisted) {
          await UserService.signout()
          if (onBlackListed) {
            onBlackListed()
          }
        } else {
          await helper.registerPushToken(res.data._id as string)

          // 1. Ensure pathname starts with '/'
          // 2. Remove the old navigation.navigate('Home') - router.push('/') does this now.
          if (checkoutParams) {
            router.push({
              pathname: '/checkout',
              params: {
                ...checkoutParams,
                d: Date.now().toString() // force a refresh on the checkout screen
              }
            })
          } else {
            // router.replace is often better for going "Home" to clear the stack
            router.replace('/')
          }
        }
      } else {
        success = false
      }
    } catch (err) {
      console.error(err)
      success = false
    }

    if (success) {
      console.log(`${socialSignInType} login success`)
    } else {
      console.error(`${socialSignInType} login error`)
      longinError()
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      const { GoogleSignin } = await import('@react-native-google-signin/google-signin')

      GoogleSignin.configure({
        webClientId: env.GOOGLE_WEB_CLIENT_ID,
        offlineAccess: true,
        scopes: ['profile', 'email'],
      })

      await GoogleSignin.hasPlayServices()
      await GoogleSignin.signOut()

      const userInfo = await GoogleSignin.signIn()
      const user = userInfo.data?.user
      const idToken = userInfo.data?.idToken

      if (!user || !idToken) {
        console.log('Google login cancelled before token was received')
        return
      }

      await loginSuccess(
        bookcarsTypes.SocialSignInType.Google,
        idToken,
        user.email,
        user.name || user.email,
        user.photo || ''
      )
    } catch (err: any) {
      if (err?.code === 'SIGN_IN_CANCELLED') {
        console.log('Google login cancelled')
        return
      }

      console.error('Google login failed:', err?.message || err)
      longinError()
    }
  }

  const getEmail = (jwtToken: string) => {
    const jwt = UserService.parseJwt(jwtToken)
    const { email } = jwt
    return email
  }

  return (
    <View style={styles.view}>
      {(showGoogleSignIn || helper.ios()) && (
        <View style={styles.or}>
          <View style={styles.orHr} />
          <Text style={styles.orText}>{i18n.t('OR')}</Text>
          <View style={styles.orHr} />
        </View>
      )}
      {!showGoogleSignIn && !helper.ios() && (
        <Text style={styles.expoGoNote}>
          {isExpoGo
            ? 'Google sign-in needs the SafarRent native build. Use email and password in Expo Go.'
            : 'Google sign-in is not configured for this build. Use email and password.'}
        </Text>
      )}

      <View style={styles.buttons}>

        {showGoogleSignIn && (
          <Pressable onPress={handleGoogleSignIn}>
            <Image source={require('@/assets/google-icon.png')} style={styles.google} />
          </Pressable>
        )}

        {/* APPLE */}
        {helper.ios() && (
          <Pressable
            onPress={async () => {
              let error = false

              try {
                const credential = await AppleAuthentication.signInAsync({
                  requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                  ],
                })

                // 1. Get the email from the credential OR decode it from the identityToken
                const email = credential.email || getEmail(String(credential.identityToken))

                // 2. Build the name (will be null on repeat logins)
                const firstName = credential.fullName?.givenName || ''
                const lastName = credential.fullName?.familyName || ''
                const name = (firstName || lastName) ? `${firstName} ${lastName}`.trim() : email

                if (email) {
                  // Use identityToken instead of authorizationCode for consistency with your web logic
                  await loginSuccess(
                    bookcarsTypes.SocialSignInType.Apple, credential.identityToken || '',
                    email,
                    name,
                    '')
                } else {
                  error = true
                }
                // signed in
              } catch (err: any) {
                if (err.code === 'ERR_REQUEST_CANCELED') {
                  // handle that the user canceled the sign-in flow
                  console.log('Apple login cancelled')
                } else {
                  console.error('Apple login error:', err.message)
                  error = true
                }
              }

              if (error) {
                longinError()
              }
            }}>
            <Image source={require('@/assets/apple-icon.png')} style={styles.apple} />
          </Pressable>
        )}

        <Portal>
          <Dialog style={styles.dialog} visible={openErrorDialog} dismissable={false}>
            <Dialog.Title style={styles.dialogTitleContent}>{i18n.t('ERROR')}</Dialog.Title>
            <Dialog.Content style={styles.dialogContent}>
              <Paragraph>{i18n.t('LOGIN_ERROR')}</Paragraph>
            </Dialog.Content>
            <Dialog.Actions style={styles.dialogActions}>
              <NativeButton
                // color='#3CB371'
                onPress={() => {
                  setOpenErrorDialog(false)
                }}
              >
                {i18n.t('CLOSE')}
              </NativeButton>
            </Dialog.Actions>
          </Dialog>
        </Portal>

      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  expoGoNote: {
    color: '#62656B',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
    textAlign: 'center',
  },
  view: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    padding: 15,
  },
  buttons: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  or: {
    display: 'flex',
    flexDirection: 'row',
    flex: 1,
    marginBottom: 10,
  },
  orHr: {
    borderBottomColor: '#CFD8DC',
    borderBottomWidth: 1,
    width: '46%',
    position: 'relative',
    top: -8,
  },
  orText: {
    textAlign: 'center',
    marginRight: 10,
    marginLeft: 10,
  },
  google: {
    height: 55,
    resizeMode: 'contain',
  },
  apple: {
    height: 48,
    resizeMode: 'contain',
  },
  dialog: {
    width: '90%',
    maxWidth: 480,
    alignSelf: 'center',
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

export default SocialLogin
