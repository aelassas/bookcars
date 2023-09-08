import axios from 'axios'
import { Platform } from 'react-native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as Env from '../config/env.config'
import * as AsyncStorage from '../common/AsyncStorage'
import * as AxiosHelper from '../common/AxiosHelper'
import * as Localization from 'expo-localization'
import * as ToastHelper from '../common/ToastHelper'
import * as bookcarsTypes from '../miscellaneous/bookcarsTypes'

AxiosHelper.init(axios)

export const authHeader = async () => {
  const user = await getCurrentUser()

  if (user && user.accessToken) {
    return { 'x-access-token': user.accessToken }
  } else {
    return {}
  }
}

export const signup = (data: bookcarsTypes.FrontendSignUpPayload): Promise<number> =>
  axios
    .post(
      `${Env.API_HOST}/api/sign-up`,
      data)
    .then((res) => res.status)

export const checkToken = (userId: string, email: string, token: string): Promise<number> =>
  axios
    .get(
      `${Env.API_HOST}/api/check-token/${Env.APP_TYPE}/${encodeURIComponent(userId)}/${encodeURIComponent(email)}/${encodeURIComponent(token)}`
    )
    .then((res) => res.status)

export const deleteTokens = (userId: string): Promise<number> =>
  axios
    .delete(`${Env.API_HOST}/api/delete-tokens/${encodeURIComponent(userId)}`
    )
    .then((res) => res.status)

export const resend = (email: string, reset = false): Promise<number> =>
  axios
    .post(
      `${Env.API_HOST}/api/resend/${Env.APP_TYPE}/${encodeURIComponent(email)}/${reset}`
    )
    .then((res) => res.status)

export const activate = async (data: bookcarsTypes.ActivatePayload): Promise<number> => {
  const headers = await authHeader()
  return axios
    .post(
      `${Env.API_HOST}/api/activate/ `,
      data,
      { headers: headers }
    )
    .then((res) => res.status)
}

export const validateEmail = (data: bookcarsTypes.ValidateEmailPayload): Promise<number> =>
  axios
    .post(
      `${Env.API_HOST}/api/validate-email`,
      data
    )
    .then((res) => res.status)

export const signin = async (data: bookcarsTypes.SignInPayload): Promise<{ status: number, data: bookcarsTypes.User }> =>
  axios
    .post(
      `${Env.API_HOST}/api/sign-in/frontend`,
      data
    )
    .then(async (res) => {
      if (res.data.accessToken) {
        await AsyncStorage.storeObject('bc-user', res.data)
      }
      return { status: res.status, data: res.data }
    })

export const getPushToken = async (userId: string): Promise<{ status: number, data: string }> => {
  const headers = await authHeader()
  return axios
    .get(
      `${Env.API_HOST}/api/push-token/${encodeURIComponent(userId)}`,
      { headers }
    )
    .then((res) => ({ status: res.status, data: res.data }))
}

export const createPushToken = async (userId: string, token: string): Promise<number> => {
  const headers = await authHeader()
  return axios
    .post(
      `${Env.API_HOST}/api/create-push-token/${encodeURIComponent(userId)}/${encodeURIComponent(token)}`,
      null,
      { headers }
    )
    .then((res) => res.status)
}

export const deletePushToken = async (userId: string): Promise<number> => {
  const headers = await authHeader()
  return axios.post(
    `${Env.API_HOST}/api/delete-push-token/${encodeURIComponent(userId)}`,
    null,
    { headers }
  )
    .then((res) => res.status)
}

export const signout = async (
  navigation: NativeStackNavigationProp<StackParams, keyof StackParams>,
  redirect = true,
  redirectSignin = false) => {
  await AsyncStorage.removeItem('bc-user')

  if (redirect) {
    navigation.navigate('Home', { d: new Date().getTime() })
  }
  if (redirectSignin) {
    navigation.navigate('SignIn', {})
  }
}

export const validateAccessToken = async (): Promise<number> => {
  const headers = await authHeader()
  return axios
    .post(
      `${Env.API_HOST}/api/validate-access-token`, null, {
      headers: headers,
      timeout: Env.AXIOS_TIMEOUT,
    })
    .then((res) => res.status)
}

export const confirmEmail = (email: string, token: string): Promise<number> =>
  axios.post(
    `${Env.API_HOST}/api/confirm-email/` + encodeURIComponent(email) + '/' + encodeURIComponent(token)
  )
    .then((res) => res.status)

export const resendLink = async (data: bookcarsTypes.ResendLinkPayload): Promise<number> => {
  const headers = await authHeader()
  return axios
    .post(
      `${Env.API_HOST}/api/resend-link`,
      data,
      { headers: headers }
    )
    .then((res) => res.status)
}

export const getLanguage = async () => {
  const user = await AsyncStorage.getObject<bookcarsTypes.User>('bc-user')

  if (user && user.language) {
    return user.language
  } else {
    let lang = await AsyncStorage.getString('bc-language')

    if (lang && lang.length === 2) {
      return lang
    }

    lang = Localization.locale.includes(Env.LANGUAGE.FR) ? Env.LANGUAGE.FR : Env.DEFAULT_LANGUAGE
    return lang
  }
}

export const updateLanguage = async (data: bookcarsTypes.UpdateLanguagePayload) => {
  const headers = await authHeader()
  return axios.post(`${Env.API_HOST}/api/update-language`, data, { headers: headers }).then(async (res) => {
    if (res.status === 200) {
      const user = await AsyncStorage.getObject<bookcarsTypes.User>('bc-user')
      if (user) {
        user.language = data.language
        await AsyncStorage.storeObject('bc-user', user)
      } else {
        ToastHelper.error()
      }
    }
    return res.status
  })
}

export const setLanguage = async (lang: string) => {
  await AsyncStorage.storeString('bc-language', lang)
}

export const getCurrentUser = async () => {
  const user = await AsyncStorage.getObject<bookcarsTypes.User>('bc-user')
  if (user && user.accessToken) {
    return user
  }
  return null
}

export const getUser = async (id: string): Promise<bookcarsTypes.User> => {
  const headers = await authHeader()
  return axios
    .get(`${Env.API_HOST}/api/user/` + encodeURIComponent(id), {
      headers: headers,
    })
    .then((res) => res.data)
}

export const updateUser = async (data: bookcarsTypes.UpdateUserPayload): Promise<number> => {
  const headers = await authHeader()
  return axios
    .post(
      `${Env.API_HOST}/api/update-user`,
      data,
      { headers: headers }
    )
    .then((res) => res.status)
}

export const updateEmailNotifications = async (data: bookcarsTypes.UpdateEmailNotificationsPayload): Promise<number> => {
  const headers = await authHeader()
  return axios
    .post(
      `${Env.API_HOST}/api/update-email-notifications`, data,
      { headers: headers }
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

export const checkPassword = async (id: string, pass: string): Promise<number> => {
  const headers = await authHeader()
  return axios
    .get(
      `${Env.API_HOST}/api/check-password/${encodeURIComponent(id)}/${encodeURIComponent(pass)}`,
      { headers: headers }
    )
    .then((res) => res.status)
}

export const changePassword = async (data: bookcarsTypes.ChangePasswordPayload): Promise<number> => {
  const headers = await authHeader()
  return axios
    .post(
      `${Env.API_HOST}/api/change-password/ `,
      data,
      { headers: headers }
    )
    .then((res) => res.status)
}

export const updateAvatar = async (userId: string, file: BlobInfo): Promise<number | undefined> => {
  async function _updateAvatar() {
    const user = await AsyncStorage.getObject<bookcarsTypes.User>('bc-user')
    const uri = Platform.OS === 'android' ? file.uri : file.uri.replace('file://', '')
    const formData = new FormData()
    formData.append('image', {
      uri,
      name: file.name,
      type: file.type,
    } as any)
    return axios
      .post(
        `${Env.API_HOST}/api/update-avatar/` + encodeURIComponent(userId),
        formData,
        user && user.accessToken
          ? {
            headers: {
              'x-access-token': user.accessToken,
              'Content-Type': 'multipart/form-data',
            },
          }
          : { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      .then((res) => res.status)
  }

  let retries = 5
  while (retries > 0) {
    try {
      return await _updateAvatar()
    } catch (err) {
      // Retry if Stream Closed
      retries--
    }
  }
}

export const deleteAvatar = async (userId: string): Promise<number> => {
  const headers = await authHeader()
  return axios
    .post(
      `${Env.API_HOST}/api/delete-avatar/` + encodeURIComponent(userId),
      null,
      { headers: headers }
    )
    .then((res) => res.status)
}

export const loggedIn = async () => {
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
}
