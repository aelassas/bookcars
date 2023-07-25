import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import path from 'path'
import fs from 'fs/promises'
import nodemailer from 'nodemailer'
import { v1 as uuid } from 'uuid'
import escapeStringRegexp from 'escape-string-regexp'
import strings from '../config/app.config.js'
import Env from '../config/env.config.js'
import User from '../models/User.js'
import Booking from '../models/Booking.js'
import Token from '../models/Token.js'
import PushNotification from '../models/PushNotification.js'
import mongoose from 'mongoose'
import * as Helper from '../common/Helper.js'

const DEFAULT_LANGUAGE = process.env.BC_DEFAULT_LANGUAGE
const HTTPS = process.env.BC_HTTPS.toLowerCase() === 'true'
const JWT_SECRET = process.env.BC_JWT_SECRET
const JWT_EXPIRE_AT = parseInt(process.env.BC_JWT_EXPIRE_AT)
const SMTP_HOST = process.env.BC_SMTP_HOST
const SMTP_PORT = process.env.BC_SMTP_PORT
const SMTP_USER = process.env.BC_SMTP_USER
const SMTP_PASS = process.env.BC_SMTP_PASS
const SMTP_FROM = process.env.BC_SMTP_FROM
const CDN = process.env.BC_CDN_USERS
const CDN_TEMP = process.env.BC_CDN_TEMP_USERS
const BACKEND_HOST = process.env.BC_BACKEND_HOST
const FRONTEND_HOST = process.env.BC_FRONTEND_HOST

const getStatusMessage = (lang, msg) => `<!DOCTYPE html><html lang="' ${lang}'"><head></head><body><p>${msg}</p></body></html>`

export const signup = async (req, res) => {
    const { body } = req

    try {
        body.active = true
        body.verified = false
        body.blacklisted = false
        body.type = Env.USER_TYPE.USER

        const salt = await bcrypt.genSalt(10)
        const password = body.password
        const passwordHash = await bcrypt.hash(password, salt)
        body.password = passwordHash

        const user = new User(body)
        await user.save()

        if (body.avatar) {
            const avatar = path.join(CDN_TEMP, body.avatar)
            if (Helper.exists(avatar)) {
                const filename = `${user._id}_${Date.now()}${path.extname(body.avatar)}`
                const newPath = path.join(CDN, filename)

                await fs.rename(avatar, newPath)
                user.avatar = filename
                await user.save()
            }
        }

        // generate token and save
        const token = new Token({ user: user._id, token: uuid() })

        await token.save()

        // Send email
        strings.setLanguage(user.language)

        const transporter = nodemailer.createTransport({
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
        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.error(strings.SMTP_ERROR, err)
                return res.status(400).send(strings.SMTP_ERROR + err)
            } else {
                return res.sendStatus(200)
            }
        })
    } catch (err) {
        console.error(`[user.signup] ${strings.DB_ERROR} ${body}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

export const adminSignup = async (req, res) => {
    const { body } = req

    try {
        body.active = true
        body.verified = false
        body.blacklisted = false
        body.type = Env.USER_TYPE.ADMIN

        const salt = await bcrypt.genSalt(10)
        const password = body.password
        const passwordHash = await bcrypt.hash(password, salt)
        body.password = passwordHash

        const user = new User(body)
        await user.save()

        if (body.avatar) {
            const avatar = path.join(CDN_TEMP, body.avatar)
            if (await Helper.exists(avatar)) {
                const filename = `${user._id}_${Date.now()}${path.extname(body.avatar)}`
                const newPath = path.join(CDN, filename)

                try {
                    await fs.prompises.rename(avatar, newPath)
                    user.avatar = filename
                    user.save()
                        .catch(err => {
                            console.error(strings.DB_ERROR, err)
                            res.status(400).send(strings.DB_ERROR + err)
                        })
                } catch (err) {
                    console.error(strings.ERROR, err)
                    res.status(400).send(strings.ERROR + err)
                }
            }
        }

        // generate token and save
        const token = new Token({ user: user._id, token: uuid() })
        await token.save()

        // Send email
        strings.setLanguage(user.language)

        const transporter = nodemailer.createTransport({
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

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.error(strings.SMTP_ERROR, err)
                return res.status(400).send(strings.SMTP_ERROR + err)
            } else {
                return res.sendStatus(200)
            }
        })
    } catch (err) {
        console.error(`[user.adminSignup] ${strings.DB_ERROR} ${body}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

export const create = async (req, res) => {
    const { body } = req

    try {
        body.verified = false
        body.blacklisted = false

        if (body.password) {
            const salt = await bcrypt.genSalt(10)
            const password = body.password
            const passwordHash = await bcrypt.hash(password, salt)
            body.password = passwordHash
        }

        const user = new User(body)
        await user.save()

        // avatar
        if (body.avatar) {
            const avatar = path.join(CDN_TEMP, body.avatar)
            if (await Helper.exists(avatar)) {
                const filename = `${user._id}_${Date.now()}${path.extname(body.avatar)}`
                const newPath = path.join(CDN, filename)

                try {
                    await fs.rename(avatar, newPath)
                    user.avatar = filename
                    user.save()
                        .catch(err => {
                            console.error(strings.DB_ERROR, err)
                            res.status(400).send(strings.DB_ERROR + err)
                        })
                } catch (err) {
                    console.error(strings.ERROR, err)
                    res.status(400).send(strings.ERROR + err)
                }
            }
        }

        if (body.password) {
            return res.sendStatus(200)
        }

        // generate token and save
        const token = new Token({ user: user._id, token: uuid() })
        await token.save()

        // Send email
        strings.setLanguage(user.language)

        const transporter = nodemailer.createTransport({
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
                + '/?u=' + encodeURIComponent(user._id)
                + '&e=' + encodeURIComponent(user.email)
                + '&t=' + encodeURIComponent(token.token)
                + '<br><br>'

                + strings.REGARDS + '<br>'
                + '</p>'
        }

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.error(strings.SMTP_ERROR, err)
                return res.status(400).send(strings.SMTP_ERROR + err)
            } else {
                return res.sendStatus(200)
            }
        })
    } catch (err) {
        console.error(`[user.create] ${strings.DB_ERROR} ${body}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

export const checkToken = async (req, res) => {
    const { userId, email } = req.params

    try {
        const user = await User.findOne({ _id: new mongoose.Types.ObjectId(userId), email: email })

        if (user) {
            if (![Env.APP_TYPE.FRONTEND, Env.APP_TYPE.BACKEND].includes(req.params.type)
                || (req.params.type === Env.APP_TYPE.BACKEND && user.type === Env.USER_TYPE.USER)
                || (req.params.type === Env.APP_TYPE.FRONTEND && user.type !== Env.USER_TYPE.USER)
                || user.active
            ) {
                return res.sendStatus(403)
            } else {
                const token = await Token.findOne({ user: new mongoose.Types.ObjectId(req.params.userId), token: req.params.token })

                if (token) {
                    return res.sendStatus(200)
                } else {
                    return res.sendStatus(204)
                }
            }
        } else {
            return res.sendStatus(403)
        }
    } catch (err) {
        console.error(`[user.checkToken] ${strings.DB_ERROR} ${req.params}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

export const deleteTokens = async (req, res) => {
    const { userId } = req.params

    try {
        const result = await Token.deleteMany({ user: new mongoose.Types.ObjectId(userId) })

        if (result.deletedCount > 0) {
            return res.sendStatus(200)
        } else {
            return res.sendStatus(400)
        }
    } catch (err) {
        console.error(`[user.deleteTokens] ${strings.DB_ERROR} ${userId}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

export const resend = async (req, res) => {
    const { email } = req.params

    try {
        const user = await User.findOne({ email: email })

        if (user) {
            if (![Env.APP_TYPE.FRONTEND, Env.APP_TYPE.BACKEND].includes(req.params.type)
                || (req.params.type === Env.APP_TYPE.BACKEND && user.type === Env.USER_TYPE.USER)
                || (req.params.type === Env.APP_TYPE.FRONTEND && user.type !== Env.USER_TYPE.USER)
            ) {
                return res.sendStatus(403)
            } else {
                user.active = false
                await user.save()

                // generate token and save
                const token = new Token({ user: user._id, token: uuid() })
                await token.save()

                // Send email
                strings.setLanguage(user.language)

                const reset = req.params.reset === 'true'

                const transporter = nodemailer.createTransport({
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
                        + '/?u=' + encodeURIComponent(user._id)
                        + '&e=' + encodeURIComponent(user.email)
                        + '&t=' + encodeURIComponent(token.token)
                        + '<br><br>'

                        + strings.REGARDS + '<br>'
                        + '</p>'
                }

                transporter.sendMail(mailOptions, (err, info) => {
                    if (err) {
                        console.error(strings.SMTP_ERROR, err)
                        return res.status(400).send(strings.SMTP_ERROR + err)
                    } else {
                        return res.sendStatus(200)
                    }
                })
            }
        } else {
            return res.sendStatus(204)
        }
    } catch (err) {
        console.error(`[user.deleteTokens] ${strings.DB_ERROR} ${email}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

export const activate = async (req, res) => {
    const { userId } = req.body

    try {
        const user = await User.findById(userId)

        if (user) {
            const token = await Token.find({ token: req.body.token })

            if (token) {
                const salt = await bcrypt.genSalt(10)
                const password = req.body.password
                const passwordHash = await bcrypt.hash(password, salt)
                user.password = passwordHash

                user.active = true
                user.verified = true
                await user.save()

                return res.sendStatus(200)
            } else {
                return res.sendStatus(204)
            }
        }
    } catch (err) {
        console.error(`[user.activate] ${strings.DB_ERROR} ${userId}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

export const signin = async (req, res) => {
    const { email } = req.body

    try {
        const user = await User.findOne({ email: email })

        if (!req.body.password
            || !user
            || !user.password
            || (![Env.APP_TYPE.FRONTEND, Env.APP_TYPE.BACKEND].includes(req.params.type))
            || (req.params.type === Env.APP_TYPE.BACKEND && user.type === Env.USER_TYPE.USER)
            || (req.params.type === Env.APP_TYPE.FRONTEND && user.type !== Env.USER_TYPE.USER)
        ) {
            res.sendStatus(204)
        } else {
            const passwordMatch = await bcrypt.compare(req.body.password, user.password)

            if (passwordMatch) {
                const payload = { id: user._id }

                let options = { expiresIn: JWT_EXPIRE_AT }
                if (req.body.stayConnected) options = {}

                const token = jwt.sign(payload, JWT_SECRET, options)

                return res.status(200).send({
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
                return res.sendStatus(204)
            }
        }
    } catch (err) {
        console.error(`[user.signin] ${strings.DB_ERROR} ${email}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

export const pushToken = async (req, res) => {
    const { userId } = req.params

    try {
        const pushNotification = await PushNotification.findOne({ user: userId })
        if (pushNotification) {
            return res.status(200).json(pushNotification.token)
        }

        return res.sendStatus(204)
    } catch (err) {
        console.error(`[user.pushToken] ${strings.DB_ERROR} ${userId}`, err)
        return res.status(400).send(strings.ERROR + err)
    }
}

export const createPushToken = async (req, res) => {
    const { userId, token } = req.params

    try {
        const exist = await PushNotification.exists({ user: userId })

        if (!exist) {
            const pushNotification = new PushNotification({ user: userId, token: token })
            await pushNotification.save()
            return res.sendStatus(200)
        }

        return res.status(400).send('Push Token already exists.')
    } catch (err) {
        console.error(`[user.createPushToken] ${strings.DB_ERROR} ${userId}`, err)
        return res.status(400).send(strings.ERROR + err)
    }
}

export const deletePushToken = async (req, res) => {
    const { userId } = req.params

    try {
        await PushNotification.deleteMany({ user: userId })
        return res.sendStatus(200)
    } catch (err) {
        console.error(`[user.deletePushToken] ${strings.DB_ERROR} ${userId}`, err)
        return res.status(400).send(strings.ERROR + err)
    }
}

export const validateEmail = async (req, res) => {
    const { email } = req.body

    try {
        const exists = await User.exists({ email: email })

        if (exists) {
            return res.sendStatus(204)
        } else {
            // email does not exist in db (can be added)
            return res.sendStatus(200)
        }
    } catch (err) {
        console.error(`[user.validateEmail] ${strings.DB_ERROR} ${email}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

export const validateAccessToken = (req, res) => res.sendStatus(200)

export const confirmEmail = async (req, res) => {
    try {
        const { token: _token, email: _email } = req.params
        const token = await Token.findOne({ token: _token })
        const user = await User.findOne({ email: _email })
        strings.setLanguage(user.language)
        // token is not found into database i.e. token may have expired 
        if (!token) {
            console.error(strings.ACCOUNT_ACTIVATION_LINK_EXPIRED, req.params)
            return res.status(400).send(getStatusMessage(user.language, strings.ACCOUNT_ACTIVATION_LINK_EXPIRED))
        }
        // if token is found then check valid user 
        else {
            // not valid user
            if (!user) {
                console.error('[user.confirmEmail] User not found', req.params)
                return res.status(401).send(getStatusMessage(user.language, strings.ACCOUNT_ACTIVATION_LINK_ERROR))
            }
            // user is already verified
            else if (user.verified) {
                return res.status(200).send(getStatusMessage(user.language, strings.ACCOUNT_ACTIVATION_ACCOUNT_VERIFIED))
            }
            // verify user
            else {
                // change verified to true
                user.verified = true
                user.verifiedAt = Date.now()
                await user.save()
                return res.status(200).send(getStatusMessage(user.language, strings.ACCOUNT_ACTIVATION_SUCCESS))
            }
        }
    } catch (err) {
        console.error(`[user.confirmEmail] ${strings.DB_ERROR} ${req.params}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

export const resendLink = async (req, res) => {
    const { email } = req.body

    try {
        const user = await User.findOne({ email: email })

        // user is not found into database
        if (!user) {
            console.error('[user.resendLink] User not found:', req.params)
            return res.status(400).send(getStatusMessage(DEFAULT_LANGUAGE, strings.ACCOUNT_ACTIVATION_RESEND_ERROR))
        }
        // user has been already verified
        else if (user.verified) {
            return res.status(200).send(getStatusMessage(user.language, strings.ACCOUNT_ACTIVATION_ACCOUNT_VERIFIED))
        }
        // send verification link
        else {
            // generate token and save
            const token = new Token({ user: user._id, token: uuid() })
            await token.save()

            // Send email
            const transporter = nodemailer.createTransport({
                host: SMTP_HOST,
                port: SMTP_PORT,
                auth: {
                    user: SMTP_USER,
                    pass: SMTP_PASS
                }
            })

            strings.setLanguage(user.language)
            const mailOptions = { from: SMTP_FROM, to: user.email, subject: strings.ACCOUNT_ACTIVATION_SUBJECT, html: '<p ' + (user.language === 'ar' ? 'dir="rtl"' : ')') + '>' + strings.HELLO + user.fullName + ',<br> <br>' + strings.ACCOUNT_ACTIVATION_LINK + '<br><br>http' + (HTTPS ? 's' : '') + ':\/\/' + req.headers.host + '\/api/confirm-email\/' + user.email + '\/' + token.token + '<br><br>' + strings.REGARDS + '<br>' + '</p>' }
            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    console.error('[user.resendLink] ' + strings.SMTP_ERROR, req.params)
                    return res.status(500).send(getStatusMessage(user.language, strings.ACCOUNT_ACTIVATION_TECHNICAL_ISSUE + ' ' + err.response))
                }
                return res.status(200).send(getStatusMessage(user.language, strings.ACCOUNT_ACTIVATION_EMAIL_SENT_PART_1 + user.email + strings.ACCOUNT_ACTIVATION_EMAIL_SENT_PART_2))
            })
        }
    } catch (err) {
        console.error(`[user.resendLink] ${strings.DB_ERROR} ${email}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

export const update = async (req, res) => {
    try {
        const { _id } = req.body
        const user = await User.findById(_id)
        if (!user) {
            console.error('[user.update] User not found:', req.body.email)
            return res.sendStatus(204)
        } else {
            const { fullName, phone, bio, location, type, birthDate, enableEmailNotifications, payLater } = req.body
            if (fullName) user.fullName = fullName
            user.phone = phone
            user.location = location
            user.bio = bio
            user.birthDate = birthDate
            if (type) user.type = type
            if (typeof enableEmailNotifications !== 'undefined') user.enableEmailNotifications = enableEmailNotifications
            if (typeof payLater !== 'undefined') user.payLater = payLater

            await user.save()
            return res.sendStatus(200)
        }
    } catch (err) {
        console.error(`[user.update] ${strings.DB_ERROR} ${req.body}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

export const updateEmailNotifications = async (req, res) => {
    try {
        const { _id } = req.body
        const user = await User.findById(_id)
        if (!user) {
            console.error('[user.updateEmailNotifications] User not found:', req.body)
            return res.sendStatus(204)
        } else {
            user.enableEmailNotifications = req.body.enableEmailNotifications
            await user.save()
            return res.sendStatus(200)
        }
    } catch (err) {
        console.error(`[user.updateEmailNotifications] ${strings.DB_ERROR} ${req.body}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

export const updateLanguage = async (req, res) => {
    try {
        const { id, language } = req.body
        const user = await User.findById(id)
        if (!user) {
            console.error('[user.updateLanguage] User not found:', id)
            res.sendStatus(204)
        } else {
            user.language = language
            await user.save()
            return res.sendStatus(200)
        }
    } catch (err) {
        console.error(`[user.updateLanguage] ${strings.DB_ERROR} ${req.body}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

export const getUser = async (req, res) => {
    const { id } = req.params
    try {
        const user = await User.findById(id, {
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
        }).lean()

        if (!user) {
            console.error('[user.getUser] User not found:', req.params)
            return res.sendStatus(204)
        } else {
            return res.json(user)
        }
    } catch (err) {
        console.error(`[user.updateLanguage] ${strings.DB_ERROR} ${id}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

export const createAvatar = async (req, res) => {
    try {
        if (!await Helper.exists(CDN_TEMP)) {
            await fs.mkdir(CDN_TEMP, { recursive: true })
        }

        const filename = `${uuid()}_${Date.now()}${path.extname(req.file.originalname)}`
        const filepath = path.join(CDN_TEMP, filename)

        await fs.writeFile(filepath, req.file.buffer)
        return res.json(filename)
    } catch (err) {
        console.error(`[user.createAvatar] ${strings.DB_ERROR} ${req.file.originalname}`, err)
        return res.status(400).send(strings.ERROR + err)
    }
}

export const updateAvatar = async (req, res) => {
    const { userId } = req.params

    try {
        const user = await User.findById(userId)

        if (user) {
            if (!await Helper.exists(CDN)) {
                await fs.mkdir(CDN, { recursive: true })
            }

            if (user.avatar && !user.avatar.startsWith('http')) {
                const avatar = path.join(CDN, user.avatar)

                if (await Helper.exists(avatar)) {
                    await fs.unlink(avatar)
                }
            }

            const filename = `${user._id}_${Date.now()}${path.extname(req.file.originalname)}`
            const filepath = path.join(CDN, filename)

            await fs.writeFile(filepath, req.file.buffer)
            user.avatar = filename
            await user.save()
            return res.sendStatus(200)
        } else {
            console.error('[user.updateAvatar] User not found:', userId)
            return res.sendStatus(204)
        }
    } catch (err) {
        console.error(`[user.updateAvatar] ${strings.DB_ERROR} ${userId}`, err)
        return res.status(400).send(strings.ERROR + err)
    }
}

export const deleteAvatar = async (req, res) => {
    const { userId } = req.params

    try {
        const user = await User.findById(userId)

        if (user) {
            if (user.avatar && !user.avatar.startsWith('http')) {
                const avatar = path.join(CDN, user.avatar)
                if (await Helper.exists(avatar)) {
                    await fs.unlink(avatar)
                }
            }
            user.avatar = null

            await user.save()
            return res.sendStatus(200)
        } else {
            console.error('[user.deleteAvatar] User not found:', userId)
            res.sendStatus(204)
        }
    } catch (err) {
        console.error(`[user.deleteAvatar] ${strings.DB_ERROR} ${userId}`, err)
        return res.status(400).send(strings.ERROR + err)
    }
}

export const deleteTempAvatar = async (req, res) => {
    const { avatar } = req.params

    try {
        const avatarFile = path.join(CDN_TEMP, avatar)
        if (await Helper.exists(avatarFile)) {
            await fs.unlink(avatarFile)
        }
        return res.sendStatus(200)
    } catch (err) {
        console.error(`[user.deleteTempAvatar] ${strings.DB_ERROR} ${avatar}`, err)
        return res.status(400).send(strings.ERROR + err)
    }
}

export const changePassword = (req, res) => {
    User.findOne({ _id: req.body._id })
        .then(user => {

            if (!user) {
                console.error('[user.changePassword] User not found:', req.body._id)
                return res.sendStatus(204)
            }

            const changePassword = async () => {
                const salt = await bcrypt.genSalt(10)
                const password = req.body.newPassword
                const passwordHash = await bcrypt.hash(password, salt)
                user.password = passwordHash

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
                bcrypt.compare(req.body.password, user.password)
                    .then(async passwordMatch => {
                        if (passwordMatch) {
                            changePassword()
                        }
                        else {
                            return res.sendStatus(204)
                        }
                    })
            }
            else {
                changePassword()
            }
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err)
            res.status(400).send(strings.DB_ERROR + err)
        })
}

export const checkPassword = (req, res) => {
    User.findById(req.params.id)
        .then(user => {
            if (user) {
                bcrypt.compare(req.params.password, user.password).then(passwordMatch => {
                    if (passwordMatch) {
                        return res.sendStatus(200)
                    }
                    else {
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

export const getUsers = async (req, res) => {

    try {
        const keyword = escapeStringRegexp(req.query.s || '')
        const options = 'i'
        const page = parseInt(req.params.page)
        const size = parseInt(req.params.size)
        const types = req.body.types
        const userId = req.body.user

        const $match = {
            $and: [
                {
                    type: { $in: types }
                },
                {
                    fullName: { $regex: keyword, $options: options }
                }
            ]
        }

        if (userId) {
            $match.$and.push({ _id: { $ne: new mongoose.Types.ObjectId(userId) } })
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
        ], { collation: { locale: Env.DEFAULT_LANGUAGE, strength: 2 } })

        res.json(users)
    } catch (err) {
        console.error(strings.DB_ERROR, err)
        res.status(400).send(strings.DB_ERROR + err)
    }
}

export const deleteUsers = async (req, res) => {
    try {
        const ids = req.body.map(id => new mongoose.Types.ObjectId(id))

        for (const id of ids) {
            const user = await User.findByIdAndDelete(id)
            if (user.avatar) {
                const avatar = path.join(CDN, user.avatar)
                if (await Helper.exists(avatar)) {
                    await fs.unlink(avatar)
                }
            }
            await Booking.deleteMany({ driver: id })
        }

        return res.sendStatus(200)
    } catch (err) {
        console.error(`[user.delete]  ${strings.DB_ERROR} ${req.body}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}