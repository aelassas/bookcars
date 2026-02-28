import { Platform } from 'react-native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as Localization from 'expo-localization'
import axiosInstance from './axiosInstance'
import * as env from '@/config/env.config'
import * as AsyncStorage from '@/utils/AsyncStorage'
import * as toastHelper from '@/utils/toastHelper'
import * as bookcarsTypes from ':bookcars-types'

/**
 * Get authentication header.
 *
 * @async
 * @returns {unknown}
 */
export const authHeader = async () => {
  const user = await getCurrentUser()

  if (user && user.accessToken) {
    return { 'x-access-token': user.accessToken }
  }
  return {}
}

/**
 * Sign up.
 *
 * @param {bookcarsTypes.SignUpPayload} data
 * @returns {Promise<number>}
 */
export const signup = (data: bookcarsTypes.SignUpPayload): Promise<number> =>
  axiosInstance
    .post(
      '/api/sign-up',
      data
    )
    .then((res) => res.status)

/**
 * Check validation token.
 *
 * @param {string} userId
 * @param {string} email
 * @param {string} token
 * @returns {Promise<number>}
 */
export const checkToken = (userId: string, email: string, token: string): Promise<number> =>
  axiosInstance
    .get(
      `/api/check-token/${env.APP_TYPE}/${encodeURIComponent(userId)}/${encodeURIComponent(email)}/${encodeURIComponent(token)}`
    )
    .then((res) => res.status)

/**
 * Delete validation tokens.
 *
 * @param {string} userId
 * @returns {Promise<number>}
 */
export const deleteTokens = (userId: string): Promise<number> =>
  axiosInstance
    .delete(`/api/delete-tokens/${encodeURIComponent(userId)}`)
    .then((res) => res.status)

/**
 * Resend validation email.
 *
 * @param {string} email
 * @param {boolean} [reset=false]
 * @returns {Promise<number>}
 */
export const resend = (email: string, reset = false): Promise<number> =>
  axiosInstance
    .post(
      `/api/resend/${env.APP_TYPE}/${encodeURIComponent(email)}/${reset}`
    )
    .then((res) => res.status)

/**
 * Activate an account.
 *
 * @async
 * @param {bookcarsTypes.ActivatePayload} data
 * @returns {Promise<number>}
 */
export const activate = async (data: bookcarsTypes.ActivatePayload): Promise<number> => {
  const headers = await authHeader()
  return axiosInstance
    .post(
      '/api/activate/ ',
      data,
      { headers }
    )
    .then((res) => res.status)
}

/**
 * Validate an email.
 *
 * @param {bookcarsTypes.ValidateEmailPayload} data
 * @returns {Promise<number>}
 */
export const validateEmail = (data: bookcarsTypes.ValidateEmailPayload): Promise<number> =>
  axiosInstance
    .post(
      '/api/validate-email',
      data
    )
    .then((res) => res.status)

/**
 * Sign in.
 *
 * @async
 * @param {bookcarsTypes.SignInPayload} data
 * @returns {Promise<{ status: number, data: bookcarsTypes.User }>}
 */
export const signin = async (data: bookcarsTypes.SignInPayload): Promise<{ status: number, data: bookcarsTypes.User }> =>
  axiosInstance
    .post(
      '/api/sign-in/frontend',
      data
    )
    .then(async (res) => {
      if (res.data.accessToken) {
        await AsyncStorage.storeObject('bc-user', res.data)
      }
      return { status: res.status, data: res.data }
    })

/**
 * Social sign in.
 *
 * @param {bookcarsTypes.SignInPayload} data
 * @returns {Promise<{ status: number, data: bookcarsTypes.User }>}
 */
export const socialSignin = (data: bookcarsTypes.SignInPayload): Promise<{ status: number, data: bookcarsTypes.User }> =>
  axiosInstance
    .post(
      '/api/social-sign-in',
      data,
      { withCredentials: true }
    )
    .then(async (res) => {
      await AsyncStorage.storeObject('bc-user', res.data)
      return { status: res.status, data: res.data }
    })

/**
 * Get push notification token.
 *
 * @async
 * @param {string} userId
 * @returns {Promise<{ status: number, data: string }>}
 */
export const getPushToken = async (userId: string): Promise<{ status: number, data: string }> => {
  const headers = await authHeader()
  return axiosInstance
    .get(
      `/api/push-token/${encodeURIComponent(userId)}`,
      { headers }
    )
    .then((res) => ({ status: res.status, data: res.data }))
}

/**
 * Create a push notification token.
 *
 * @async
 * @param {string} userId
 * @param {string} token
 * @returns {Promise<number>}
 */
export const createPushToken = async (userId: string, token: string): Promise<number> => {
  const headers = await authHeader()
  return axiosInstance
    .post(
      `/api/create-push-token/${encodeURIComponent(userId)}/${encodeURIComponent(token)}`,
      null,
      { headers }
    )
    .then((res) => res.status)
}

/**
 * Delete a push token.
 *
 * @async
 * @param {string} userId
 * @returns {Promise<number>}
 */
export const deletePushToken = async (userId: string): Promise<number> => {
  const headers = await authHeader()
  return axiosInstance
    .post(
      `/api/delete-push-token/${encodeURIComponent(userId)}`,
      null,
      { headers }
    )
    .then((res) => res.status)
}

/**
 * Sign out.
 *
 * @async
 * @param {NativeStackNavigationProp<StackParams, keyof StackParams>} navigation
 * @param {boolean} [redirect=true]
 * @param {boolean} [redirectSignin=false]
 * @returns {void}
 */
export const signout = async (
  navigation: NativeStackNavigationProp<StackParams, keyof StackParams>,
  redirect = true,
  redirectSignin = false
) => {
  await AsyncStorage.removeItem('bc-user')

  if (redirect) {
    navigation.navigate('Home', { d: new Date().getTime() })
  }
  if (redirectSignin) {
    navigation.navigate('SignIn', {})
  }
}

/**
 * Validate authentication access token.
 *
 * @async
 * @returns {Promise<number>}
 */
export const validateAccessToken = async (): Promise<number> => {
  const headers = await authHeader()
  return axiosInstance
    .post(
      '/api/validate-access-token',
      null,
      {
        headers,
        timeout: env.AXIOS_TIMEOUT,
      }
    )
    .then((res) => res.status)
    .catch((err) => {
      if (err.response?.status) {
        return err.response.status
      }
      return 500
    })
}

/**
 * Confirm an email.
 *
 * @param {string} email
 * @param {string} token
 * @returns {Promise<number>}
 */
export const confirmEmail = (email: string, token: string): Promise<number> =>
  axiosInstance
    .post(
      `/api/confirm-email/${encodeURIComponent(email)}/${encodeURIComponent(token)}`
    )
    .then((res) => res.status)

/**
 * Resend validation email.
 *
 * @async
 * @param {bookcarsTypes.ResendLinkPayload} data
 * @returns {Promise<number>}
 */
export const resendLink = async (data: bookcarsTypes.ResendLinkPayload): Promise<number> => {
  const headers = await authHeader()
  return axiosInstance
    .post(
      '/api/resend-link',
      data,
      { headers }
    )
    .then((res) => res.status)
}

/**
 * Get current language.
 *
 * @async
 * @returns {unknown}
 */
export const getLanguage = async () => {
  const user = await AsyncStorage.getObject<bookcarsTypes.User>('bc-user')

  if (user && user.language) {
    return user.language
  }

  let lang = await AsyncStorage.getString('bc-language')

  if (lang && lang.length === 2) {
    return lang
  }

  lang = getDefaultLanguage()
  return lang
}

/**
 * Returns the default application language based on device settings.
 * Falls back to env.DEFAULT_LANGUAGE if unsupported.
 *
 * @returns {string} 
 */
export const getDefaultLanguage = () => {
  const locales = Localization.getLocales()
  const languageCode = locales?.[0]?.languageCode?.toLowerCase() || ''

  const supportedLanguages = ['en', 'fr', 'es']

  return supportedLanguages.includes(languageCode)
    ? languageCode
    : env.DEFAULT_LANGUAGE
}

/**
 * Update user's langauge.
 *
 * @async
 * @param {bookcarsTypes.UpdateLanguagePayload} data
 * @returns {unknown}
 */
export const updateLanguage = async (data: bookcarsTypes.UpdateLanguagePayload) => {
  const headers = await authHeader()
  return axiosInstance
    .post('/api/update-language', data, { headers }).then(async (res) => {
      if (res.status === 200) {
        const user = await AsyncStorage.getObject<bookcarsTypes.User>('bc-user')
        if (user) {
          user.language = data.language
          await AsyncStorage.storeObject('bc-user', user)
        } else {
          toastHelper.error()
        }
      }
      return res.status
    })
}

/**
 * Set language.
 *
 * @async
 * @param {string} lang
 * @returns {void}
 */
export const setLanguage = async (lang: string) => {
  await AsyncStorage.storeString('bc-language', lang)
}

/**
 * Get current User.
 *
 * @async
 * @returns {bookcarsTypes.User|null}
 */
export const getCurrentUser = async () => {
  const user = await AsyncStorage.getObject<bookcarsTypes.User>('bc-user')
  if (user && user.accessToken) {
    return user
  }
  return null
}

/**
 * Get User by ID.
 *
 * @async
 * @param {string} id
 * @returns {Promise<bookcarsTypes.User>}
 */
export const getUser = async (id: string): Promise<bookcarsTypes.User> => {
  const headers = await authHeader()
  return axiosInstance
    .get(`/api/user/${encodeURIComponent(id)}`, {
      headers,
    })
    .then((res) => res.data)
}

/**
 * Update a User.
 *
 * @async
 * @param {bookcarsTypes.UpdateUserPayload} data
 * @returns {Promise<number>}
 */
export const updateUser = async (data: bookcarsTypes.UpdateUserPayload): Promise<number> => {
  const headers = await authHeader()
  return axiosInstance
    .post(
      '/api/update-user',
      data,
      { headers }
    )
    .then((res) => res.status)
}

/**
 * Update email notifications flag.
 *
 * @async
 * @param {bookcarsTypes.UpdateEmailNotificationsPayload} data
 * @returns {Promise<number>}
 */
export const updateEmailNotifications = async (data: bookcarsTypes.UpdateEmailNotificationsPayload): Promise<number> => {
  const headers = await authHeader()
  return axiosInstance
    .post(
      '/api/update-email-notifications',
      data,
      { headers }
    )
    .then(async (res) => {
      if (res.status === 200) {
        const user = await getCurrentUser()
        if (user) {
          user.enableEmailNotifications = data.enableEmailNotifications
          await AsyncStorage.storeObject('bc-user', user)
        }
      }
      return res.status
    })
}

/**
 * Check password.
 *
 * @async
 * @param {string} id
 * @param {string} pass
 * @returns {Promise<number>}
 */
export const checkPassword = async (id: string, pass: string): Promise<number> => {
  const headers = await authHeader()
  return axiosInstance
    .get(
      `/api/check-password/${encodeURIComponent(id)}/${encodeURIComponent(pass)}`,
      { headers }
    )
    .then((res) => res.status)
}

/**
 * Change password.
 *
 * @async
 * @param {bookcarsTypes.ChangePasswordPayload} data
 * @returns {Promise<number>}
 */
export const changePassword = async (data: bookcarsTypes.ChangePasswordPayload): Promise<number> => {
  const headers = await authHeader()
  return axiosInstance
    .post(
      '/api/change-password/ ',
      data,
      { headers }
    )
    .then((res) => res.status)
}

/**
 * Update avatar.
 *
 * @async
 * @param {string} userId
 * @param {BlobInfo} file
 * @returns {Promise<number | undefined>}
 */
export const updateAvatar = async (userId: string, file: BlobInfo): Promise<number> => {
  const uri = Platform.OS === 'android' ? file.uri : file.uri.replace('file://', '')
  const formData = new FormData()
  formData.append('image', {
    uri,
    name: file.name,
    type: file.type,
  } as any)
  const headers = await authHeader()
  return axiosInstance
    .post(
      `/api/update-avatar/${encodeURIComponent(userId)}`,
      formData,
      {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data'
        },
      }
    )
    .then((res) => res.status)
}

/**
 * Delete avatar.
 *
 * @async
 * @param {string} userId
 * @returns {Promise<number>}
 */
export const deleteAvatar = async (userId: string): Promise<number> => {
  const headers = await authHeader()
  return axiosInstance
    .post(
      `/api/delete-avatar/${encodeURIComponent(userId)}`,
      null,
      { headers }
    )
    .then((res) => res.status)
}

/**
 * Check whether the current user is logged in or not.
 *
 * @async
 * @returns {unknown}
 */
export const loggedIn = async () => {
  try {
    const currentUser = await getCurrentUser()
    if (currentUser) {
      const status = await validateAccessToken()
      if (status === 200 && currentUser._id) {
        const user = await getUser(currentUser._id)
        if (user) {
          return true
        }
      }
    }
    return false
  } catch {
    return false
  }
}

/**
 * Check if password exists.
 *
 * @param {string} id
 * @returns {Promise<bookcarsTypes.User|null>}
 */
export const hasPassword = async (id: string): Promise<number> => {
  const headers = await authHeader()

  return axiosInstance
    .get(
      `/api/has-password/${encodeURIComponent(id)}`,
      { headers }
    )
    .then((res) => res.status)
}

/**
* Create temporary license.
*
* @param {BlobInfo} file
* @returns {Promise<string>}
*/
export const createLicense = (file: BlobInfo): Promise<string> => {
  const uri = Platform.OS === 'android' ? file.uri : file.uri.replace('file://', '')
  const formData = new FormData()
  formData.append('file', {
    uri,
    name: file.name,
    type: file.type,
  } as any)

  return axiosInstance
    .post(
      '/api/create-license',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    .then((res) => res.data)
}

/**
 * Update license.
 *
 * @param {string} userId

 * @param {BlobInfo} file
 * @returns {Promise<bookcarsTypes.Response<string>>}
 */
export const updateLicense = async (userId: string, file: BlobInfo): Promise<bookcarsTypes.Response<string>> => {
  const uri = Platform.OS === 'android' ? file.uri : file.uri.replace('file://', '')
  const formData = new FormData()
  formData.append('file', {
    uri,
    name: file.name,
    type: file.type,
  } as any)

  const headers = await authHeader()

  return axiosInstance
    .post(
      `/api/update-license/${userId}`,
      formData,
      {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data'
        },
      },
    )
    .then((res) => ({ status: res.status, data: res.data }))
}

/**
 * Delete license.
 *
 * @param {string} userId
 * @param {string} language
 * @returns {Promise<number>}
 */
export const deleteLicense = async (userId: string): Promise<number> => {
  const headers = await authHeader()
  return axiosInstance
    .post(
      `/api/delete-license/${userId}`,
      null,
      { headers }
    )
    .then((res) => res.status)
}

/**
* Delete a temporary license file.
*
* @param {string} file
* @returns {Promise<number>}
*/
export const deleteTempLicense = (file: string): Promise<number> =>
  axiosInstance
    .post(
      `/api/delete-temp-license/${encodeURIComponent(file)}`,
      null,
    )
    .then((res) => res.status)
