import express from 'express';
import routeNames from '../config/userRoutes.config.js';
import strings from '../config/app.config.js';
import validator from 'validator';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import nodemailer from 'nodemailer';
import User from '../schema/User.js';
import Token from '../schema/Token.js';
import authJwt from '../middlewares/authJwt.js';

const HTTPS = process.env.BC_HTTPS.toLowerCase() === 'true';
const JWT_SECRET = process.env.BC_JWT_SECRET;
const JWT_EXPIRE_AT = parseInt(process.env.BC_JWT_EXPIRE_AT);
const SMTP_HOST = process.env.BC_SMTP_HOST;
const SMTP_PORT = process.env.BC_SMTP_PORT;
const SMTP_USER = process.env.BC_SMTP_USER;
const SMTP_PASS = process.env.BC_SMTP_PASS;
const SMTP_FROM = process.env.BC_SMTP_FROM;
const CDN = process.env.BC_CDN;

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
            // generate token and save
            const token = new Token({ user: user._id, token: crypto.randomBytes(16).toString('hex') });
            // const token = new Token({ user: user._id, token: nanoid() });

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
                || (req.params.type !== 'frontend' && req.params.type !== 'backend')
                || (req.params.type === 'frontend' && user && user.type !== 'user')
                || (req.params.type === 'backend' && user && user.type === 'user')) {
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
        });
});

// Get User by Id Router
routes.route(routeNames.getUser)
    .get(authJwt.verifyToken, (req, res) => {
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

// Update Avatar Router    
routes.route(routeNames.updateAvatar)
    .post([authJwt.verifyToken, multer({ storage: multer.memoryStorage() }).single('image')], (req, res) => {
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
routes.route(routeNames.deleteAvatar)
    .post(authJwt.verifyToken, (req, res) => {
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

export default routes;