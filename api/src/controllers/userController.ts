import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import path from 'path'
import nodemailer from 'nodemailer'
import {v1 as uuid} from 'uuid'
import escapeStringRegexp from 'escape-string-regexp'
import strings from '../config/app.config'
import Env from '../config/env.config'
import User from '../models/User'
import Booking from '../models/Booking'
import Token from '../models/Token'
import PushNotification from '../models/PushNotification'
import mongoose, {PipelineStage} from 'mongoose'
import * as Helper from '../common/Helper'
import {getUserLang} from '../common/Helper'
import {Request, Response} from 'express';
import {Lang} from "../interfaces/Lang";
import {put} from "../storage/s3";
import assert from "node:assert";

const DEFAULT_LANGUAGE = getUserLang({language: process.env.BC_DEFAULT_LANGUAGE})
const HTTPS = process.env.BC_HTTPS.toLowerCase() === 'true'
const JWT_SECRET = process.env.BC_JWT_SECRET
const JWT_EXPIRE_AT = parseInt(process.env.BC_JWT_EXPIRE_AT)
const SMTP_HOST = process.env.BC_SMTP_HOST
const SMTP_PORT = process.env.BC_SMTP_PORT
const SMTP_USER = process.env.BC_SMTP_USER
const SMTP_PASS = process.env.BC_SMTP_PASS
const SMTP_FROM = process.env.BC_SMTP_FROM
const BACKEND_HOST = process.env.BC_BACKEND_HOST
const FRONTEND_HOST = process.env.BC_FRONTEND_HOST


const getStatusMessage = (lang: Lang, msg: string): string => {
    if (lang === 'ar') {
        return '<!DOCTYPE html><html dir="rtl" lang="ar"><head></head><body><p>' + msg + '</p></body></html>'
    }
    return '<!DOCTYPE html><html lang="' + lang + '"><head></head><body><p>' + msg + '</p></body></html>'
}

export const signup = async (req: Request, res: Response) => {
    try {
        const {body} = req
        body.active = true
        body.verified = false
        body.blacklisted = false
        body.type = Env.USER_TYPE.USER

        const salt = bcrypt.genSaltSync(10)
        const password = body.password
        body.password = bcrypt.hashSync(password, salt)

        const userModel = new User(body)
        const user = await userModel.save()
        // avatar
        if (body.avatar) {
            user.avatar = body.avatar
            await user.save()
        }

        // generate token and save
        const tokenModel = new Token({user: user._id, token: uuid()})

        const token = await tokenModel.save();
        // Send email
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
            subject: strings.ACCOUNT_ACTIVATION_SUBJECT,
            html: '<p>' + strings.HELLO + user.fullName + ',<br><br>'
                + strings.ACCOUNT_ACTIVATION_LINK
                + '<br><br>http' + (HTTPS ? 's' : '') + ':\/\/' + req.headers.host + '\/api/confirm-email\/' + user.email + '\/' + token.token + '<br><br>'
                + strings.REGARDS + '<br>'
                + '</p>'
        }
        transporter.sendMail(mailOptions, (err) => {
            if (err) {
                console.error(strings.SMTP_ERROR, err)
                return res.status(400).send(strings.SMTP_ERROR + err)
            } else {
                return res.sendStatus(200)
            }
        })


    } catch (err) {
        console.error(strings.DB_ERROR, err)
        res.status(400).send(strings.DB_ERROR + err)
    }
}

export const adminSignup = async (req: Request, res: Response) => {
    try {
        const {body} = req
        body.active = true
        body.verified = false
        body.blacklisted = false
        body.type = Env.USER_TYPE.ADMIN

        const salt = bcrypt.genSaltSync(10)
        const password = body.password
        body.password = bcrypt.hashSync(password, salt)

        const userModel = new User(body)
        const user = await userModel.save()
        // avatar
        if (body.avatar) {

            user.avatar = body.avatar
            await user.save()

        }

        // generate token and save
        const tokenModel = new Token({user: user._id, token: uuid()})

        const token = await tokenModel.save()
        // Send email
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
            subject: strings.ACCOUNT_ACTIVATION_SUBJECT,
            html: '<p>' + strings.HELLO + user.fullName + ',<br><br>'
                + strings.ACCOUNT_ACTIVATION_LINK
                + '<br><br>http' + (HTTPS ? 's' : '') + ':\/\/' + req.headers.host + '\/api/confirm-email\/' + user.email + '\/' + token.token + '<br><br>'
                + strings.REGARDS + '<br>'
                + '</p>'
        }
        transporter.sendMail(mailOptions, (err) => {
            if (err) {
                console.error(strings.SMTP_ERROR, err)
                return res.status(400).send(strings.SMTP_ERROR + err)
            } else {
                return res.sendStatus(200)
            }
        })
    } catch (err) {
        console.error(strings.DB_ERROR, err)
        res.status(400).send(strings.DB_ERROR + err)
    }
}

export const create = async (req: Request, res: Response) => {
    try {
        const {body} = req
        body.verified = false
        body.blacklisted = false

        if (body.password) {
            const salt = bcrypt.genSaltSync(10)
            const password = body.password
            body.password = bcrypt.hashSync(password, salt)
        }

        const userModel = new User(body)
        const user = await userModel.save()
        // avatar
        if (body.avatar) {
            user.avatar = body.avatar
            await user.save()
        }

        if (body.password) {
            return res.sendStatus(200)
        }

        // generate token and save
        const tokenModel = new Token({user: user._id, token: uuid()})

        const token = await tokenModel.save()
        // Send email
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
            subject: strings.ACCOUNT_ACTIVATION_SUBJECT,
            html: '<p>' + strings.HELLO + user.fullName + ',<br><br>'
                + strings.ACCOUNT_ACTIVATION_LINK + '<br><br>'

                + Helper.joinURL(user.type === Env.USER_TYPE.USER ? FRONTEND_HOST : BACKEND_HOST, 'activate')
                + '/?u=' + encodeURIComponent(String(user._id))
                + '&e=' + encodeURIComponent(user.email)
                + '&t=' + encodeURIComponent(token.token)
                + '<br><br>'

                + strings.REGARDS + '<br>'
                + '</p>'
        }
        transporter.sendMail(mailOptions, (err) => {
            if (err) {
                console.error(strings.SMTP_ERROR, err)
                return res.status(400).send(strings.SMTP_ERROR + err)
            } else {
                return res.sendStatus(200)
            }
        })


    } catch (err) {
        console.error(strings.DB_ERROR, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

export const checkToken = (req: Request, res: Response) => {
    User.findOne({_id: new mongoose.Types.ObjectId(req.params.userId), email: req.params.email})
        .then(user => {
            if (user) {
                if (![Env.APP_TYPE.FRONTEND, Env.APP_TYPE.BACKEND].includes(req.params.type)
                    || (req.params.type === Env.APP_TYPE.BACKEND && user.type === Env.USER_TYPE.USER)
                    || (req.params.type === Env.APP_TYPE.FRONTEND && user.type !== Env.USER_TYPE.USER)
                    || user.active
                ) {
                    return res.sendStatus(403)
                } else {
                    Token.findOne({user: new mongoose.Types.ObjectId(req.params.userId), token: req.params.token})
                        .then(token => {
                            if (token) {
                                return res.sendStatus(200)
                            } else {
                                return res.sendStatus(204)
                            }
                        })
                        .catch(err => {
                            console.error(strings.DB_ERROR, err)
                            return res.status(400).send(strings.DB_ERROR + err)
                        })
                }
            } else {
                return res.sendStatus(403)
            }
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err)
            return res.status(400).send(strings.DB_ERROR + err)
        })
}

export const deleteTokens = (req: Request, res: Response) => {
    Token.deleteMany({user: new mongoose.Types.ObjectId(req.params.userId)})
        .then((result) => {
            if (result.deletedCount > 0) {
                return res.sendStatus(200)
            } else {
                return res.sendStatus(400)
            }
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err)
            return res.status(400).send(strings.DB_ERROR + err)
        })
}

export const resend = (req: Request, res: Response) => {
    User.findOne({email: req.params.email})
        .then(user => {
            if (user) {
                if (![Env.APP_TYPE.FRONTEND, Env.APP_TYPE.BACKEND].includes(req.params.type)
                    || (req.params.type === Env.APP_TYPE.BACKEND && user.type === Env.USER_TYPE.USER)
                    || (req.params.type === Env.APP_TYPE.FRONTEND && user.type !== Env.USER_TYPE.USER)
                ) {
                    return res.sendStatus(403)
                } else {
                    user.active = false

                    user.save()
                        .then(() => {
                            // generate token and save
                            const token = new Token({user: user._id, token: uuid()})

                            token.save()
                                .then(token => {
                                    // Send email
                                    strings.setLanguage(user.language)

                                    const reset = req.params.reset === 'true'

                                    const transporter = nodemailer.createTransport({
                                        // @ts-ignore
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
                                        subject: (reset ? strings.PASSWORD_RESET_SUBJECT : strings.ACCOUNT_ACTIVATION_SUBJECT),
                                        html: '<p>' + strings.HELLO + user.fullName + ',<br><br>'
                                            + (reset ? strings.PASSWORD_RESET_LINK : strings.ACCOUNT_ACTIVATION_LINK) + '<br><br>'

                                            + Helper.joinURL(user.type === Env.USER_TYPE.USER ? FRONTEND_HOST : BACKEND_HOST, (reset ? 'reset-password' : 'activate'))
                                            + '/?u=' + encodeURIComponent(String(user._id))
                                            + '&e=' + encodeURIComponent(user.email)
                                            + '&t=' + encodeURIComponent(token.token)
                                            + '<br><br>'

                                            + strings.REGARDS + '<br>'
                                            + '</p>'
                                    }
                                    transporter.sendMail(mailOptions, (err) => {
                                        if (err) {
                                            console.error(strings.SMTP_ERROR, err)
                                            return res.status(400).send(strings.SMTP_ERROR + err)
                                        } else {
                                            return res.sendStatus(200)
                                        }
                                    })
                                })
                                .catch(err => {
                                    console.error(strings.DB_ERROR, err)
                                    return res.status(400).send(strings.DB_ERROR + err)
                                })
                        })
                        .catch(err => {
                            console.error(strings.DB_ERROR, err)
                            return res.status(400).send(strings.DB_ERROR + err)
                        })
                }
            } else {
                return res.sendStatus(204)
            }
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err)
            return res.status(400).send(strings.DB_ERROR + err)
        })
}

export const activate = (req: Request, res: Response) => {
    User.findById(req.body.userId)
        .then(user => {
            if (user) {
                Token.find({token: req.body.token})
                    .then(token => {
                        if (token) {
                            const salt = bcrypt.genSaltSync(10)
                            const password = req.body.password
                            user.password = bcrypt.hashSync(password, salt)

                            user.active = true
                            user.verified = true
                            user.save()
                                .then(() => {
                                    return res.sendStatus(200)
                                })
                                .catch(err => {
                                    console.error(strings.DB_ERROR, err)
                                    return res.status(400).send(strings.DB_ERROR + err)
                                })
                        } else {
                            return res.sendStatus(204)
                        }
                    })
                    .catch(err => {
                        console.error(strings.DB_ERROR, err)
                        return res.status(400).send(strings.DB_ERROR + err)
                    })
            }
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err)
            return res.status(400).send(strings.DB_ERROR + err)
        })
}

export const signin = (req: Request, res: Response) => {
    User.findOne({email: req.body.email})
        .then(user => {
            if (!req.body.password
                || !user
                || !user.password
                || (![Env.APP_TYPE.FRONTEND, Env.APP_TYPE.BACKEND].includes(req.params.type))
                || (req.params.type === Env.APP_TYPE.BACKEND && user.type === Env.USER_TYPE.USER)
                || (req.params.type === Env.APP_TYPE.FRONTEND && user.type !== Env.USER_TYPE.USER)
            ) {
                res.sendStatus(204)
            } else {
                bcrypt.compare(req.body.password, user.password)
                    .then(async (passwordMatch: unknown) => {
                        if (passwordMatch) {
                            const payload = {id: user._id}

                            let options: { expiresIn?: number } = {expiresIn: JWT_EXPIRE_AT}
                            if (req.body.stayConnected) options = {}

                            const token = jwt.sign(payload, JWT_SECRET, options)

                            res.status(200).send({
                                id: user._id,
                                email: user.email,
                                fullName: user.fullName,
                                language: user.language,
                                enableEmailNotifications: user.enableEmailNotifications,
                                accessToken: token,
                                blacklisted: user.blacklisted,
                                avatar: user.avatar
                            })
                        } else {
                            res.sendStatus(204)
                        }
                    })
                    .catch((err: unknown) => {
                        console.error(strings.ERROR, err)
                        return res.status(400).send(strings.ERROR + err)
                    })
            }
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err)
            return res.status(400).send(strings.DB_ERROR + err)
        })
}

export const pushToken = async (req: Request, res: Response) => {
    try {
        const pushNotification = await PushNotification.findOne({user: req.params.userId})
        if (pushNotification) {
            return res.status(200).json(pushNotification.token)
        }

        return res.sendStatus(204)
    } catch (err) {
        console.error(strings.ERROR, err)
        return res.status(400).send(strings.ERROR + err)
    }
}

export const createPushToken = async (req: Request, res: Response) => {
    try {
        const exist = await PushNotification.exists({user: req.params.userId})

        if (!exist) {
            const pushNotification = new PushNotification({user: req.params.userId, token: req.params.token})
            await pushNotification.save()
            return res.sendStatus(200)
        }

        return res.status(400).send('Push Token already exists.')
    } catch (err) {
        console.error(strings.ERROR, err)
        return res.status(400).send(strings.ERROR + err)
    }
}

export const deletePushToken = async (req: Request, res: Response) => {
    try {
        await PushNotification.deleteMany({user: req.params.userId})
        return res.sendStatus(200)
    } catch (err) {
        console.error(strings.ERROR, err)
        return res.status(400).send(strings.ERROR + err)
    }
}

export const validateEmail = async (req: Request, res: Response) => {
    try {
        const exists = await User.exists({email: req.body.email})

        if (exists) {
            return res.sendStatus(204)
        } else { // email does not exist in db (can be added)
            return res.sendStatus(200)
        }
    } catch (err) {
        console.error('[user.validateEmail] ' + strings.DB_ERROR + ' ' + req.body.email, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

export const validateAccessToken = (req: Request, res: Response) => {
    res.sendStatus(200)
}

export const confirmEmail = (req: Request, res: Response) => {
    Token.findOne({token: req.params.token})
        .then(token => {
            User.findOne({email: req.params.email})
                .then((user) => {
                    if (user) {
                        strings.setLanguage(user.language)
                    }
                    // token is not found into database i.e. token may have expired
                    if (!token) {
                        console.error(strings.ACCOUNT_ACTIVATION_LINK_EXPIRED, req.params)
                        return res.status(400).send(getStatusMessage(getUserLang(user), strings.ACCOUNT_ACTIVATION_LINK_EXPIRED))
                    }
                    // if token is found then check valid user
                    else {
                        // not valid user
                        if (!user) {
                            console.error('[user.confirmEmail] User not found', req.params)
                            return res.status(401).send(getStatusMessage(getUserLang(user), strings.ACCOUNT_ACTIVATION_LINK_ERROR))
                        }
                        // user is already verified
                        else if (user.verified) {
                            return res.status(200).send(getStatusMessage(getUserLang(user), strings.ACCOUNT_ACTIVATION_ACCOUNT_VERIFIED))
                        }
                        // verify user
                        else {
                            // change verified to true
                            user.verified = true
                            // todo: is it number or date
                            // @ts-ignore
                            user.verifiedAt = Date.now()
                            user.save()
                                .then(() => res.status(200).send(getStatusMessage(getUserLang(user), strings.ACCOUNT_ACTIVATION_SUCCESS)))
                                .catch((err) => {
                                    // error occur
                                    console.error('[user.confirmEmail] ' + strings.DB_ERROR + ' ' + req.params, err)
                                    return res.status(500).send(getStatusMessage(getUserLang(user), err.message))
                                })

                        }
                    }
                })
                .catch(err => {
                    console.error(strings.DB_ERROR, err)
                    res.status(400).send(strings.DB_ERROR + err)
                })
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err)
            res.status(400).send(strings.DB_ERROR + err)
        })
}

export const resendLink = (req: Request, res: Response) => {
    User.findOne({email: req.body.email})
        .then(user => {

            // user is not found into database
            if (!user) {
                console.error('[user.resendLink] User not found:', req.params)
                return res.status(400).send(getStatusMessage(DEFAULT_LANGUAGE, strings.ACCOUNT_ACTIVATION_RESEND_ERROR))
            }
            // user has been already verified
            else if (user.verified) {
                return res.status(200).send(getStatusMessage(getUserLang(user), strings.ACCOUNT_ACTIVATION_ACCOUNT_VERIFIED))
            }
            // send verification link
            else {
                // generate token and save
                const token = new Token({user: user._id, token: uuid()})

                token.save()
                    .then(() => {

                        // Send email
                        const transporter = nodemailer.createTransport({
                            //@ts-ignore
                            host: SMTP_HOST,
                            port: SMTP_PORT,
                            auth: {
                                user: SMTP_USER,
                                pass: SMTP_PASS
                            }
                        })

                        strings.setLanguage(user.language)
                        const mailOptions = {
                            from: SMTP_FROM,
                            to: user.email,
                            subject: strings.ACCOUNT_ACTIVATION_SUBJECT,
                            html: '<p ' + (user.language === 'ar' ? 'dir="rtl"' : ')') + '>' + strings.HELLO + user.fullName + ',<br> <br>' + strings.ACCOUNT_ACTIVATION_LINK + '<br><br>http' + (HTTPS ? 's' : '') + ':\/\/' + req.headers.host + '\/api/confirm-email\/' + user.email + '\/' + token.token + '<br><br>' + strings.REGARDS + '<br>' + '</p>'
                        }
                        transporter.sendMail(mailOptions, (err) => {
                            if (err) {
                                console.error('[user.resendLink] ' + strings.SMTP_ERROR, req.params)
                                //@ts-ignore
                                return res.status(500).send(getStatusMessage(getUserLang(user), strings.ACCOUNT_ACTIVATION_TECHNICAL_ISSUE + ' ' + err.response))
                            }
                            return res.status(200).send(getStatusMessage(getUserLang(user), strings.ACCOUNT_ACTIVATION_EMAIL_SENT_PART_1 + user.email + strings.ACCOUNT_ACTIVATION_EMAIL_SENT_PART_2))
                        })
                    })
                    .catch(err => {
                        console.error('[user.resendLink] ' + strings.DB_ERROR, req.params)
                        return res.status(500).send(getStatusMessage(getUserLang(user), err.message))
                    })
            }
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err)
            res.status(400).send(strings.DB_ERROR + err)
        })
}

export const update = (req: Request, res: Response) => {
    User.findById(req.body._id)
        .then(user => {
            if (!user) {
                console.error('[user.update] User not found:', req.body.email)
                res.sendStatus(204)
            } else {
                const {fullName, phone, bio, location, type, birthDate, enableEmailNotifications, payLater} = req.body
                if (fullName) user.fullName = fullName
                user.phone = phone
                user.location = location
                user.bio = bio
                user.birthDate = birthDate
                if (type) user.type = type
                if (typeof enableEmailNotifications !== 'undefined') user.enableEmailNotifications = enableEmailNotifications
                if (typeof payLater !== 'undefined') user.payLater = payLater

                user.save()
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
}

export const updateEmailNotifications = (req: Request, res: Response) => {
    User.findById(req.body._id)
        .then(user => {
            if (!user) {
                console.error('[user.updateEmailNotifications] User not found:', req.body.email)
                res.sendStatus(204)
            } else {
                user.enableEmailNotifications = req.body.enableEmailNotifications
                user.save()
                    .then(() => {
                        res.sendStatus(200)
                    })
                    .catch(err => {
                        console.error(strings.DB_ERROR, err)
                        res.status(400).send(strings.DB_ERROR + err)
                    })

            }
        }).catch(err => {
        console.error(strings.DB_ERROR, err)
        res.status(400).send(strings.DB_ERROR + err)
    })
}

export const updateLanguage = (req: Request, res: Response) => {
    User.findById(req.body.id)
        .then(user => {
            if (!user) {
                console.error('[user.updateLanguage] User not found:', req.body.id)
                res.sendStatus(204)
            } else {
                user.language = req.body.language
                user.save()
                    .then(() => {
                        res.sendStatus(200)
                    })
                    .catch(err => {
                        console.error(strings.DB_ERROR, err)
                        res.status(400).send(strings.DB_ERROR + err)
                    })

            }
        }).catch(err => {
        console.error(strings.DB_ERROR, err)
        res.status(400).send(strings.DB_ERROR + err)
    })
}

export const getUser = (req: Request, res: Response) => {
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
                console.error('[user.getUser] User not found:', req.params)
                res.sendStatus(204)
            } else {
                res.json(user)
            }
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err)
            res.status(400).send(strings.DB_ERROR + err)
        })
}

export const createAvatar = async (req: Request, res: Response) => {
    try {
        assert(req.file, 'No file in request');
        const url = await put({
            Key: `${uuid()}_${Date.now()}${path.extname(req.file.originalname)}`,
            Body: req.file?.buffer
        })
        assert(url, 'Problem with uploading');

        return res.json(url)
    } catch (err) {
        console.error(strings.ERROR, err)
        res.status(400).send(strings.ERROR + err)
    }
}

import {uid} from 'uid';

export const updateAvatar = async (req: Request, res: Response) => {
    try {
        const userId = req.params.userId
        const user = await User.findById(userId);
        assert(user, 'User not found');
        assert(req.file, 'No file in request');

        const ext = path.extname(req.file.originalname);
        assert(ext, 'File name without extension');

        const filename = `${user._id}_${Date.now()}_${uid()}${ext}`

        const url = await put({
            Key: filename,
            Body: req.file?.buffer
        })
        assert(url, 'Problem with uploading');
        user.avatar = url

        await user.save()
        return res.sendStatus(200)
    } catch (err) {
        console.error(strings.DB_ERROR, err)
        res.status(400).send(strings.DB_ERROR + err)
    }
}

export const deleteAvatar = (req: Request, res: Response) => {
    console.log("deleteAvatar", req.body);

    const userId = req.params.userId

    User.findById(userId)
        .then(user => {
            if (user) {
                user.avatar = undefined

                user.save()
                    .then(() => {
                        res.sendStatus(200)
                    })
                    .catch(err => {
                        console.error(strings.DB_ERROR, err)
                        res.status(400).send(strings.DB_ERROR + err)
                    })
            } else {
                console.error('[user.deleteAvatar] User not found:', req.params.userId)
                res.sendStatus(204)
            }
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err)
            res.status(400).send(strings.DB_ERROR + err)
        })
}

export const deleteTempAvatar = (req: Request, res: Response) => {
    try {
        res.sendStatus(200)
    } catch (err) {
        console.error(strings.ERROR, err)
        res.status(400).send(strings.ERROR + err)
    }
}

export const changePassword = (req: Request, res: Response) => {
    User.findOne({_id: req.body._id})
        .then(user => {

            if (!user) {
                console.error('[user.changePassword] User not found:', req.body._id)
                return res.sendStatus(204)
            }

            const changePassword = () => {
                const salt = bcrypt.genSaltSync(10)
                const password = req.body.newPassword
                user.password = bcrypt.hashSync(password, salt)

                user.save()
                    .then(() => {
                        return res.sendStatus(200)
                    })
                    .catch(err => {
                        console.error(strings.DB_ERROR, err)
                        return res.status(400).send(strings.DB_ERROR + err)
                    })
            }

            if (req.body.strict) {
                bcrypt.compare(req.body.password, user.password ?? '')
                    .then(async passwordMatch => {
                        if (passwordMatch) {
                            changePassword()
                        } else {
                            return res.sendStatus(204)
                        }
                    })
            } else {
                changePassword()
            }
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err)
            res.status(400).send(strings.DB_ERROR + err)
        })
}

export const checkPassword = (req: Request, res: Response) => {
    User.findById(req.params.id)
        .then(user => {
            if (user) {
                bcrypt.compare(req.params.password, user.password ?? '').then(passwordMatch => {
                    if (passwordMatch) {
                        return res.sendStatus(200)
                    } else {
                        return res.sendStatus(204)
                    }
                })
            } else {
                console.error('[user.checkPassword] User not found:', req.params.id)
                return res.sendStatus(204)
            }
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err)
            return res.status(400).send(strings.DB_ERROR + err)
        })
}

export const getUsers = async (req: Request, res: Response) => {

    try {
        const keyword = escapeStringRegexp(String(req.query.s) || '')
        const options = 'i'
        const page = parseInt(req.params.page)
        const size = parseInt(req.params.size)
        const types = req.body.types
        const userId = req.body.user

        const match: PipelineStage.Match = {$match:{
            $and: [
                {
                    type: {$in: types}
                },
                {
                    fullName: {$regex: keyword, $options: options}
                }
            ]
        }};

        assert(Array.isArray(match.$match.$and));

        if (userId) {
            match.$match.$and.push({_id: {$ne: new mongoose.Types.ObjectId(userId)}})
        }

        const users = await User.aggregate([
            match,
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
                        {$sort: {fullName: 1}},
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
        ], {collation: {locale: Env.DEFAULT_LANGUAGE, strength: 2}})

        res.json(users)
    } catch (err) {
        console.error(strings.DB_ERROR, err)
        res.status(400).send(strings.DB_ERROR + err)
    }
}

export const deleteUsers = async (req: Request, res: Response) => {
    try {
        const ids = req.body.map((id: unknown) => new mongoose.Types.ObjectId(String(id)))

        for (const id of ids) {
            await Booking.deleteMany({driver: id})
        }

        return res.sendStatus(200)
    } catch (err) {
        console.error(`[user.delete]  ${strings.DB_ERROR} ${req.body}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}
