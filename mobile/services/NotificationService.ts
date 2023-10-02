import axios from 'axios'
import * as Env from '../config/env.config'
import * as UserService from './UserService'
import * as AxiosHelper from '../common/AxiosHelper'
import * as bookcarsTypes from '../miscellaneous/bookcarsTypes'

AxiosHelper.init(axios)

/**
 * Get a NotificationCounter by UserID.
 *
 * @async
 * @param {string} userId
 * @returns {Promise<bookcarsTypes.NotificationCounter>}
 */
export const getNotificationCounter = async (userId: string): Promise<bookcarsTypes.NotificationCounter> => {
  const headers = await UserService.authHeader()
  return axios
    .get(
      `${Env.API_HOST}/api/notification-counter/${encodeURIComponent(userId)}`,
      { headers }
    )
    .then((res) => res.data)
}

/**
 * Mark notifications as read.
 *
 * @async
 * @param {string} userId
 * @param {string[]} ids
 * @returns {Promise<number>}
 */
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

/**
 * Mark notifications as unread.
 *
 * @async
 * @param {string} userId
 * @param {string[]} ids
 * @returns {Promise<number>}
 */
export const markAsUnread = async (userId: string, ids: string[]): Promise<number> => {
  const headers = await UserService.authHeader()
  return axios
    .post(
`${Env.API_HOST}/api/mark-notifications-as-unread/${encodeURIComponent(userId)}`,
      { ids },
      { headers }
    )
    .then((res) => res.status)
}

/**
 * Delete notifications.
 *
 * @async
 * @param {string} userId
 * @param {string[]} ids
 * @returns {Promise<number>}
 */
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

/**
 * Get Notifications.
 *
 * @async
 * @param {string} userId
 * @param {number} page
 * @returns {Promise<bookcarsTypes.Result<bookcarsTypes.Notification>>}
 */
export const getNotifications = async (userId: string, page: number): Promise<bookcarsTypes.Result<bookcarsTypes.Notification>> => {
  const headers = await UserService.authHeader()
  return axios
    .get(
      `${Env.API_HOST}/api/notifications/${encodeURIComponent(userId)}/${page}/${Env.PAGE_SIZE}`,
      { headers }
    )
    .then((res) => res.data)
}
