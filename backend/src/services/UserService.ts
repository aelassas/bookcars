import axios from 'axios'
import Env from '../config/env.config'
import * as bookcarsTypes from 'bookcars-types'

export const authHeader = () => {
  const user = JSON.parse(localStorage.getItem('bc-user') ?? 'null')

  if (user && user.accessToken) {
    return { 'x-access-token': user.accessToken }
  } else {
    return {}
  }
}

export const create = (data: bookcarsTypes.CreateUserPayload): Promise<number> =>
  axios
    .post(
      `${Env.API_HOST}/api/create-user`,
      data,
      { headers: authHeader() })
    .then((res) => res.status)

export const signup = (data: bookcarsTypes.BackendSignUpPayload): Promise<number> =>
  axios
    .post(
      `${Env.API_HOST}/api/admin-sign-up/ `,
      data
    )
    .then((res) => res.status)

export const checkToken = (userId: string, email: string, token: string): Promise<number> =>
  axios
    .get(
      `${Env.API_HOST}/api/check-token/${Env.APP_TYPE}/${encodeURIComponent(userId)}/${encodeURIComponent(email)}/${encodeURIComponent(token)}`
    )
    .then((res) => res.status)

export const deleteTokens = (userId: string): Promise<number> =>
  axios
    .delete(
      `${Env.API_HOST}/api/delete-tokens/${encodeURIComponent(userId)}`
    )
    .then((res) => res.status)

export const resend = (email?: string, reset = false, appType: string = bookcarsTypes.AppType.Backend): Promise<number> =>
  axios
    .post(
      `${Env.API_HOST}/api/resend/${appType}/${encodeURIComponent(email || '')}/${reset}`
    )
    .then((res) => res.status)

export const activate = (data: bookcarsTypes.ActivatePayload): Promise<number> =>
  axios
    .post(
      `${Env.API_HOST}/api/activate/ `,
      data,
      { headers: authHeader() }
    )
    .then((res) => res.status)

export const validateEmail = (data: bookcarsTypes.ValidateEmailPayload): Promise<number> =>
  axios
    .post(
      `${Env.API_HOST}/api/validate-email`,
      data
    )
    .then((exist) => exist.status)

export const signin = (data: bookcarsTypes.SignInPayload): Promise<{ status: number, data: bookcarsTypes.User }> =>
  axios
    .post(`${Env.API_HOST}/api/sign-in/${Env.APP_TYPE}`, data)
    .then((res) => {
      if (res.data.accessToken) {
        localStorage.setItem('bc-user', JSON.stringify(res.data))
      }
      return { status: res.status, data: res.data }
    })

export const signout = (redirect = true) => {
  const _signout = () => {
    const deleteAllCookies = () => {
      const cookies = document.cookie.split('')

      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i]
        const eqPos = cookie.indexOf('=')
        const name = eqPos > -1 ? cookie.substring(0, eqPos) : cookie
        document.cookie = name + '=expires=Thu, 01 Jan 1970 00:00:00 GMT'
      }
    }

    sessionStorage.clear()
    localStorage.removeItem('bc-user')
    deleteAllCookies()

    if (redirect) {
      window.location.href = '/sign-in'
    }
  }

  _signout()
}

export const validateAccessToken = (): Promise<number> =>
  axios
    .post(
      `${Env.API_HOST}/api/validate-access-token`,
      null,
      { headers: authHeader() }
    )
    .then((res) => res.status)

export const confirmEmail = (email: string, token: string): Promise<number> => (
  axios
    .post(
      `${Env.API_HOST}/api/confirm-email/` + encodeURIComponent(email) + '/' + encodeURIComponent(token)
    )
    .then((res) => res.status)
)

export const resendLink = (data: bookcarsTypes.ResendLinkPayload): Promise<number> =>
  axios
    .post(
      `${Env.API_HOST}/api/resend-link`,
      data,
      { headers: authHeader() }
    )
    .then((res) => res.status)

export const getLanguage = (): string => {
  const user = JSON.parse(localStorage.getItem('bc-user') ?? 'null')

  if (user && user.language) {
    return user.language as string
  } else {
    const lang = localStorage.getItem('bc-language')
    if (lang && lang.length === 2) {
      return lang
    }
    return Env.DEFAULT_LANGUAGE
  }
}

export const getQueryLanguage = (): string | null => {
  const params = new URLSearchParams(window.location.search)
  if (params.has('l')) {
    return params.get('l') ?? ''
  }
  return ''
}

export const updateLanguage = (data: bookcarsTypes.UpdateLanguagePayload) =>
  axios
    .post(`${Env.API_HOST}/api/update-language`, data, {
      headers: authHeader(),
    })
    .then((res) => {
      if (res.status === 200) {
        const user = JSON.parse(localStorage.getItem('bc-user') ?? 'null')
        user.language = data.language
        localStorage.setItem('bc-user', JSON.stringify(user))
      }
      return res.status
    })

export const setLanguage = (lang: string) => {
  localStorage.setItem('bc-language', lang)
}

export const getCurrentUser = () => {
  const user = JSON.parse(localStorage.getItem('bc-user') ?? 'null')
  if (user && user.accessToken) {
    return user
  }
  return null
}

export const getUser = (id: string): Promise<bookcarsTypes.User> =>
  axios
    .get(
      `${Env.API_HOST}/api/user/` + encodeURIComponent(id),
      { headers: authHeader() }
    )
    .then((res) => res.data)

export const getDrivers = (keyword: string, page: number, size: number): Promise<bookcarsTypes.Result<bookcarsTypes.User>> =>
  axios
    .post(
      `${Env.API_HOST}/api/users/${page}/${size}/?s=${encodeURIComponent(keyword)}`,
      { types: [bookcarsTypes.RecordType.User] },
      { headers: authHeader() })
    .then((res) => res.data)

export const getUsers = (
  payload: bookcarsTypes.GetUsersBody,
  keyword: string,
  page: number,
  size: number): Promise<bookcarsTypes.Result<bookcarsTypes.User>> =>
  axios
    .post(
      `${Env.API_HOST}/api/users/${page}/${size}/?s=${encodeURIComponent(keyword)}`,
      payload,
      { headers: authHeader() }
    )
    .then((res) => res.data)

export const updateUser = (data: bookcarsTypes.UpdateUserPayload): Promise<number> =>
  axios
    .post(
      `${Env.API_HOST}/api/update-user`,
      data,
      { headers: authHeader() }
    )
    .then((res) => res.status)


export const updateEmailNotifications = (data: bookcarsTypes.UpdateEmailNotificationsPayload): Promise<number> =>
  axios
    .post(
      `${Env.API_HOST}/api/update-email-notifications`,
      data,
      { headers: authHeader() }
    )
    .then((res) => {
      if (res.status === 200) {
        const user = getCurrentUser()
        user.enableEmailNotifications = data.enableEmailNotifications
        localStorage.setItem('bc-user', JSON.stringify(user))
      }
      return res.status
    })

export const createAvatar = (file: Blob): Promise<string> => {
  const user = getCurrentUser()
  var formData = new FormData()
  formData.append('image', file)

  return axios
    .post(
      `${Env.API_HOST}/api/create-avatar`,
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
    .then((res) => res.data)
}

export const updateAvatar = (userId: string, file: Blob): Promise<number> => {
  const user = getCurrentUser()
  var formData = new FormData()
  formData.append('image', file)

  return axios
    .post(
      `${Env.API_HOST}/api/update-avatar/${encodeURIComponent(userId)}`,
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

export const deleteAvatar = (userId: string): Promise<number> =>
  axios
    .post(
      `${Env.API_HOST}/api/delete-avatar/${encodeURIComponent(userId)}`,
      null,
      { headers: authHeader() }
    )
    .then((res) => res.status)

export const deleteTempAvatar = (avatar: string): Promise<number> => (
  axios
    .post(
      `${Env.API_HOST}/api/delete-temp-avatar/${encodeURIComponent(avatar)}`,
      null,
      { headers: authHeader() }
    )
    .then((res) => res.status)
)

export const checkPassword = (id: string, pass: string): Promise<number> =>
  axios
    .get(
      `${Env.API_HOST}/api/check-password/${encodeURIComponent(id)}/${encodeURIComponent(pass)}`,
      { headers: authHeader() }
    )
    .then((res) => res.status)

export const changePassword = (data: bookcarsTypes.ChangePasswordPayload): Promise<number> =>
  axios
    .post(
      `${Env.API_HOST}/api/change-password/ `,
      data,
      { headers: authHeader() }
    )
    .then((res) => res.status)

export const deleteUsers = (ids: string[]): Promise<number> => (
  axios
    .post(
      `${Env.API_HOST}/api/delete-users`,
      ids,
      { headers: authHeader() }
    )
    .then((res) => res.status)
)
