import mongoose from 'mongoose'
import { Request, Response } from 'express'
import i18n from '../lang/i18n'
import Notification from '../models/Notification'
import NotificationCounter from '../models/NotificationCounter'
import * as logger from '../utils/logger'

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
    const counter = await NotificationCounter.findOne({ user: userId })

    if (counter) {
      res.json(counter)
      return
    }
    const cnt = new NotificationCounter({ user: userId })
    await cnt.save()
    res.json(cnt)
  } catch (err) {
    logger.error(`[notification.notificationCounter] ${i18n.t('DB_ERROR')} ${userId}`, err)
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
    const userId = new mongoose.Types.ObjectId(_userId)
    const page = Number.parseInt(_page, 10)
    const size = Number.parseInt(_size, 10)

    const notifications = await Notification.aggregate([
      { $match: { user: userId } },
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
    logger.error(`[notification.getNotifications] ${i18n.t('DB_ERROR')} ${_userId}`, err)
    res.status(400).send(i18n.t('DB_ERROR') + err)
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
    const { body }: { body: { ids: string[] } } = req
    const { ids: _ids } = body
    const ids = _ids.map((id) => new mongoose.Types.ObjectId(id))
    const { userId: _userId } = req.params
    const userId = new mongoose.Types.ObjectId(_userId)

    const bulk = Notification.collection.initializeOrderedBulkOp()
    const notifications = await Notification.find({
      _id: { $in: ids },
      isRead: false,
    })
    const { length } = notifications

    bulk.find({ _id: { $in: ids }, isRead: false }).update({ $set: { isRead: true } })
    await bulk.execute()
    // const result = await bulk.execute()

    // if (result.modifiedCount !== length) {
    //   logger.error(`[notification.markAsRead] ${i18n.t('DB_ERROR')}`)
    //   res.status(400).send(i18n.t('DB_ERROR'))
    // }

    const counter = await NotificationCounter.findOne({ user: userId })
    if (!counter || typeof counter.count === 'undefined') {
      res.sendStatus(204)
      return
    }
    counter.count -= length
    await counter.save()

    res.sendStatus(200)
  } catch (err) {
    logger.error(`[notification.markAsRead] ${i18n.t('DB_ERROR')}`, err)
    res.status(400).send(i18n.t('DB_ERROR') + err)
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
    const { body }: { body: { ids: string[] } } = req
    const { ids: _ids } = body
    const ids = _ids.map((id) => new mongoose.Types.ObjectId(id))
    const { userId: _userId } = req.params
    const userId = new mongoose.Types.ObjectId(_userId)

    const bulk = Notification.collection.initializeOrderedBulkOp()
    const notifications = await Notification.find({
      _id: { $in: ids },
      isRead: true,
    })
    const { length } = notifications

    bulk.find({ _id: { $in: ids }, isRead: true }).update({ $set: { isRead: false } })
    await bulk.execute()
    // const result = await bulk.execute()

    // if (result.modifiedCount !== length) {
    //   logger.error(`[notification.markAsUnRead] ${i18n.t('DB_ERROR')}`)
    //   res.status(400).send(i18n.t('DB_ERROR'))
    // }

    const counter = await NotificationCounter.findOne({ user: userId })
    if (!counter || typeof counter.count === 'undefined') {
      res.sendStatus(204)
      return
    }
    counter.count += length
    await counter.save()

    res.sendStatus(200)
  } catch (err) {
    logger.error(`[notification.markAsUnRead] ${i18n.t('DB_ERROR')}`, err)
    res.status(400).send(i18n.t('DB_ERROR') + err)
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
    const { body }: { body: { ids: string[] } } = req
    const { ids: _ids } = body
    const ids = _ids.map((id) => new mongoose.Types.ObjectId(id))
    const { userId: _userId } = req.params
    const userId = new mongoose.Types.ObjectId(_userId)

    const count = await Notification
      .find({ _id: { $in: ids }, isRead: false })
      .countDocuments()

    await Notification.deleteMany({ _id: { $in: ids } })

    const counter = await NotificationCounter.findOne({ user: userId })
    if (!counter || typeof counter.count === 'undefined') {
      res.sendStatus(204)
      return
    }
    counter.count -= count
    await counter.save()

    res.sendStatus(200)
  } catch (err) {
    logger.error(`[notification.deleteNotifications] ${i18n.t('DB_ERROR')}`, err)
    res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}
