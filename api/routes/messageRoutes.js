import express from 'express';
import routeNames from '../config/messageRoutes.config.js';
import authJwt from '../middlewares/authJwt.js';
import strings from '../config/app.config.js';
import User from '../schema/User.js';
import Message from '../schema/Message.js';
import MessageCounter from '../schema/MessageCounter.js';
import nodemailer from "nodemailer";
import mongoose from 'mongoose';

const HTTPS = process.env.BC_HTTPS.toLowerCase() === 'true';
const APP_HOST = process.env.BC_APP_HOST;
const SMTP_HOST = process.env.BC_SMTP_HOST;
const SMTP_PORT = process.env.BC_SMTP_PORT;
const SMTP_USER = process.env.BC_SMTP_USER;
const SMTP_PASS = process.env.BC_SMTP_PASS;
const SMTP_FROM = process.env.BC_SMTP_FROM;

const routes = express.Router();

// Send message Router
routes.route(routeNames.send).post(authJwt.verifyToken, (req, res) => {
    // req.body.from, req.body.to[], req.body.subject, req.body.body
    User.findById(req.body.from)
        .then(async from => {
            req.body.to.forEach(async to => {
                User.findById(to)
                    .then(async user => {
                        if (!user) {
                            console.error('[message.send] User not found:', to);
                            res.sendStatus(204);
                        } else {
                            const data = {
                                from: req.body.from,
                                to: to,
                                subject: req.body.subject,
                                body: req.body.body
                            };

                            const message = new Message(data);

                            message.save()
                                .then(async msg => {
                                    MessageCounter.findOne({ user: user._id })
                                        .then(async counter => {
                                            if (counter) {
                                                counter.count = counter.count + 1;
                                                counter.save()
                                                    .catch(err => {
                                                        console.error(strings.DB_ERROR, err);
                                                        res.status(400).send(strings.DB_ERROR + err);
                                                    });
                                            } else {
                                                const cnt = new MessageCounter({ user: user._id, count: 1 });
                                                cnt.save()
                                                    .catch(err => {
                                                        console.error(strings.DB_ERROR, err);
                                                        res.status(400).send(strings.DB_ERROR + err);
                                                    });
                                            }

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
                                                    subject: strings.MESSAGE_SUBJECT,
                                                    html: '<p ' + (user.language === 'ar' ? 'dir="rtl"' : ')') + '>'
                                                        + strings.HELLO + user.fullName + ',<br><br>'
                                                        + `<a href="${'http' + (HTTPS ? 's' : '') + ':\/\/' + APP_HOST}/profile?u=${from._id}">${from.fullName}</a>` + ' ' + strings.MESSAGE_BODY + '<br><br>'
                                                        + '---<br>'
                                                        + strings.MESSAGE_SUBJECT_TITLE + req.body.subject + '<br><br>'
                                                        + strings.MESSAGE_BODY_TITLE + '<br><br>'
                                                        + req.body.body + '<br><br>'
                                                        + '<a href="' + 'http' + (HTTPS ? 's' : '') + ':\/\/' + APP_HOST + '\/messages?m=' + encodeURIComponent(message._id) + '">' + strings.MESSAGE_LINK + '</a>'
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
                    })
                    .catch(err => {
                        console.error(strings.DB_ERROR, err);
                        res.status(400).send(strings.DB_ERROR + err);
                    });
            });

            res.sendStatus(200);
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
});

// Get messages Router
routes.route(routeNames.getMessages).get(authJwt.verifyToken, async (req, res) => {
    try {
        const page = parseInt(req.params.page);
        const pageSize = parseInt(req.params.pageSize);

        const messages = await Message.aggregate([
            { $match: { to: mongoose.Types.ObjectId(req.params.userId) } },
            {
                $lookup: {
                    from: 'User',
                    let: { userId: '$from' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [{ $eq: ['$_id', '$$userId'] }] // , { $eq: ['$blacklisted', false] }
                                }
                            },
                        }
                    ],
                    as: 'from'
                }
            },
            { $unwind: { path: '$from' } },
            { $sort: { createdAt: -1 } },
            { $skip: ((page - 1) * pageSize) },
            { $limit: pageSize }
        ]);
        res.json(messages);
    } catch (err) {
        console.error(strings.DB_ERROR, err);
        res.status(400).send(strings.DB_ERROR + err);
    }
});

// Get message Router
routes.route(routeNames.getMessage).get(authJwt.verifyToken, (req, res) => {
    Message.findById(req.params.messageId)
        .populate('from')
        .then(msg => res.json(msg))
        .catch(err => {
            console.error(strings.DB_ERROR, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
});

// Mark message as read Router
routes.route(routeNames.markAsRead).post(authJwt.verifyToken, (req, res) => {
    Message.findById(req.params.messageId)
        .then(message => {
            if (message && !message.isRead) {
                message.isRead = true;
                message.save()
                    .then(msg => {
                        MessageCounter.findOne({ user: message.to })
                            .then(counter => {
                                if (counter) {
                                    counter.count = counter.count - 1;
                                    counter.save()
                                        .then(cnt => {
                                            res.sendStatus(200);
                                        })
                                        .catch(err => {
                                            console.error(strings.DB_ERROR, err);
                                            res.status(400).send(strings.DB_ERROR + err);
                                        });
                                } else {
                                    console.log('[message.markAsRead] Counter not found:', message.to);
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
                res.sendStatus(204);
            }
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
});

// Mark message as unread Router
routes.route(routeNames.markAsUnread).post(authJwt.verifyToken, (req, res) => {
    // req.params.messageId
    Message.findById(req.params.messageId)
        .then(message => {
            if (message && message.isRead) {
                message.isRead = false;
                message.save()
                    .then(msg => {
                        MessageCounter.findOne({ user: message.to })
                            .then(counter => {
                                if (counter) {
                                    counter.count = counter.count + 1;
                                    counter.save()
                                        .then(cnt => {
                                            res.sendStatus(200);
                                        })
                                        .catch(err => {
                                            console.error(strings.DB_ERROR, err);
                                            res.status(400).send(strings.DB_ERROR + err);
                                        });
                                } else {
                                    console.log('[message.markAsUnread] Counter not found:', message.to);
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
                res.sendStatus(204);
            }
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
});


// Delete message Router
routes.route(routeNames.delete).delete(authJwt.verifyToken, (req, res) => {
    // req.params.messageId
    Message.findByIdAndDelete(req.params.messageId)
        .then(message => {
            if (!message.isRead) {
                MessageCounter.findOne({ user: message.to })
                    .then(counter => {
                        if (counter) {
                            counter.count = counter.count - 1;
                            counter.save()
                                .then(cnt => {
                                    res.sendStatus(200);
                                })
                                .catch(err => {
                                    console.error(strings.DB_ERROR, err);
                                    res.status(400).send(strings.DB_ERROR + err);
                                });
                        } else {
                            console.log('[message.delete] Counter not found:', message.to);
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

// Get message counter Router
routes.route(routeNames.messageCounter).get(authJwt.verifyToken, (req, res) => {
    // req.params.userId
    MessageCounter.findOne({ user: req.params.userId })
        .then(counter => {
            if (counter) {
                res.json(counter);
            } else {
                const cnt = new MessageCounter({ user: req.params.userId });
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

export default routes;