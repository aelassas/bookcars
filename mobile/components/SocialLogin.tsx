import React, { useState } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin'
import * as AppleAuthentication from 'expo-apple-authentication'
import { AccessToken, GraphRequest, GraphRequestManager, LoginManager, Profile } from 'react-native-fbsdk-next'
import { Paragraph, Dialog, Portal, Button as NativeButton } from 'react-native-paper'
import * as bookcarsTypes from ':bookcars-types'

import i18n from '@/lang/i18n'
import * as helper from '@/utils/helper'
import * as UserService from '@/services/UserService'
import * as env from '@/config/env.config'

GoogleSignin.configure({
  webClientId: env.GOOGLE_WEB_CLIENT_ID,
  offlineAccess: true,
  scopes: ['profile', 'email'],
})

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
  const navigation = useNavigation<NativeStackNavigationProp<StackParams, keyof StackParams>>()
  const [openErrorDialog, setOpenErrorDialog] = useState(false)

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
          await UserService.signout(navigation, false, false)
          if (onBlackListed) {
            onBlackListed()
          }
        } else {
          await helper.registerPushToken(res.data._id as string)

          if (checkoutParams) {
            navigation.navigate('Checkout', checkoutParams)
          } else {
            navigation.navigate('Home', {})
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

  return (
    <View style={styles.view}>
      <View style={styles.or}>
        <View style={styles.orHr} />
        <Text style={styles.orText}>{i18n.t('OR')}</Text>
        <View style={styles.orHr} />
      </View>

      <View style={styles.buttons}>

        {/* GOOGLE */}
        <Pressable
          onPress={async () => {
            try {
              await GoogleSignin.hasPlayServices()

              // Force account picker
              await GoogleSignin.signOut()

              const userInfo = await GoogleSignin.signIn()

              const user = userInfo.data?.user
              const idToken = userInfo.data?.idToken

              if (!user || !idToken) {
                // user probably cancelled the login flow
                console.log('Google login aborted before token received')
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
              let error = false
              if (isErrorWithCode(err)) {
                switch (err.code) {
                  case statusCodes.SIGN_IN_CANCELLED:
                    // user cancelled the login flow
                    console.log('Google login cancelled')
                    break
                  case statusCodes.IN_PROGRESS:
                    // operation (eg. login) already in progress
                    console.log('Google login in progress')
                    error = true
                    break
                  case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
                    console.error('Google play services not available')
                    error = true
                    break
                  default:
                    console.error('Google login error:', err.message)
                    error = true
                    break
                }
              } else {
                // an error that's not related to google login occurred
                console.error('Google login error:', err)
                error = true
              }

              if (error) {
                longinError()
              }
            }
          }}>
          <Image source={require('@/assets/google-icon.png')} style={styles.google} />
        </Pressable>

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

                if (credential.email && credential.fullName) {
                  await loginSuccess(bookcarsTypes.SocialSignInType.Apple, credential.authorizationCode || '', credential.email, `${credential.fullName.givenName} ${credential.fullName.familyName}`, '')
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

        {/* FACEBOOK */}
        <Pressable
          // style={{ display: 'none' }}
          onPress={async () => {
            LoginManager.logInWithPermissions(['public_profile', 'email'])
              .then(
                async (result: any) => {
                  if (result.isCancelled) {
                    console.log('Facebook login cancelled')
                  } else {
                    let error = false
                    const currentAccessToken = await AccessToken.getCurrentAccessToken()
                    if (currentAccessToken) {
                      const req = new GraphRequest('/me', {
                        httpMethod: 'GET',
                        version: 'v20.0',
                        accessToken: currentAccessToken.accessToken,
                        parameters: {
                          fields: {
                            string: 'email,name,picture'
                          }
                        }
                      }, async (err: any, res: any) => {
                        let fbError = false
                        if (err) {
                          console.log(err)
                          fbError = true
                        } else {
                          const currentProfile = await Profile.getCurrentProfile()

                          if (res && currentProfile) {
                            const email = res.email as string
                            const imageURL = (res.picture as any).data.url as string
                            const { name } = currentProfile
                            // const { name, imageURL } = currentProfile
                            // console.log('email', email)
                            // console.log('name', name)
                            // console.log('imageURL', imageURL)

                            if (email && name) {
                              await loginSuccess(bookcarsTypes.SocialSignInType.Facebook, currentAccessToken.accessToken, email, name || email, imageURL || '')
                            } else {
                              fbError = true
                            }
                          } else {
                            fbError = true
                          }
                        }

                        if (fbError) {
                          console.error('Facebook GraphRequest error')
                          longinError()
                        }
                      })
                      new GraphRequestManager().addRequest(req).start()
                    } else {
                      error = true
                    }

                    if (error) {
                      console.error('Facebook login error')
                      longinError()
                    }
                  }
                },
                (error: any) => {
                  console.error(`Facebook login fail with error: ${error}`)

                  longinError()
                }
              )
          }}>
          <Image source={require('@/assets/facebook-blue-icon.png')} style={styles.facebook} />
        </Pressable>

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
  facebook: {
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
