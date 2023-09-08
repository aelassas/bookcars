import axios from 'axios'
import * as Env from '../config/env.config'
import * as UserService from './UserService'
import * as AxiosHelper from '../common/AxiosHelper'
import * as bookcarsTypes from  '../miscellaneous/bookcarsTypes'

AxiosHelper.init(axios)

export const getNotificationCounter = async (userId: string): Promise<bookcarsTypes.NotificationCounter> => {
  const headers = await UserService.authHeader()
  return axios
    .get(
      `${Env.API_HOST}/api/notification-counter/${encodeURIComponent(userId)}`,
      { headers }
    )
    .then((res) => res.data)
}

export const markAsRead = async (userId: string, ids: string[]): Promise<number> => {
  const headers = await UserService.authHeader()
  return axios
    .post(
      `${Env.API_HOST}/api/mark-notifications-as-read/${encodeURIComponent(userId)}`,
      { ids },
      { headers }
    )
    .then((res) => res.status)
}

export const markAsUnread = async (userId: string, ids: string[]): Promise<number> => {
  const headers = await UserService.authHeader()
  return axios
    .post(`${Env.API_HOST}/api/mark-notifications-as-unread/${encodeURIComponent(userId)}`,
      { ids },
      { headers }
    )
    .then((res) => res.status)
}

export const deleteNotifications = async (userId: string, ids: string[]): Promise<number> => {
  const headers = await UserService.authHeader()
  return axios
    .post(
      `${Env.API_HOST}/api/delete-notifications/${encodeURIComponent(userId)}`,
      { ids },
      { headers }
    )
    .then((res) => res.status)
}

export const getNotifications = async (userId: string, page: number): Promise<bookcarsTypes.Result<bookcarsTypes.Notification>> => {
  const headers = await UserService.authHeader()
  return axios
    .get(
      `${Env.API_HOST}/api/notifications/${encodeURIComponent(userId)}/${page}/${Env.PAGE_SIZE}`,
      { headers }
    )
    .then((res) => res.data)
}
