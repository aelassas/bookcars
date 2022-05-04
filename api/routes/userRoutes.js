import express from 'express';
import validator from 'validator';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import nodemailer from 'nodemailer';
import { v1 as uuid } from 'uuid';
import routeNames from '../config/userRoutes.config.js';
import strings from '../config/app.config.js';
import Env from '../config/env.config.js';
import User from '../schema/User.js';
import Token from '../schema/Token.js';
import authJwt from '../middlewares/authJwt.js';

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
const CDN_TEMP = process.env.BC_CDN_TEMP;

const routes = express.Router();

const getStatusMessage = (lang, msg) => {
    if (lang === 'ar') {
        return '<!DOCTYPE html><html dir="rtl" lang="ar"><head></head><body><p>' + msg + '</p></body></html>';
    }
    return '<!DOCTYPE html><html lang="' + lang + '"><head></head><body><p>' + msg + '</p></body></html>';
};

// Sign up route
routes.route(routeNames.signup).post((req, res) => {
    const { body } = req;
    body.isVerified = false;
    body.isBlacklisted = false;

    const user = new User(body);
    user.save()
        .then(user => {
            // avatar
            if (body.avatar) {
                const avatar = path.join(CDN_TEMP, body.avatar);
                if (fs.existsSync(avatar)) {
                    const filename = `${user._id}_${Date.now()}${path.extname(body.avatar)}`;
                    const newPath = path.join(CDN, filename);
                    fs.rename(avatar, newPath, (err) => {
                        if (err) {
                            console.error(strings.ERROR, err);
                            res.status(400).send(getStatusMessage(user.language, strings.ERROR + err));
                        } else {
                            user.avatar = filename;
                            user.save()
                                .catch(err => {
                                    console.error(strings.DB_ERROR, err);
                                    res.status(400).send(getStatusMessage(user.language, strings.DB_ERROR + err));
                                });
                        }
                    });
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
                        subject: strings.ACCOUNT_VALIDATION_SUBJECT,
                        html: '<p ' + (user.language === 'ar' ? 'dir="rtl"' : ')') + '>' + strings.HELLO + user.fullName + ',<br> <br>'
                            + strings.ACCOUNT_VALIDATION_LINK + '<br><br>http' + (HTTPS ? 's' : '') + ':\/\/' + req.headers.host + '\/api/confirm-email\/' + user.email + '\/' + token.token + '<br><br>' + strings.REGARDS + '<br>'
                            + '</p>'
                    };
                    transporter.sendMail(mailOptions, (err, info) => {
                        if (err) {
                            console.error(strings.SMTP_ERROR, err);

                            User.deleteOne({ _id: user._id }, (error, response) => {
                                if (error) {
                                    console.error(strings.DB_ERROR, error);
                                    res.status(400).send(getStatusMessage(user.language, strings.DB_ERROR + error));
                                } else {
                                    res.status(500).send(getStatusMessage(user.language, strings.ACCOUNT_VALIDATION_TECHNICAL_ISSUE + ' ' + err.response));
                                }
                            });
                        } else {
                            res.status(200).send(getStatusMessage(user.language, strings.ACCOUNT_VALIDATION_EMAIL_SENT_PART_1 + user.email + strings.ACCOUNT_VALIDATION_EMAIL_SENT_PART_2));
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
});

// Sign in Router
routes.route(routeNames.signin).post((req, res) => {
    User.findOne({ email: req.body.email })
        .then(user => {
            if (!user
                || (![Env.APP_TYPE.FRONTEND, Env.APP_TYPE.BACKEND].includes(req.params.type))
                || (req.params.type === Env.APP_TYPE.FRONTEND && user && user.type === Env.USER_TYPE.COMPANY)
                || (req.params.type === Env.APP_TYPE.BACKEND && user && user.type === Env.USER_TYPE.USER)) {
                res.sendStatus(204);
            } else {
                bcrypt.compare(req.body.password, user.password).then(passwordMatch => {
                    if (passwordMatch) {
                        const payload = { id: user.id };

                        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRE_AT });

                        res.status(200).send({
                            id: user._id,
                            email: user.email,
                            fullName: user.fullName,
                            language: user.language,
                            enableEmailNotifications: user.enableEmailNotifications,
                            accessToken: token,
                            isBlacklisted: user.isBlacklisted
                        });
                    } else {
                        res.sendStatus(204);
                    }
                })
            }
        });
});

// Email validation Router
routes.route(routeNames.validateEmail).post((req, res) => {
    User.findOne({ email: req.body.email })
        .then(user => user || !validator.isEmail(req.body.email) ? res.sendStatus(204) : res.sendStatus(200))
        .catch(err => {
            console.error('[user.validateEmail] ' + strings.DB_ERROR + ' ' + req.body.email, err);
            res.status(400).send(strings.DB_ERROR + err);
        })
});

// Validate JWT token Router
routes.route(routeNames.validateAccessToken).post(authJwt.verifyToken, (req, res) => {
    res.sendStatus(200);
});

// Confirm Email Router
routes.route(routeNames.confirmEmail).get((req, res) => {
    Token.findOne({ token: req.params.token }, (err, token) => {
        User.findOne({ email: req.params.email }, (err, user) => {
            strings.setLanguage(user.language);
            // token is not found into database i.e. token may have expired 
            if (!token) {
                console.error(strings.ACCOUNT_VALIDATION_LINK_EXPIRED, req.params);
                return res.status(400).send(getStatusMessage(user.language, strings.ACCOUNT_VALIDATION_LINK_EXPIRED));
            }
            // if token is found then check valid user 
            else {
                // not valid user
                if (!user) {
                    console.error('[user.confirmEmail] User not found', req.params);
                    return res.status(401).send(getStatusMessage(user.language, strings.ACCOUNT_VALIDATION_LINK_ERROR));
                }
                // user is already verified
                else if (user.isVerified) {
                    return res.status(200).send(getStatusMessage(user.language, strings.ACCOUNT_VALIDATION_ACCOUNT_VERIFIED));
                }
                // verify user
                else {
                    // change isVerified to true
                    user.isVerified = true;
                    user.verifiedAt = Date.now();
                    user.save((err) => {
                        // error occur
                        if (err) {
                            console.error('[user.confirmEmail] ' + strings.DB_ERROR + ' ' + req.params, err);
                            return res.status(500).send(getStatusMessage(user.language, err.message));
                        }
                        // account successfully verified
                        else {
                            return res.status(200).send(getStatusMessage(user.language, strings.ACCOUNT_VALIDATION_SUCCESS));
                        }
                    });

                }
            }
        });
    });
});

// Resend verification link Router
routes.route(routeNames.resendLink).post(authJwt.verifyToken, (req, res, next) => {
    User.findOne({ email: req.body.email }, (err, user) => {

        // user is not found into database
        if (!user) {
            console.error('[user.resendLink] User not found:', req.params);
            return res.status(400).send(getStatusMessage(DEFAULT_LANGUAGE, strings.ACCOUNT_VALIDATION_RESEND_ERROR));
        }
        // user has been already verified
        else if (user.isVerified) {
            return res.status(200).send(getStatusMessage(user.language, strings.ACCOUNT_VALIDATION_ACCOUNT_VERIFIED));
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
                const mailOptions = { from: SMTP_FROM, to: user.email, subject: strings.ACCOUNT_VALIDATION_SUBJECT, html: '<p ' + (user.language === 'ar' ? 'dir="rtl"' : ')') + '>' + strings.HELLO + user.fullName + ',<br> <br>' + strings.ACCOUNT_VALIDATION_LINK + '<br><br>http' + (HTTPS ? 's' : '') + ':\/\/' + req.headers.host + '\/api/confirm-email\/' + user.email + '\/' + token.token + '<br><br>' + strings.REGARDS + '<br>' + '</p>' };
                transporter.sendMail(mailOptions, (err, info) => {
                    if (err) {
                        console.error('[user.resendLink] ' + strings.SMTP_ERROR, req.params);
                        return res.status(500).send(getStatusMessage(user.language, strings.ACCOUNT_VALIDATION_TECHNICAL_ISSUE + ' ' + err.response));
                    }
                    return res.status(200).send(getStatusMessage(user.language, strings.ACCOUNT_VALIDATION_EMAIL_SENT_PART_1 + user.email + strings.ACCOUNT_VALIDATION_EMAIL_SENT_PART_2));
                });
            });
        }
    });
});

// Update User Router
routes.route(routeNames.update).post(authJwt.verifyToken, (req, res) => {
    User.findById(req.body._id)
        .then(user => {
            if (!user) {
                console.error('[user.update] User not found:', req.body.email);
                res.sendStatus(204);
            } else {
                const { fullName, phone, bio, location } = req.body;
                user.fullName = fullName;
                user.phone = phone;
                user.location = location;
                user.bio = bio;

                user.save()
                    .then(_ => {
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
});

// Update Email Notifications Router
routes.route(routeNames.updateEmailNotifications).post(authJwt.verifyToken, (req, res) => {
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
});

// Update Language Router
routes.route(routeNames.updateLanguage).post(authJwt.verifyToken, (req, res) => {
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
});

// Get User by Id Router
routes.route(routeNames.getUser).get(authJwt.verifyToken, (req, res) => {
    User.findById(req.params.id)
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
});

// Create Avatar Router    
routes.route(routeNames.createAvatar).post([authJwt.verifyToken, multer({ storage: multer.memoryStorage() }).single('image')], (req, res) => {
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
});

// Update Avatar Router    
routes.route(routeNames.updateAvatar).post([authJwt.verifyToken, multer({ storage: multer.memoryStorage() }).single('image')], (req, res) => {
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
});

// Delete Avatar Router
routes.route(routeNames.deleteAvatar).post(authJwt.verifyToken, (req, res) => {
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
                console.error('[user.updateAvatar] User not found:', req.params.userId);
                res.sendStatus(204);
            }
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
});

// Delete Temp Avatar Router
routes.route(routeNames.deleteTempAvatar).post(authJwt.verifyToken, (req, res) => {
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
});

// Reset password Router
routes.route(routeNames.resetPassword).post(authJwt.verifyToken, (req, res) => {
    User.findOne({ _id: req.body._id })
        .then(user => {
            if (req.body.strict && req.body.password !== user.password) {
                res.sendStatus(204);
                return;
            }

            if (!user) {
                console.error('[user.resetPassword] User not found:', req.body._id);
                res.sendStatus(204);
            } else {
                user.password = req.body.newPassword;
                user.save()
                    .then(_ => {
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
        });;
});

export default routes;