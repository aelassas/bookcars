import strings from '../config/app.config.js';
import Notification from '../models/Notification.js';
import NotificationCounter from '../models/NotificationCounter.js';
import User from '../models/User.js';
import nodemailer from "nodemailer";
import mongoose from 'mongoose';

const HTTPS = process.env.BC_HTTPS.toLowerCase() === 'true';
const APP_HOST = process.env.BC_FRONTEND_HOST;
const SMTP_HOST = process.env.BC_SMTP_HOST;
const SMTP_PORT = process.env.BC_SMTP_PORT;
const SMTP_USER = process.env.BC_SMTP_USER;
const SMTP_PASS = process.env.BC_SMTP_PASS;
const SMTP_FROM = process.env.BC_SMTP_FROM;

export const notificationCounter = (req, res) => {
    NotificationCounter.findOne({ user: req.params.userId })
        .then(counter => {
            if (counter) {
                res.json(counter);
            } else {
                const cnt = new NotificationCounter({ user: req.params.userId });
                cnt.save()
                    .then(n => {
                        res.json(cnt);
                    })
                    .catch(err => {
                        console.error(strings.DB_ERROR, err);
                        res.status(400).send(strings.DB_ERROR + err);
                    });
            }
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
};

export const notify = async (req, res) => {
    const notification = new Notification(req.body);
    notification.save()
        .then(notification => {
            User.findById(notification.user)
                .then(user => {
                    if (user) {
                        NotificationCounter.findOne({ user: notification.user })
                            .then(async counter => {
                                if (user.enableEmailNotifications) {
                                    strings.setLanguage(user.language);

                                    const transporter = nodemailer.createTransport({
                                        host: SMTP_HOST,
                                        port: SMTP_PORT,
                                        auth: {
                                            user: SMTP_USER,
                                            pass: SMTP_PASS
                                        }
                                    });

                                    const mailOptions = {
                                        from: SMTP_FROM,
                                        to: user.email,
                                        subject: strings.NOTIFICATION_SUBJECT,
                                        html: '<p ' + (user.language === 'ar' ? 'dir="rtl"' : ')') + '>'
                                            + strings.HELLO + user.fullName + ',<br><br>'
                                            + strings.NOTIFICATION_BODY + '<br><br>'
                                            + '---<br>'
                                            + notification.message + '<br><br>'
                                            + (notification.isLink ? ('<a href="' + notification.link + '">' + strings.NOTIFICATION_LINK + '</a>' + '<br>') : '')
                                            + '<a href="' + 'http' + (HTTPS ? 's' : '') + ':\/\/' + APP_HOST + '\/notifications' + '">' + strings.NOTIFICATIONS_LINK + '</a>'
                                            + '<br>---'
                                            + '<br><br>' + strings.REGARDS + '<br>'
                                            + '</p>'
                                    };

                                    await transporter.sendMail(mailOptions, (err, info) => {
                                        if (err) {
                                            console.error(strings.SMTP_ERROR, err);
                                            res.status(400).send(strings.SMTP_ERROR + err);
                                        }
                                    });
                                }

                                if (counter) {
                                    counter.count = counter.count + 1;
                                    counter.save()
                                        .then(ct => {
                                            res.sendStatus(200);
                                        })
                                        .catch(err => {
                                            console.error(strings.DB_ERROR, err);
                                            res.status(400).send(strings.DB_ERROR + err);
                                        });
                                } else {
                                    const cnt = new NotificationCounter({ user: notification.user, count: 1 });
                                    cnt.save()
                                        .then(n => {
                                            res.sendStatus(200);
                                        })
                                        .catch(err => {
                                            console.error(strings.DB_ERROR, err);
                                            res.status(400).send(strings.DB_ERROR + err);
                                        });
                                }
                            })
                            .catch(err => {
                                console.error(strings.DB_ERROR, err);
                                res.status(400).send(strings.DB_ERROR + err);
                            });
                    } else {
                        console.error(strings.DB_ERROR, err);
                        res.status(400).send(strings.DB_ERROR + err);
                    }
                })
                .catch(err => {
                    console.error(strings.DB_ERROR, err);
                    res.status(400).send(strings.DB_ERROR + err);
                });
        })
        .catch(err => {
            res.status(400).send(strings.DB_ERROR + err)
        });
};

export const getNotifications = async (req, res) => {
    try {
        const userId = mongoose.Types.ObjectId(req.params.userId);
        const page = parseInt(req.params.page);
        const size = parseInt(req.params.size);

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
        ]);

        res.json(notifications);
    } catch (err) {
        console.error(strings.DB_ERROR, err);
        res.status(400).send(strings.DB_ERROR + err);
    }
};

export const markAsRead = async (req, res) => {

    try {
        const { ids: _ids } = req.body, ids = _ids.map(id => mongoose.Types.ObjectId(id));
        const { userId: _userId } = req.params, userId = mongoose.Types.ObjectId(_userId);

        const bulk = Notification.collection.initializeOrderedBulkOp();
        const notifications = await Notification.find({ _id: { $in: ids } });

        bulk.find({ _id: { $in: ids }, isRead: false }).update({ $set: { isRead: true } });
        bulk.execute(async (err, response) => {
            if (err) {
                console.error(`[notification.markAsRead] ${strings.DB_ERROR}`, err);
                return res.status(400).send(strings.DB_ERROR + err);
            }

            const counter = await NotificationCounter.findOne({ user: userId });
            counter.count -= notifications.filter(notification => !notification.isRead).length;
            await counter.save();

            return res.sendStatus(200);
        });

    } catch (err) {
        console.error(`[notification.markAsRead] ${strings.DB_ERROR}`, err);
        return res.status(400).send(strings.DB_ERROR + err);
    }
};

export const markAsUnRead = async (req, res) => {

    try {
        const { ids: _ids } = req.body, ids = _ids.map(id => mongoose.Types.ObjectId(id));
        const { userId: _userId } = req.params, userId = mongoose.Types.ObjectId(_userId);

        const bulk = Notification.collection.initializeOrderedBulkOp();
        const notifications = await Notification.find({ _id: { $in: ids } });

        bulk.find({ _id: { $in: ids }, isRead: true }).update({ $set: { isRead: false } });
        bulk.execute(async (err, response) => {
            if (err) {
                console.error(`[notification.markAsUnRead] ${strings.DB_ERROR}`, err);
                return res.status(400).send(strings.DB_ERROR + err);
            }

            const counter = await NotificationCounter.findOne({ user: userId });
            counter.count += notifications.filter(notification => notification.isRead).length;
            await counter.save();

            return res.sendStatus(200);
        });

    } catch (err) {
        console.error(`[notification.markAsUnRead] ${strings.DB_ERROR}`, err);
        return res.status(400).send(strings.DB_ERROR + err);
    }
};

export const deleteNotifications = async (req, res) => {
    try {
        const { ids: _ids } = req.body, ids = _ids.map(id => mongoose.Types.ObjectId(id));
        const { userId: _userId } = req.params, userId = mongoose.Types.ObjectId(_userId);

        const count = await Notification.find({ _id: { $in: ids }, isRead: false }).count();
        await Notification.deleteMany({ _id: { $in: ids } });

        const counter = await NotificationCounter.findOne({ user: userId });
        counter.count -= count;
        await counter.save();

        return res.sendStatus(200);

    } catch (err) {
        console.error(`[notification.delete] ${strings.DB_ERROR}`, err);
        return res.status(400).send(strings.DB_ERROR + err);
    }
};