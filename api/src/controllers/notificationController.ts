import strings from '../config/app.config'
import Notification from '../models/Notification'
import NotificationCounter from '../models/NotificationCounter'
import User from '../models/User'
import nodemailer from "nodemailer"
import mongoose from 'mongoose'

const HTTPS = process.env.BC_HTTPS.toLowerCase() === 'true'
const APP_HOST = process.env.BC_FRONTEND_HOST
const SMTP_HOST = process.env.BC_SMTP_HOST
const SMTP_PORT = process.env.BC_SMTP_PORT
const SMTP_USER = process.env.BC_SMTP_USER
const SMTP_PASS = process.env.BC_SMTP_PASS
const SMTP_FROM = process.env.BC_SMTP_FROM
import {Request, Response} from 'express';

export const notificationCounter = async (req: Request, res: Response) => {
    try {
        const counter = await NotificationCounter.findOne({user: req.params.userId})
        if (counter) {
            return res.json(counter)
        } else {
            const cnt = new NotificationCounter({user: req.params.userId})
            await cnt.save()
            return res.json(cnt)
        }

    } catch (err) {
        console.error(strings.DB_ERROR, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

export const notify = async (req: Request, res: Response) => {
    const notification = new Notification(req.body)
    notification.save()
        .then(notification => {
            User.findById(notification.user)
                .then(user => {
                    if (user) {
                        NotificationCounter.findOne({user: notification.user})
                            .then(async counter => {
                                if (user.enableEmailNotifications) {
                                    strings.setLanguage(user.language)

                                    const transporter = nodemailer.createTransport({
                                        //@ts-ignore
                                        host: SMTP_HOST,
                                        port: SMTP_PORT,
                                        auth: {
                                            user: SMTP_USER,
                                            pass: SMTP_PASS
                                        }
                                    })

                                    const mailOptions = {
                                        from: SMTP_FROM,
                                        to: user.email,
                                        //@ts-ignore
                                        subject: strings.NOTIFICATION_SUBJECT,
                                        html: '<p ' + (user.language === 'ar' ? 'dir="rtl"' : ')') + '>'
                                            + strings.HELLO + user.fullName + ',<br><br>'
                                            //@ts-ignore
                                            + strings.NOTIFICATION_BODY + '<br><br>'
                                            + '---<br>'
                                            + notification.message + '<br><br>'
                                            //@ts-ignore
                                            + (notification.isLink ? ('<a href="' + notification.link + '">' + strings.NOTIFICATION_LINK + '</a>' + '<br>') : '')
                                            //@ts-ignore
                                            + '<a href="' + 'http' + (HTTPS ? 's' : '') + ':\/\/' + APP_HOST + '\/notifications' + '">' + strings.NOTIFICATIONS_LINK + '</a>'
                                            + '<br>---'
                                            + '<br><br>' + strings.REGARDS + '<br>'
                                            + '</p>'
                                    }

                                    await transporter.sendMail(mailOptions, (err) => {
                                        if (err) {
                                            console.error(strings.SMTP_ERROR, err)
                                            res.status(400).send(strings.SMTP_ERROR + err)
                                        }
                                    })
                                }

                                if (counter) {
                                    counter.count = counter.count + 1
                                    counter.save()
                                        .then(() => {
                                            res.sendStatus(200)
                                        })
                                        .catch(err => {
                                            console.error(strings.DB_ERROR, err)
                                            res.status(400).send(strings.DB_ERROR + err)
                                        })
                                } else {
                                    const cnt = new NotificationCounter({user: notification.user, count: 1})
                                    cnt.save()
                                        .then(() => {
                                            res.sendStatus(200)
                                        })
                                        .catch(err => {
                                            console.error(strings.DB_ERROR, err)
                                            res.status(400).send(strings.DB_ERROR + err)
                                        })
                                }
                            })
                            .catch(err => {
                                console.error(strings.DB_ERROR, err)
                                res.status(400).send(strings.DB_ERROR + err)
                            })
                    } else {
                        console.error(strings.DB_ERROR)
                        res.status(400).send(strings.DB_ERROR)
                    }
                })
                .catch(err => {
                    console.error(strings.DB_ERROR, err)
                    res.status(400).send(strings.DB_ERROR + err)
                })
        })
        .catch(err => {
            res.status(400).send(strings.DB_ERROR + err)
        })
}

export const getNotifications = async (req: Request, res: Response) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.params.userId)
        const page = parseInt(req.params.page)
        const size = parseInt(req.params.size)

        const notifications = await Notification.aggregate([
            {$match: {user: userId}},
            {
                $facet: {
                    resultData: [
                        {$sort: {createdAt: -1}},
                        {$skip: ((page - 1) * size)},
                        {$limit: size},
                    ],
                    pageInfo: [
                        {
                            $count: 'totalRecords'
                        }
                    ]
                }
            }
        ])

        res.json(notifications)
    } catch (err) {
        console.error(strings.DB_ERROR, err)
        res.status(400).send(strings.DB_ERROR + err)
    }
}

export const markAsRead = async (req: Request, res: Response) => {

    try {
        const {ids: _ids} = req.body, ids = _ids.map((id: unknown) => new mongoose.Types.ObjectId(String(id)))
        const {userId: _userId} = req.params, userId = new mongoose.Types.ObjectId(_userId)

        const bulk = Notification.collection.initializeOrderedBulkOp()
        const notifications = await Notification.find({_id: {$in: ids}})

        bulk.find({_id: {$in: ids}, isRead: false}).update({$set: {isRead: true}})
        const bulkResult = await bulk.execute();

        if (!bulkResult.isOk()) {
            const errors = bulkResult.getWriteErrors();
            if (errors.length) {
                console.error(`[notification.markAsRead] ${strings.DB_ERROR}`, errors[0])
                return res.status(400).send(strings.DB_ERROR + errors[0])
            }
        }

        const counter = await NotificationCounter.findOne({user: userId});
        if (counter) {
            counter.count -= notifications.filter(notification => !notification.isRead).length
            await counter.save()
        } else {
            const cnt = new NotificationCounter({user: req.params.userId})
            await cnt.save()
        }
        return res.sendStatus(200)

    } catch (err) {
        console.error(`[notification.markAsRead] ${strings.DB_ERROR}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

export const markAsUnRead = async (req: Request, res: Response) => {

    try {
        const {ids: _ids} = req.body, ids = _ids.map((id: unknown) => new mongoose.Types.ObjectId(String(id)))
        const {userId: _userId} = req.params, userId = new mongoose.Types.ObjectId(_userId)

        const bulk = Notification.collection.initializeOrderedBulkOp()
        const notifications = await Notification.find({_id: {$in: ids}})

        bulk.find({_id: {$in: ids}, isRead: true}).update({$set: {isRead: false}})
        // @ts-ignore
        const bulkResponse = await bulk.execute();
        if (!bulkResponse.isOk()) {
            console.error(`[notification.markAsUnRead] ${strings.DB_ERROR}`, bulkResponse.getWriteErrorAt(0))
            return res.status(400).send(strings.DB_ERROR + bulkResponse.getWriteErrorAt(0))
        }

        const counter = await NotificationCounter.findOne({user: userId})
        // @ts-ignore
        counter.count += notifications.filter(notification => notification.isRead).length
        // @ts-ignore
        await counter.save()

        return res.sendStatus(200)
    } catch (err) {
        console.error(`[notification.markAsUnRead] ${strings.DB_ERROR}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

export const deleteNotifications = async (req: Request, res: Response) => {
    try {
        const {ids: _ids} = req.body, ids = _ids.map((id: unknown) => new mongoose.Types.ObjectId(String(id)))
        const {userId: _userId} = req.params, userId = new mongoose.Types.ObjectId(_userId)

        const count = await Notification.find({_id: {$in: ids}, isRead: false}).count()
        await Notification.deleteMany({_id: {$in: ids}})

        const counter = await NotificationCounter.findOne({user: userId})
        // @ts-ignore
        counter.count -= count
        // @ts-ignore
        await counter.save()

        return res.sendStatus(200)

    } catch (err) {
        console.error(`[notification.delete] ${strings.DB_ERROR}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}
