import express from 'express';
import routeNames from '../config/notificationRoutes.config.js';
import authJwt from '../middlewares/authJwt.js';
import strings from '../config/app.config.js';
import Notification from '../schema/Notification.js';
import NotificationCounter from '../schema/NotificationCounter.js';
import User from '../schema/User.js';
import nodemailer from "nodemailer";
import mongoose from 'mongoose';

const HTTPS = process.env.BC_HTTPS.toLowerCase() === 'true';
const APP_HOST = process.env.BC_FRONTEND_HOST;
const SMTP_HOST = process.env.BC_SMTP_HOST;
const SMTP_PORT = process.env.BC_SMTP_PORT;
const SMTP_USER = process.env.BC_SMTP_USER;
const SMTP_PASS = process.env.BC_SMTP_PASS;
const SMTP_FROM = process.env.BC_SMTP_FROM;

const routes = express.Router();

// Get notifications count Router
routes.route(routeNames.notificationCounter).get(authJwt.verifyToken, (req, res) => {
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
});

// Create Notification Router
routes.route(routeNames.notify).post(authJwt.verifyToken, async (req, res) => {
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
});

// Get Notifications Router
routes.route(routeNames.getNotifications).get(authJwt.verifyToken, async (req, res) => {
    try {
        const userId = mongoose.Types.ObjectId(req.params.userId);
        const page = parseInt(req.params.page);
        const pageSize = parseInt(req.params.pageSize);

        const notifications = await Notification.aggregate([
            { $match: { user: userId } },
            { $sort: { createdAt: -1 } },
            { $skip: ((page - 1) * pageSize) },
            { $limit: pageSize }
        ]);

        res.json(notifications);
    } catch (err) {
        console.error(strings.DB_ERROR, err);
        res.status(400).send(strings.DB_ERROR + err);
    }
});

// Mark as read router
routes.route(routeNames.markAsRead).post(authJwt.verifyToken, (req, res) => {
    Notification.findById(req.params.notificationId)
        .then(notification => {
            if (notification) {
                if (!notification.isRead) {
                    notification.isRead = true;
                    notification.save()
                        .then(nn => {
                            NotificationCounter.findOne({ user: notification.user })
                                .then(counter => {
                                    if (counter) {
                                        counter.count = counter.count - 1;
                                        counter.save()
                                            .then(ct => {
                                                res.sendStatus(200);
                                            })
                                            .catch(err => {
                                                console.error(strings.DB_ERROR, err);
                                                res.status(400).send(strings.DB_ERROR + err);
                                            });
                                    } else {
                                        console.error('[notification.markAsRead] Counter not found:', notification.user);
                                        res.sendStatus(204);
                                    }
                                })
                                .catch(err => {
                                    console.error(strings.DB_ERROR, err);
                                    res.status(400).send(strings.DB_ERROR + err);
                                });
                        })
                        .catch(err => {
                            console.error(strings.DB_ERROR, err);
                            res.status(400).send(strings.DB_ERROR + err);
                        });
                }
                else {
                    res.sendStatus(400);
                }
            } else {
                console.error('[notification.markAsRead] Notification not found:', req.params);
                res.sendStatus(204);
            }
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
});

// Mark as unread router
routes.route(routeNames.markAsUnRead).post(authJwt.verifyToken, (req, res) => {
    Notification.findById(req.params.notificationId)
        .then(notification => {
            if (notification) {
                if (notification.isRead) {
                    notification.isRead = false;
                    notification.save()
                        .then(nn => {
                            NotificationCounter.findOne({ user: notification.user })
                                .then(counter => {
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
                                        console.error('[notification.markAsUnRead] Counter not found:', notification.user);
                                        res.sendStatus(204);
                                    }
                                })
                                .catch(err => {
                                    console.error(strings.DB_ERROR, err);
                                    res.status(400).send(strings.DB_ERROR + err);
                                });
                        })
                        .catch(err => {
                            console.error(strings.DB_ERROR, err);
                            res.status(400).send(strings.DB_ERROR + err);
                        });
                } else {
                    res.sendStatus(400);
                }
            } else {
                console.error('[notification.markAsUnRead] Notification not found:', req.params);
                res.sendStatus(204);
            }
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
});

// Delete Notification Router
routes.route(routeNames.delete).delete(authJwt.verifyToken, (req, res) => {
    Notification.findByIdAndDelete(req.params.notificationId)
        .then(notification => {
            if (!notification.isRead) {
                NotificationCounter.findOne({ user: notification.user })
                    .then(counter => {
                        if (counter) {
                            counter.count = counter.count - 1;
                            counter.save()
                                .then(ct => {
                                    res.sendStatus(200);
                                })
                                .catch(err => {
                                    console.error(strings.DB_ERROR, err);
                                    res.status(400).send(strings.DB_ERROR + err);
                                });
                        } else {
                            console.error('[notification.delete] Counter not found:', notification.user);
                            res.sendStatus(204);
                        }
                    })
                    .catch(err => {
                        console.error(strings.DB_ERROR, err);
                        res.status(400).send(strings.DB_ERROR + err);
                    });
            } else {
                res.sendStatus(200);
            }

        })
        .catch(err => {
            console.error(strings.DB_ERROR, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
});

export default routes;