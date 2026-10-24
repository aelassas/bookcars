import mongoose from 'mongoose'
import { Request, Response } from 'express'
import * as bookcarsTypes from ':bookcars-types'
import i18n from '../lang/i18n'
import Notification from '../models/Notification'
import NotificationCounter from '../models/NotificationCounter'
import * as logger from '../utils/logger'
import * as helper from '../utils/helper'

/**
 * Helper to validate and authorize access to user notifications.
 * Ensures the caller is authenticated and authorized to access the specified user's notifications.
 *
 * @param {Request} req
 * @param {Response} res
 * @param {string} paramUserId
 * @returns {mongoose.Types.ObjectId | null}
 */
const getAuthorizedNotificationUserId = (
  req: Request,
  res: Response,
  paramUserId: string,
): mongoose.Types.ObjectId | null => {
  const sessionUser = req.user
  if (!sessionUser || !helper.isValidObjectId(sessionUser._id)) {
    res.status(401).send({ message: 'Unauthorized!' })
    return null
  }

  if (!helper.isValidObjectId(paramUserId)) {
    res.status(400).send(i18n.t('ERROR') + ' Invalid user ID')
    return null
  }

  // Non-admin callers can only access their own notifications
  if (sessionUser.type !== bookcarsTypes.UserType.Admin) {
    if (sessionUser._id !== paramUserId) {
      res.status(403).send('Forbidden: Access denied')
      return null
    }
    return new mongoose.Types.ObjectId(sessionUser._id)
  }

  return new mongoose.Types.ObjectId(paramUserId)
}

/**
 * Get NotificationCounter by UserID.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const notificationCounter = async (req: Request, res: Response) => {
  const { userId } = req.params
  try {
    const targetUserId = getAuthorizedNotificationUserId(req, res, userId)
    if (!targetUserId) {
      return
    }

    const counter = await NotificationCounter.findOne({ user: targetUserId })

    if (counter) {
      res.json(counter)
      return
    }

    const cnt = new NotificationCounter({ user: targetUserId })
    await cnt.save()
    res.json(cnt)
  } catch (err) {
    logger.error(`[notification.notificationCounter] ${i18n.t('ERROR')} ${userId}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Get Notifications by UserID.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getNotifications = async (req: Request, res: Response) => {
  const { userId: _userId, page: _page, size: _size } = req.params

  try {
    const targetUserId = getAuthorizedNotificationUserId(req, res, _userId)
    if (!targetUserId) {
      return
    }

    const page = Number.parseInt(_page, 10)
    const size = Number.parseInt(_size, 10)

    if (Number.isNaN(page) || Number.isNaN(size) || page < 1 || size < 1) {
      res.status(400).send(i18n.t('ERROR') + ' Invalid page or size')
      return
    }

    const notifications = await Notification.aggregate([
      { $match: { user: targetUserId } },
      {
        $facet: {
          resultData: [{ $sort: { createdAt: -1, _id: 1 } }, { $skip: (page - 1) * size }, { $limit: size }],
          pageInfo: [
            {
              $count: 'totalRecords',
            },
          ],
        },
      },
    ])

    res.json(notifications)
  } catch (err) {
    logger.error(`[notification.getNotifications] ${i18n.t('ERROR')} ${_userId}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Mark Notifications as read.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { userId: _userId } = req.params
    const targetUserId = getAuthorizedNotificationUserId(req, res, _userId)
    if (!targetUserId) {
      return
    }

    const { body }: { body: { ids: string[] } } = req
    const { ids: _ids } = body || {}

    if (!Array.isArray(_ids)) {
      res.status(400).send(i18n.t('ERROR') + ' ids must be an array')
      return
    }

    const ids = _ids
      .filter((id) => helper.isValidObjectId(id))
      .map((id) => new mongoose.Types.ObjectId(id))

    const ownedNotifications = await Notification.find({
      _id: { $in: ids },
      user: targetUserId,
      isRead: false,
    })
    const ownedIds = ownedNotifications.map((n) => n._id)

    if (ownedIds.length > 0) {
      await Notification.updateMany(
        { _id: { $in: ownedIds }, user: targetUserId, isRead: false },
        { $set: { isRead: true } },
      )
    }

    const counter = await NotificationCounter.findOne({ user: targetUserId })
    if (!counter || typeof counter.count === 'undefined') {
      res.sendStatus(204)
      return
    }
    counter.count = Math.max(0, counter.count - ownedIds.length)
    await counter.save()

    res.sendStatus(200)
  } catch (err) {
    logger.error(`[notification.markAsRead] ${i18n.t('ERROR')}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Mark Notifications as unread.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const markAsUnRead = async (req: Request, res: Response) => {
  try {
    const { userId: _userId } = req.params
    const targetUserId = getAuthorizedNotificationUserId(req, res, _userId)
    if (!targetUserId) {
      return
    }

    const { body }: { body: { ids: string[] } } = req
    const { ids: _ids } = body || {}

    if (!Array.isArray(_ids)) {
      res.status(400).send(i18n.t('ERROR') + ' ids must be an array')
      return
    }

    const ids = _ids
      .filter((id) => helper.isValidObjectId(id))
      .map((id) => new mongoose.Types.ObjectId(id))

    const ownedNotifications = await Notification.find({
      _id: { $in: ids },
      user: targetUserId,
      isRead: true,
    })
    const ownedIds = ownedNotifications.map((n) => n._id)

    if (ownedIds.length > 0) {
      await Notification.updateMany(
        { _id: { $in: ownedIds }, user: targetUserId, isRead: true },
        { $set: { isRead: false } },
      )
    }

    const counter = await NotificationCounter.findOne({ user: targetUserId })
    if (!counter || typeof counter.count === 'undefined') {
      res.sendStatus(204)
      return
    }
    counter.count += ownedIds.length
    await counter.save()

    res.sendStatus(200)
  } catch (err) {
    logger.error(`[notification.markAsUnRead] ${i18n.t('ERROR')}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Delete Notifications.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const deleteNotifications = async (req: Request, res: Response) => {
  try {
    const { userId: _userId } = req.params
    const targetUserId = getAuthorizedNotificationUserId(req, res, _userId)
    if (!targetUserId) {
      return
    }

    const { body }: { body: { ids: string[] } } = req
    const { ids: _ids } = body || {}

    if (!Array.isArray(_ids)) {
      res.status(400).send(i18n.t('ERROR') + ' ids must be an array')
      return
    }

    const ids = _ids
      .filter((id) => helper.isValidObjectId(id))
      .map((id) => new mongoose.Types.ObjectId(id))

    const count = await Notification.countDocuments({
      _id: { $in: ids },
      user: targetUserId,
      isRead: false,
    })

    await Notification.deleteMany({
      _id: { $in: ids },
      user: targetUserId,
    })

    const counter = await NotificationCounter.findOne({ user: targetUserId })
    if (!counter || typeof counter.count === 'undefined') {
      res.sendStatus(204)
      return
    }
    counter.count = Math.max(0, counter.count - count)
    await counter.save()

    res.sendStatus(200)
  } catch (err) {
    logger.error(`[notification.deleteNotifications] ${i18n.t('ERROR')}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}
