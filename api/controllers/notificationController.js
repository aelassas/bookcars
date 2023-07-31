import strings from '../config/app.config.js'
import Notification from '../models/Notification.js'
import NotificationCounter from '../models/NotificationCounter.js'
import User from '../models/User.js'
import mongoose from 'mongoose'
import * as Helper from '../common/Helper.js'

const HTTPS = process.env.BC_HTTPS.toLowerCase() === 'true'
const APP_HOST = process.env.BC_FRONTEND_HOST
const SMTP_FROM = process.env.BC_SMTP_FROM

export const notificationCounter = async (req, res) => {
    const { userId } = req.params
    try {
        const counter = await NotificationCounter.findOne({ user: userId })

        if (counter) {
            res.json(counter)
        } else {
            const cnt = new NotificationCounter({ user: userId })
            await cnt.save()
            return res.json(cnt)
        }
    } catch (err) {
        console.error(`[notification.notificationCounter] ${strings.DB_ERROR} ${userId}`, err)
        return res.status(400).send(strings.ERROR + err)
    }
}

export const notify = async (req, res) => {
    try {
        const notification = new Notification(req.body)
        await notification.save()

        const user = await User.findById(notification.user)

        if (user) {
            const counter = await NotificationCounter.findOne({ user: notification.user })

            if (user.enableEmailNotifications) {
                strings.setLanguage(user.language)

                const mailOptions = {
                    from: SMTP_FROM,
                    to: user.email,
                    subject: strings.NOTIFICATION_SUBJECT,
                    html: '<p>'
                        + strings.HELLO + user.fullName + ',<br><br>'
                        + strings.NOTIFICATION_BODY + '<br><br>'
                        + '---<br>'
                        + notification.message + '<br><br>'
                        + (notification.isLink ? ('<a href="' + notification.link + '">' + strings.NOTIFICATION_LINK + '</a>' + '<br>') : '')
                        + '<a href="' + 'http' + (HTTPS ? 's' : '') + '://' + APP_HOST + '/notifications' + '">' + strings.NOTIFICATIONS_LINK + '</a>'
                        + '<br>---'
                        + '<br><br>' + strings.REGARDS + '<br>'
                        + '</p>'
                }

                await Helper.sendMail(mailOptions)
            }

            if (counter) {
                counter.count = counter.count + 1
                await counter.save()
                return res.sendStatus(200)
            } else {
                const cnt = new NotificationCounter({ user: notification.user, count: 1 })
                await cnt.save()
                return res.sendStatus(200)
            }
        } else {
            console.error(strings.DB_ERROR)
            res.status(400).send(strings.DB_ERROR)
        }
    } catch (err) {
        console.error(`[notification.notify] ${strings.DB_ERROR} ${req.body}`, err)
        return res.status(400).send(strings.ERROR + err)
    }
}

export const getNotifications = async (req, res) => {
    const { userId: _userId, page: _page, size: _size } = req.params

    try {
        const userId = new mongoose.Types.ObjectId(_userId)
        const page = parseInt(_page)
        const size = parseInt(_size)

        const notifications = await Notification.aggregate([
            { $match: { user: userId } },
            {
                $facet: {
                    resultData: [
                        { $sort: { createdAt: -1 } },
                        { $skip: ((page - 1) * size) },
                        { $limit: size },
                    ],
                    pageInfo: [
                        {
                            $count: 'totalRecords'
                        }
                    ]
                }
            }
        ])

        return res.json(notifications)
    } catch (err) {
        console.error(`[notification.getNotifications] ${strings.DB_ERROR} ${_userId}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

export const markAsRead = async (req, res) => {
    try {
        const { ids: _ids } = req.body, ids = _ids.map(id => new mongoose.Types.ObjectId(id))
        const { userId: _userId } = req.params, userId = new mongoose.Types.ObjectId(_userId)

        const bulk = Notification.collection.initializeOrderedBulkOp()
        const notifications = await Notification.find({ _id: { $in: ids }, isRead: false })
        const length = notifications.length

        bulk.find({ _id: { $in: ids }, isRead: false }).update({ $set: { isRead: true } })
        const result = await bulk.execute()

        if (result.modifiedCount !== length) {
            console.error(`[notification.markAsRead] ${strings.DB_ERROR}`)
            return res.status(400).send(strings.DB_ERROR)
        }
        const counter = await NotificationCounter.findOne({ user: userId })
        counter.count -= length
        await counter.save()

        return res.sendStatus(200)
    } catch (err) {
        console.error(`[notification.markAsRead] ${strings.DB_ERROR}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

export const markAsUnRead = async (req, res) => {

    try {
        const { ids: _ids } = req.body, ids = _ids.map(id => new mongoose.Types.ObjectId(id))
        const { userId: _userId } = req.params, userId = new mongoose.Types.ObjectId(_userId)

        const bulk = Notification.collection.initializeOrderedBulkOp()
        const notifications = await Notification.find({ _id: { $in: ids }, isRead: true })
        const length = notifications.length

        bulk.find({ _id: { $in: ids }, isRead: true }).update({ $set: { isRead: false } })
        const result = await bulk.execute()

        if (result.modifiedCount !== length) {
            console.error(`[notification.markAsUnRead] ${strings.DB_ERROR}`)
            return res.status(400).send(strings.DB_ERROR)
        }
        const counter = await NotificationCounter.findOne({ user: userId })
        counter.count += length
        await counter.save()

        return res.sendStatus(200)
    } catch (err) {
        console.error(`[notification.markAsUnRead] ${strings.DB_ERROR}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

export const deleteNotifications = async (req, res) => {
    try {
        const { ids: _ids } = req.body, ids = _ids.map(id => new mongoose.Types.ObjectId(id))
        const { userId: _userId } = req.params, userId = new mongoose.Types.ObjectId(_userId)

        const count = await Notification.find({ _id: { $in: ids }, isRead: false }).count()
        await Notification.deleteMany({ _id: { $in: ids } })

        const counter = await NotificationCounter.findOne({ user: userId })
        counter.count -= count
        await counter.save()

        return res.sendStatus(200)
    } catch (err) {
        console.error(`[notification.deleteNotifications] ${strings.DB_ERROR}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}