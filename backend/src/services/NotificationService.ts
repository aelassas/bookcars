import * as bookcarsTypes from ':bookcars-types'
import axiosInstance from './axiosInstance'
import env from '@/config/env.config'

/**
 * Get NotificationCounter by UserID.
 *
 * @param {string} userId
 * @returns {Promise<bookcarsTypes.NotificationCounter>}
 */
export const getNotificationCounter = (userId: string): Promise<bookcarsTypes.NotificationCounter> => (
  axiosInstance
    .get(
      `/api/notification-counter/${encodeURIComponent(userId)}`,
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
  axiosInstance
    .post(
      `/api/mark-notifications-as-read/${encodeURIComponent(userId)}`,
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
  axiosInstance
    .post(
`/api/mark-notifications-as-unread/${encodeURIComponent(userId)}`,
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
  axiosInstance
    .post(
      `/api/delete-notifications/${encodeURIComponent(userId)}`,
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
  axiosInstance
    .get(
      `/api/notifications/${encodeURIComponent(userId)}/${page}/${env.PAGE_SIZE}`,
      { withCredentials: true }
    )
    .then((res) => res.data)
)
