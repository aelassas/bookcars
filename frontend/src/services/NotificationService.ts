import axios from 'axios'
import * as bookcarsTypes from 'bookcars-types'
import Env from '../config/env.config'

/**
 * Get NotificationCounter by UserID.
 *
 * @param {string} userId
 * @returns {Promise<bookcarsTypes.NotificationCounter>}
 */
export const getNotificationCounter = (userId: string): Promise<bookcarsTypes.NotificationCounter> => (
  axios
    .get(
      `${Env.API_HOST}/api/notification-counter/${encodeURIComponent(userId)}`,
      { withCredentials: true }
    )
    .then((res) => res.data)
)

/**
 * Mark Notifications as read.
 *
 * @param {string} userId
 * @param {string[]} ids
 * @returns {Promise<number>}
 */
export const markAsRead = (userId: string, ids: string[]): Promise<number> => (
  axios
    .post(
      `${Env.API_HOST}/api/mark-Notifications-as-read/${encodeURIComponent(userId)}`,
      { ids },
      { withCredentials: true }
    )
    .then((res) => res.status)
)

/**
 * Mark Notifications as unread.
 *
 * @param {string} userId
 * @param {string[]} ids
 * @returns {Promise<number>}
 */
export const markAsUnread = (userId: string, ids: string[]): Promise<number> => (
  axios
    .post(
`${Env.API_HOST}/api/mark-Notifications-as-unread/${encodeURIComponent(userId)}`,
      { ids },
      { withCredentials: true }
    )
    .then((res) => res.status)
)

/**
 * Delete Notifications.
 *
 * @param {string} userId
 * @param {string[]} ids
 * @returns {Promise<number>}
 */
export const deleteNotifications = (userId: string, ids: string[]): Promise<number> => (
  axios
    .post(
      `${Env.API_HOST}/api/delete-Notifications/${encodeURIComponent(userId)}`,
      { ids },
      { withCredentials: true }
)
    .then((res) => res.status)
)

/**
 * Get Notifications.
 *
 * @param {string} userId
 * @param {number} page
 * @returns {Promise<bookcarsTypes.Result<bookcarsTypes.Notification>>}
 */
export const getNotifications = (userId: string, page: number): Promise<bookcarsTypes.Result<bookcarsTypes.Notification>> => (
  axios
    .get(
      `${Env.API_HOST}/api/Notifications/${encodeURIComponent(userId)}/${page}/${Env.PAGE_SIZE}`,
      { withCredentials: true }
    )
    .then((res) => res.data)
)
