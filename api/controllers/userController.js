import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import path from 'path';
import fs from 'fs';
import nodemailer from 'nodemailer';
import { v1 as uuid } from 'uuid';
import escapeStringRegexp from 'escape-string-regexp';
import strings from '../config/app.config.js';
import Env from '../config/env.config.js';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import Token from '../models/Token.js';
import PushNotification from '../models/PushNotification.js';
import mongoose from 'mongoose';
import * as Helper from '../common/Helper.js';

const DEFAULT_LANGUAGE = process.env.BC_DEFAULT_LANGUAGE;
const HTTPS = process.env.BC_HTTPS.toLowerCase() === 'true';
const JWT_SECRET = process.env.BC_JWT_SECRET;
const JWT_EXPIRE_AT = parseInt(process.env.BC_JWT_EXPIRE_AT);
const SMTP_HOST = process.env.BC_SMTP_HOST;
const SMTP_PORT = process.env.BC_SMTP_PORT;
const SMTP_USER = process.env.BC_SMTP_USER;
const SMTP_PASS = process.env.BC_SMTP_PASS;
const SMTP_FROM = process.env.BC_SMTP_FROM;
const CDN = process.env.BC_CDN_USERS;
const CDN_TEMP = process.env.BC_CDN_TEMP_USERS;
const BACKEND_HOST = process.env.BC_BACKEND_HOST;
const FRONTEND_HOST = process.env.BC_FRONTEND_HOST;

const getStatusMessage = (lang, msg) => {
    if (lang === 'ar') {
        return '<!DOCTYPE html><html dir="rtl" lang="ar"><head></head><body><p>' + msg + '</p></body></html>';
    }
    return '<!DOCTYPE html><html lang="' + lang + '"><head></head><body><p>' + msg + '</p></body></html>';
};

export const signup = (req, res) => {
    const { body } = req;
    body.active = true;
    body.verified = false;
    body.blacklisted = false;
    body.type = Env.USER_TYPE.USER;

    const salt = bcrypt.genSaltSync(10);
    const password = body.password;
    const passwordHash = bcrypt.hashSync(password, salt);
    body.password = passwordHash;

    const user = new User(body);
    user.save()
        .then(user => {
            // avatar
            if (body.avatar) {
                const avatar = path.join(CDN_TEMP, body.avatar);
                if (fs.existsSync(avatar)) {
                    const filename = `${user._id}_${Date.now()}${path.extname(body.avatar)}`;
                    const newPath = path.join(CDN, filename);

                    try {
                        fs.renameSync(avatar, newPath);
                        user.avatar = filename;
                        user.save()
                            .catch(err => {
                                console.error(strings.DB_ERROR, err);
                                res.status(400).send(strings.DB_ERROR + err);
                            });
                    } catch (err) {
                        console.error(strings.ERROR, err);
                        res.status(400).send(strings.ERROR + err);
                    }
                }
            }

            // generate token and save
            const token = new Token({ user: user._id, token: uuid() });

            token.save()
                .then(token => {
                    // Send email
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
                        subject: strings.ACCOUNT_ACTIVATION_SUBJECT,
                        html: '<p>' + strings.HELLO + user.fullName + ',<br><br>'
                            + strings.ACCOUNT_ACTIVATION_LINK
                            + '<br><br>http' + (HTTPS ? 's' : '') + ':\/\/' + req.headers.host + '\/api/confirm-email\/' + user.email + '\/' + token.token + '<br><br>'
                            + strings.REGARDS + '<br>'
                            + '</p>'
                    };
                    transporter.sendMail(mailOptions, (err, info) => {
                        if (err) {
                            console.error(strings.SMTP_ERROR, err);
                            return res.status(400).send(strings.SMTP_ERROR + err);;
                        } else {
                            return res.sendStatus(200);
                        }
                    });
                })
                .catch(err => {
                    console.error(strings.DB_ERROR, err);
                    res.status(400).send(getStatusMessage(user.language, strings.DB_ERROR + err));
                });
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
};

export const adminSignup = (req, res) => {
    const { body } = req;
    body.active = true;
    body.verified = false;
    body.blacklisted = false;
    body.type = Env.USER_TYPE.ADMIN;

    const salt = bcrypt.genSaltSync(10);
    const password = body.password;
    const passwordHash = bcrypt.hashSync(password, salt);
    body.password = passwordHash;

    const user = new User(body);
    user.save()
        .then(user => {
            // avatar
            if (body.avatar) {
                const avatar = path.join(CDN_TEMP, body.avatar);
                if (fs.existsSync(avatar)) {
                    const filename = `${user._id}_${Date.now()}${path.extname(body.avatar)}`;
                    const newPath = path.join(CDN, filename);

                    try {
                        fs.renameSync(avatar, newPath);
                        user.avatar = filename;
                        user.save()
                            .catch(err => {
                                console.error(strings.DB_ERROR, err);
                                res.status(400).send(strings.DB_ERROR + err);
                            });
                    } catch (err) {
                        console.error(strings.ERROR, err);
                        res.status(400).send(strings.ERROR + err);
                    }
                }
            }

            // generate token and save
            const token = new Token({ user: user._id, token: uuid() });

            token.save()
                .then(token => {
                    // Send email
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
                        subject: strings.ACCOUNT_ACTIVATION_SUBJECT,
                        html: '<p>' + strings.HELLO + user.fullName + ',<br><br>'
                            + strings.ACCOUNT_ACTIVATION_LINK
                            + '<br><br>http' + (HTTPS ? 's' : '') + ':\/\/' + req.headers.host + '\/api/confirm-email\/' + user.email + '\/' + token.token + '<br><br>'
                            + strings.REGARDS + '<br>'
                            + '</p>'
                    };
                    transporter.sendMail(mailOptions, (err, info) => {
                        if (err) {
                            console.error(strings.SMTP_ERROR, err);
                            return res.status(400).send(strings.SMTP_ERROR + err);;
                        } else {
                            return res.sendStatus(200);
                        }
                    });
                })
                .catch(err => {
                    console.error(strings.DB_ERROR, err);
                    res.status(400).send(getStatusMessage(user.language, strings.DB_ERROR + err));
                });
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
};

export const create = (req, res) => {
    const { body } = req;
    body.verified = false;
    body.blacklisted = false;

    if (body.password) {
        const salt = bcrypt.genSaltSync(10);
        const password = body.password;
        const passwordHash = bcrypt.hashSync(password, salt);
        body.password = passwordHash;
    }

    const user = new User(body);
    user.save()
        .then(user => {
            // avatar
            if (body.avatar) {
                const avatar = path.join(CDN_TEMP, body.avatar);
                if (fs.existsSync(avatar)) {
                    const filename = `${user._id}_${Date.now()}${path.extname(body.avatar)}`;
                    const newPath = path.join(CDN, filename);

                    try {
                        fs.renameSync(avatar, newPath);
                        user.avatar = filename;
                        user.save()
                            .catch(err => {
                                console.error(strings.DB_ERROR, err);
                                res.status(400).send(strings.DB_ERROR + err);
                            });
                    } catch (err) {
                        console.error(strings.ERROR, err);
                        res.status(400).send(strings.ERROR + err);
                    }
                }
            }

            if (body.password) {
                return res.sendStatus(200);
            }

            // generate token and save
            const token = new Token({ user: user._id, token: uuid() });

            token.save()
                .then(token => {
                    // Send email
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
                        subject: strings.ACCOUNT_ACTIVATION_SUBJECT,
                        html: '<p>' + strings.HELLO + user.fullName + ',<br><br>'
                            + strings.ACCOUNT_ACTIVATION_LINK + '<br><br>'

                            + Helper.joinURL(user.type === Env.USER_TYPE.USER ? FRONTEND_HOST : BACKEND_HOST, 'activate')
                            + '/?u=' + encodeURIComponent(user._id)
                            + '&e=' + encodeURIComponent(user.email)
                            + '&t=' + encodeURIComponent(token.token)
                            + '<br><br>'

                            + strings.REGARDS + '<br>'
                            + '</p>'
                    };
                    transporter.sendMail(mailOptions, (err, info) => {
                        if (err) {
                            console.error(strings.SMTP_ERROR, err);
                            return res.status(400).send(strings.SMTP_ERROR + err);;
                        } else {
                            return res.sendStatus(200);
                        }
                    });
                })
                .catch(err => {
                    console.error(strings.DB_ERROR, err);
                    return res.status(400).send(strings.DB_ERROR + err);
                });
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err);
            return res.status(400).send(strings.DB_ERROR + err);
        });
};

export const checkToken = (req, res) => {
    User.findOne({ _id: mongoose.Types.ObjectId(req.params.userId), email: req.params.email })
        .then(user => {
            if (user) {
                if (![Env.APP_TYPE.FRONTEND, Env.APP_TYPE.BACKEND].includes(req.params.type)
                    || (req.params.type === Env.APP_TYPE.BACKEND && user.type === Env.USER_TYPE.USER)
                    || (req.params.type === Env.APP_TYPE.FRONTEND && user.type !== Env.USER_TYPE.USER)
                    || user.active
                ) {
                    return res.sendStatus(403);
                } else {
                    Token.findOne({ user: mongoose.Types.ObjectId(req.params.userId), token: req.params.token })
                        .then(token => {
                            if (token) {
                                return res.sendStatus(200);
                            } else {
                                return res.sendStatus(204);
                            }
                        })
                        .catch(err => {
                            console.error(strings.DB_ERROR, err);
                            return res.status(400).send(strings.DB_ERROR + err);
                        });
                }
            } else {
                return res.sendStatus(403);
            }
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err);
            return res.status(400).send(strings.DB_ERROR + err);
        });
};

export const deleteTokens = (req, res) => {
    Token.deleteMany({ user: mongoose.Types.ObjectId(req.params.userId) })
        .then((result) => {
            if (result.deletedCount > 0) {
                return res.sendStatus(200);
            } else {
                return res.sendStatus(400);
            }
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err);
            return res.status(400).send(strings.DB_ERROR + err);
        });
};

export const resend = (req, res) => {
    User.findOne({ email: req.params.email })
        .then(user => {
            if (user) {
                if (![Env.APP_TYPE.FRONTEND, Env.APP_TYPE.BACKEND].includes(req.params.type)
                    || (req.params.type === Env.APP_TYPE.BACKEND && user.type === Env.USER_TYPE.USER)
                    || (req.params.type === Env.APP_TYPE.FRONTEND && user.type !== Env.USER_TYPE.USER)
                ) {
                    return res.sendStatus(403);
                } else {
                    user.active = false;

                    user.save()
                        .then(() => {
                            // generate token and save
                            const token = new Token({ user: user._id, token: uuid() });

                            token.save()
                                .then(token => {
                                    // Send email
                                    strings.setLanguage(user.language);

                                    const reset = req.params.reset === 'true';

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
                                        subject: (reset ? strings.PASSWORD_RESET_SUBJECT : strings.ACCOUNT_ACTIVATION_SUBJECT),
                                        html: '<p>' + strings.HELLO + user.fullName + ',<br><br>'
                                            + (reset ? strings.PASSWORD_RESET_LINK : strings.ACCOUNT_ACTIVATION_LINK) + '<br><br>'

                                            + Helper.joinURL(user.type === Env.USER_TYPE.USER ? FRONTEND_HOST : BACKEND_HOST, (reset ? 'reset-password' : 'activate'))
                                            + '/?u=' + encodeURIComponent(user._id)
                                            + '&e=' + encodeURIComponent(user.email)
                                            + '&t=' + encodeURIComponent(token.token)
                                            + '<br><br>'

                                            + strings.REGARDS + '<br>'
                                            + '</p>'
                                    };
                                    transporter.sendMail(mailOptions, (err, info) => {
                                        if (err) {
                                            console.error(strings.SMTP_ERROR, err);
                                            return res.status(400).send(strings.SMTP_ERROR + err);;
                                        } else {
                                            return res.sendStatus(200);
                                        }
                                    });
                                })
                                .catch(err => {
                                    console.error(strings.DB_ERROR, err);
                                    return res.status(400).send(strings.DB_ERROR + err);
                                });
                        })
                        .catch(err => {
                            console.error(strings.DB_ERROR, err);
                            return res.status(400).send(strings.DB_ERROR + err);
                        });
                }
            } else {
                return res.sendStatus(204);
            }
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err);
            return res.status(400).send(strings.DB_ERROR + err);
        });
};

export const activate = (req, res) => {
    User.findById(req.body.userId)
        .then(user => {
            if (user) {
                Token.find({ token: req.body.token })
                    .then(token => {
                        if (token) {
                            const salt = bcrypt.genSaltSync(10);
                            const password = req.body.password;
                            const passwordHash = bcrypt.hashSync(password, salt);
                            user.password = passwordHash;

                            user.active = true;
                            user.verified = true;
                            user.save()
                                .then(() => {
                                    return res.sendStatus(200);
                                })
                                .catch(err => {
                                    console.error(strings.DB_ERROR, err);
                                    return res.status(400).send(strings.DB_ERROR + err);
                                });
                        } else {
                            return res.sendStatus(204);
                        }
                    })
                    .catch(err => {
                        console.error(strings.DB_ERROR, err);
                        return res.status(400).send(strings.DB_ERROR + err);
                    });
            }
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err);
            return res.status(400).send(strings.DB_ERROR + err);
        });
};

export const signin = (req, res) => {
    User.findOne({ email: req.body.email })
        .then(user => {
            if (!req.body.password
                || !user
                || !user.password
                || (![Env.APP_TYPE.FRONTEND, Env.APP_TYPE.BACKEND].includes(req.params.type))
                || (req.params.type === Env.APP_TYPE.BACKEND && user.type === Env.USER_TYPE.USER)
                || (req.params.type === Env.APP_TYPE.FRONTEND && user.type !== Env.USER_TYPE.USER)
            ) {
                res.sendStatus(204);
            } else {
                bcrypt.compare(req.body.password, user.password)
                    .then(async passwordMatch => {
                        if (passwordMatch) {
                            const payload = { id: user._id };

                            let options = { expiresIn: JWT_EXPIRE_AT };
                            if (req.body.stayConnected) options = {};

                            const token = jwt.sign(payload, JWT_SECRET, options);

                            res.status(200).send({
                                id: user._id,
                                email: user.email,
                                fullName: user.fullName,
                                language: user.language,
                                enableEmailNotifications: user.enableEmailNotifications,
                                accessToken: token,
                                blacklisted: user.blacklisted,
                                avatar: user.avatar
                            });
                        } else {
                            res.sendStatus(204);
                        }
                    })
                    .catch(err => {
                        console.error(strings.ERROR, err);
                        return res.status(400).send(strings.ERROR + err);
                    });
            }
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err);
            return res.status(400).send(strings.DB_ERROR + err);
        });
};

export const pushToken = async (req, res) => {
    try {
        const pushNotification = await PushNotification.findOne({ user: req.params.userId });
        if (pushNotification) {
            return res.status(200).json(pushNotification.token);
        }

        return res.sendStatus(204);
    } catch (err) {
        console.error(strings.ERROR, err);
        return res.status(400).send(strings.ERROR + err);
    }
};

export const createPushToken = async (req, res) => {
    try {
        const exist = await PushNotification.exists({ user: req.params.userId });

        if (!exist) {
            const pushNotification = new PushNotification({ user: req.params.userId, token: req.params.token });
            await pushNotification.save();
            return res.sendStatus(200);
        }

        return res.status(400).send('Push Token already exists.');
    } catch (err) {
        console.error(strings.ERROR, err);
        return res.status(400).send(strings.ERROR + err);
    }
};

export const deletePushToken = async (req, res) => {
    try {
        await PushNotification.deleteMany({ user: req.params.userId });
        return res.sendStatus(200);
    } catch (err) {
        console.error(strings.ERROR, err);
        return res.status(400).send(strings.ERROR + err);
    }
};

export const validateEmail = async (req, res) => {
    try {
        const exists = await User.exists({ email: req.body.email });

        if (exists) {
            return res.sendStatus(204);
        } else { // email does not exist in db (can be added)
            return res.sendStatus(200);
        }
    } catch (err) {
        console.error('[user.validateEmail] ' + strings.DB_ERROR + ' ' + req.body.email, err);
        return res.status(400).send(strings.DB_ERROR + err);
    }
};

export const validateAccessToken = (req, res) => {
    res.sendStatus(200);
};

export const confirmEmail = (req, res) => {
    Token.findOne({ token: req.params.token }, (err, token) => {
        User.findOne({ email: req.params.email }, (err, user) => {
            strings.setLanguage(user.language);
            // token is not found into database i.e. token may have expired 
            if (!token) {
                console.error(strings.ACCOUNT_ACTIVATION_LINK_EXPIRED, req.params);
                return res.status(400).send(getStatusMessage(user.language, strings.ACCOUNT_ACTIVATION_LINK_EXPIRED));
            }
            // if token is found then check valid user 
            else {
                // not valid user
                if (!user) {
                    console.error('[user.confirmEmail] User not found', req.params);
                    return res.status(401).send(getStatusMessage(user.language, strings.ACCOUNT_ACTIVATION_LINK_ERROR));
                }
                // user is already verified
                else if (user.verified) {
                    return res.status(200).send(getStatusMessage(user.language, strings.ACCOUNT_ACTIVATION_ACCOUNT_VERIFIED));
                }
                // verify user
                else {
                    // change verified to true
                    user.verified = true;
                    user.verifiedAt = Date.now();
                    user.save((err) => {
                        // error occur
                        if (err) {
                            console.error('[user.confirmEmail] ' + strings.DB_ERROR + ' ' + req.params, err);
                            return res.status(500).send(getStatusMessage(user.language, err.message));
                        }
                        // account successfully verified
                        else {
                            return res.status(200).send(getStatusMessage(user.language, strings.ACCOUNT_ACTIVATION_SUCCESS));
                        }
                    });

                }
            }
        });
    });
};

export const resendLink = (req, res, next) => {
    User.findOne({ email: req.body.email }, (err, user) => {

        // user is not found into database
        if (!user) {
            console.error('[user.resendLink] User not found:', req.params);
            return res.status(400).send(getStatusMessage(DEFAULT_LANGUAGE, strings.ACCOUNT_ACTIVATION_RESEND_ERROR));
        }
        // user has been already verified
        else if (user.verified) {
            return res.status(200).send(getStatusMessage(user.language, strings.ACCOUNT_ACTIVATION_ACCOUNT_VERIFIED));
        }
        // send verification link
        else {
            // generate token and save
            const token = new Token({ user: user._id, token: uuid() });

            token.save((err) => {
                if (err) {
                    console.error('[user.resendLink] ' + strings.DB_ERROR, req.params);
                    return res.status(500).send(getStatusMessage(user.language, err.message));
                }

                // Send email
                const transporter = nodemailer.createTransport({
                    host: SMTP_HOST,
                    port: SMTP_PORT,
                    auth: {
                        user: SMTP_USER,
                        pass: SMTP_PASS
                    }
                });

                strings.setLanguage(user.language);
                const mailOptions = { from: SMTP_FROM, to: user.email, subject: strings.ACCOUNT_ACTIVATION_SUBJECT, html: '<p ' + (user.language === 'ar' ? 'dir="rtl"' : ')') + '>' + strings.HELLO + user.fullName + ',<br> <br>' + strings.ACCOUNT_ACTIVATION_LINK + '<br><br>http' + (HTTPS ? 's' : '') + ':\/\/' + req.headers.host + '\/api/confirm-email\/' + user.email + '\/' + token.token + '<br><br>' + strings.REGARDS + '<br>' + '</p>' };
                transporter.sendMail(mailOptions, (err, info) => {
                    if (err) {
                        console.error('[user.resendLink] ' + strings.SMTP_ERROR, req.params);
                        return res.status(500).send(getStatusMessage(user.language, strings.ACCOUNT_ACTIVATION_TECHNICAL_ISSUE + ' ' + err.response));
                    }
                    return res.status(200).send(getStatusMessage(user.language, strings.ACCOUNT_ACTIVATION_EMAIL_SENT_PART_1 + user.email + strings.ACCOUNT_ACTIVATION_EMAIL_SENT_PART_2));
                });
            });
        }
    });
};

export const update = (req, res) => {
    User.findById(req.body._id)
        .then(user => {
            if (!user) {
                console.error('[user.update] User not found:', req.body.email);
                res.sendStatus(204);
            } else {
                const { fullName, phone, bio, location, type, birthDate, enableEmailNotifications, payLater } = req.body;
                if (fullName) user.fullName = fullName;
                user.phone = phone;
                user.location = location;
                user.bio = bio;
                user.birthDate = birthDate;
                if (type) user.type = type;
                if (typeof enableEmailNotifications !== 'undefined') user.enableEmailNotifications = enableEmailNotifications;
                if (typeof payLater !== 'undefined') user.payLater = payLater;

                user.save()
                    .then(() => {
                        res.sendStatus(200);
                    })
                    .catch(err => {
                        console.error(strings.DB_ERROR, err);
                        res.status(400).send(strings.DB_ERROR + err);
                    });

            }
        }).catch(err => {
            console.error(strings.DB_ERROR, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
};

export const updateEmailNotifications = (req, res) => {
    User.findById(req.body._id)
        .then(user => {
            if (!user) {
                console.error('[user.updateEmailNotifications] User not found:', req.body.email);
                res.sendStatus(204);
            } else {
                user.enableEmailNotifications = req.body.enableEmailNotifications;
                user.save()
                    .then(user => {
                        res.sendStatus(200);
                    })
                    .catch(err => {
                        console.error(strings.DB_ERROR, err);
                        res.status(400).send(strings.DB_ERROR + err);
                    });

            }
        }).catch(err => {
            console.error(strings.DB_ERROR, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
};

export const updateLanguage = (req, res) => {
    User.findById(req.body.id)
        .then(user => {
            if (!user) {
                console.error('[user.updateLanguage] User not found:', req.body.id);
                res.sendStatus(204);
            } else {
                user.language = req.body.language;
                user.save()
                    .then(() => {
                        res.sendStatus(200);
                    })
                    .catch(err => {
                        console.error(strings.DB_ERROR, err);
                        res.status(400).send(strings.DB_ERROR + err);
                    });

            }
        }).catch(err => {
            console.error(strings.DB_ERROR, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
};

export const getUser = (req, res) => {
    User.findById(req.params.id, {
        company: 1,
        email: 1,
        phone: 1,
        fullName: 1,
        verified: 1,
        language: 1,
        enableEmailNotifications: 1,
        avatar: 1,
        bio: 1,
        location: 1,
        type: 1,
        blacklisted: 1,
        birthDate: 1,
        payLater: 1
    })
        .lean()
        .then(user => {
            if (!user) {
                console.error('[user.getUser] User not found:', req.params);
                res.sendStatus(204);
            } else {
                res.json(user);
            }
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
};

export const createAvatar = (req, res) => {
    try {
        if (!fs.existsSync(CDN_TEMP)) {
            fs.mkdirSync(CDN_TEMP, { recursive: true });
        }

        const filename = `${uuid()}_${Date.now()}${path.extname(req.file.originalname)}`;
        const filepath = path.join(CDN_TEMP, filename);

        fs.writeFileSync(filepath, req.file.buffer);
        res.json(filename);
    } catch (err) {
        console.error(strings.ERROR, err);
        res.status(400).send(strings.ERROR + err);
    }
};

export const updateAvatar = (req, res) => {
    const userId = req.params.userId;

    User.findById(userId)
        .then(user => {
            if (user) {
                if (!fs.existsSync(CDN)) {
                    fs.mkdirSync(CDN, { recursive: true });
                }

                if (user.avatar && !user.avatar.startsWith('http')) {
                    const avatar = path.join(CDN, user.avatar);
                    if (fs.existsSync(avatar)) {
                        fs.unlinkSync(avatar);
                    }
                }

                const filename = `${user._id}_${Date.now()}${path.extname(req.file.originalname)}`;
                const filepath = path.join(CDN, filename);

                fs.writeFileSync(filepath, req.file.buffer);
                user.avatar = filename;
                user.save()
                    .then(usr => {
                        res.sendStatus(200);
                    })
                    .catch(err => {
                        console.error(strings.DB_ERROR, err);
                        res.status(400).send(strings.DB_ERROR + err);
                    });
            } else {
                console.error('[user.updateAvatar] User not found:', req.params.userId);
                res.sendStatus(204);
            }
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
};

export const deleteAvatar = (req, res) => {
    const userId = req.params.userId;

    User.findById(userId)
        .then(user => {
            if (user) {
                if (user.avatar && !user.avatar.startsWith('http')) {
                    const avatar = path.join(CDN, user.avatar);
                    if (fs.existsSync(avatar)) {
                        fs.unlinkSync(avatar);
                    }
                }
                user.avatar = null;

                user.save()
                    .then(usr => {
                        res.sendStatus(200);
                    })
                    .catch(err => {
                        console.error(strings.DB_ERROR, err);
                        res.status(400).send(strings.DB_ERROR + err);
                    });
            } else {
                console.error('[user.deleteAvatar] User not found:', req.params.userId);
                res.sendStatus(204);
            }
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
};

export const deleteTempAvatar = (req, res) => {
    try {
        const avatar = path.join(CDN_TEMP, req.params.avatar);
        if (fs.existsSync(avatar)) {
            fs.unlinkSync(avatar);
        }
        res.sendStatus(200);
    } catch (err) {
        console.error(strings.ERROR, err);
        res.status(400).send(strings.ERROR + err);
    }
};

export const changePassword = (req, res) => {
    User.findOne({ _id: req.body._id })
        .then(user => {

            if (!user) {
                console.error('[user.changePassword] User not found:', req.body._id);
                return res.sendStatus(204);
            }

            const changePassword = () => {
                const salt = bcrypt.genSaltSync(10);
                const password = req.body.newPassword;
                const passwordHash = bcrypt.hashSync(password, salt);
                user.password = passwordHash;

                user.save()
                    .then(() => {
                        return res.sendStatus(200);
                    })
                    .catch(err => {
                        console.error(strings.DB_ERROR, err);
                        return res.status(400).send(strings.DB_ERROR + err);
                    });
            };

            if (req.body.strict) {
                bcrypt.compare(req.body.password, user.password)
                    .then(async passwordMatch => {
                        if (passwordMatch) {
                            changePassword();
                        }
                        else {
                            return res.sendStatus(204);
                        }
                    });
            }
            else {
                changePassword();
            }
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
};

export const checkPassword = (req, res) => {
    User.findById(req.params.id)
        .then(user => {
            if (user) {
                bcrypt.compare(req.params.password, user.password).then(passwordMatch => {
                    if (passwordMatch) {
                        return res.sendStatus(200);
                    }
                    else {
                        return res.sendStatus(204);
                    }
                });
            } else {
                console.error('[user.checkPassword] User not found:', req.params.id);
                return res.sendStatus(204);
            }
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err);
            return res.status(400).send(strings.DB_ERROR + err);
        });;
};

export const getUsers = async (req, res) => {

    try {
        const keyword = escapeStringRegexp(req.query.s || '');
        const options = 'i';
        const page = parseInt(req.params.page);
        const size = parseInt(req.params.size);
        const types = req.body.types;
        const userId = req.body.user;

        const $match = {
            $and: [
                {
                    type: { $in: types }
                },
                {
                    fullName: { $regex: keyword, $options: options }
                }
            ]
        };

        if (userId) {
            $match.$and.push({ _id: { $ne: mongoose.Types.ObjectId(userId) } });
        }

        const users = await User.aggregate([
            {
                $match
            },
            {
                $project: {
                    company: 1,
                    email: 1,
                    phone: 1,
                    fullName: 1,
                    verified: 1,
                    language: 1,
                    enableEmailNotifications: 1,
                    avatar: 1,
                    bio: 1,
                    location: 1,
                    type: 1,
                    blacklisted: 1,
                    birthDate: 1
                }
            },
            {
                $facet: {
                    resultData: [
                        { $sort: { fullName: 1 } },
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
        ], { collation: { locale: Env.DEFAULT_LANGUAGE, strength: 2 } });

        res.json(users);
    } catch (err) {
        console.error(strings.DB_ERROR, err);
        res.status(400).send(strings.DB_ERROR + err);
    }
};

export const deleteUsers = async (req, res) => {
    try {
        const ids = req.body.map(id => mongoose.Types.ObjectId(id));

        for (const id of ids) {
            const user = await User.findByIdAndDelete(id);
            if (user.avatar) {
                const avatar = path.join(CDN, user.avatar);
                if (fs.existsSync(avatar)) {
                    fs.unlinkSync(avatar);
                }
            }
            await Booking.deleteMany({ driver: id });
        }

        return res.sendStatus(200);
    } catch (err) {
        console.error(`[user.delete]  ${strings.DB_ERROR} ${req.body}`, err);
        return res.status(400).send(strings.DB_ERROR + err);
    }
};