import axios from 'axios'
import Env from '../config/env.config'
import * as UserService from './UserService'
import * as bookcarsTypes from 'bookcars-types'

export const getNotificationCounter = (userId: string): Promise<bookcarsTypes.NotificationCounter> => (
  axios
    .get(
      `${Env.API_HOST}/api/notification-counter/${encodeURIComponent(userId)}`,
      { headers: UserService.authHeader() }
    )
    .then((res) => res.data)
)

export const markAsRead = (userId: string, ids: string[]): Promise<number> => (
  axios
    .post(
      `${Env.API_HOST}/api/mark-notifications-as-read/${encodeURIComponent(userId)}`,
      { ids },
      { headers: UserService.authHeader() }
    )
    .then((res) => res.status)
)

export const markAsUnread = (userId: string, ids: string[]): Promise<number> => (
  axios
    .post(`${Env.API_HOST}/api/mark-notifications-as-unread/${encodeURIComponent(userId)}`,
      { ids },
      { headers: UserService.authHeader() }
    )
    .then((res) => res.status)
)

export const deleteNotifications = (userId: string, ids: string[]): Promise<number> => (
  axios
    .post(
      `${Env.API_HOST}/api/delete-notifications/${encodeURIComponent(userId)}`,
      { ids },
      { headers: UserService.authHeader() })
    .then((res) => res.status)
)

export const getNotifications = (userId: string, page: number): Promise<bookcarsTypes.Result<bookcarsTypes.Notification>> => (
  axios
    .get(
      `${Env.API_HOST}/api/notifications/${encodeURIComponent(userId)}/${page}/${Env.PAGE_SIZE}`,
      { headers: UserService.authHeader() }
    )
    .then((res) => res.data)
)
