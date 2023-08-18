import path from 'node:path'
import fs from 'node:fs/promises'
import process from 'node:process'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { v1 as uuid } from 'uuid'
import escapeStringRegexp from 'escape-string-regexp'
import mongoose from 'mongoose'
import strings from '../config/app.config.js'
import Env from '../config/env.config.js'
import User from '../models/User.js'
import Booking from '../models/Booking.js'
import Token from '../models/Token.js'
import PushNotification from '../models/PushNotification.js'
import * as Helper from '../common/Helper.js'
import Notification from '../models/Notification.js'
import Car from '../models/Car.js'
import AdditionalDriver from '../models/AdditionalDriver.js'

const DEFAULT_LANGUAGE = process.env.BC_DEFAULT_LANGUAGE
const HTTPS = process.env.BC_HTTPS.toLowerCase() === 'true'
const JWT_SECRET = process.env.BC_JWT_SECRET
const JWT_EXPIRE_AT = Number.parseInt(process.env.BC_JWT_EXPIRE_AT)
const SMTP_FROM = process.env.BC_SMTP_FROM
const CDN = process.env.BC_CDN_USERS
const CDN_TEMP = process.env.BC_CDN_TEMP_USERS
const CDN_CARS = process.env.BC_CDN_CARS
const BACKEND_HOST = process.env.BC_BACKEND_HOST
const FRONTEND_HOST = process.env.BC_FRONTEND_HOST

const getStatusMessage = (lang, msg) => `<!DOCTYPE html><html lang="' ${lang}'"><head></head><body><p>${msg}</p></body></html>`

export async function signup(req, res) {
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

    const mailOptions = {
      from: SMTP_FROM,
      to: user.email,
      subject: strings.ACCOUNT_ACTIVATION_SUBJECT,
      html:
        `<p>${strings.HELLO}${user.fullName},<br><br>
        ${strings.ACCOUNT_ACTIVATION_LINK}<br><br>
        http${HTTPS ? 's' : ''}://${req.headers.host}/api/confirm-email/${user.email}/${token.token}<br><br>
        ${strings.REGARDS}<br></p>`,
    }
    await Helper.sendMail(mailOptions)
    return res.sendStatus(200)
  } catch (err) {
    console.error(`[user.signup] ${strings.DB_ERROR} ${body}`, err)
    return res.status(400).send(strings.DB_ERROR + err)
  }
}

export async function adminSignup(req, res) {
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
          await fs.rename(avatar, newPath)
          user.avatar = filename
          await user.save()
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

    const mailOptions = {
      from: SMTP_FROM,
      to: user.email,
      subject: strings.ACCOUNT_ACTIVATION_SUBJECT,
      html:
        `<p>${strings.HELLO}${user.fullName},<br><br>
        ${strings.ACCOUNT_ACTIVATION_LINK}<br><br>
        http${HTTPS ? 's' : ''}://${req.headers.host}/api/confirm-email/${user.email}/${token.token}<br><br>
        ${strings.REGARDS}<br></p>`,
    }

    await Helper.sendMail(mailOptions)
    return res.sendStatus(200)
  } catch (err) {
    console.error(`[user.adminSignup] ${strings.DB_ERROR} ${body}`, err)
    return res.status(400).send(strings.DB_ERROR + err)
  }
}

export async function create(req, res) {
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
          await user.save()
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

    const mailOptions = {
      from: SMTP_FROM,
      to: user.email,
      subject: strings.ACCOUNT_ACTIVATION_SUBJECT,
      html:
        `<p>${strings.HELLO}${user.fullName},<br><br>
        ${strings.ACCOUNT_ACTIVATION_LINK}<br><br>
        ${Helper.joinURL(
          user.type === Env.USER_TYPE.USER ? FRONTEND_HOST : BACKEND_HOST,
          'activate',
        )}/?u=${encodeURIComponent(user._id)}&e=${encodeURIComponent(user.email)}&t=${encodeURIComponent(token.token)}<br><br>
        ${strings.REGARDS}<br></p>`,
    }

    await Helper.sendMail(mailOptions)
    return res.sendStatus(200)
  } catch (err) {
    console.error(`[user.create] ${strings.DB_ERROR} ${body}`, err)
    return res.status(400).send(strings.DB_ERROR + err)
  }
}

export async function checkToken(req, res) {
  const { userId, email } = req.params

  try {
    const user = await User.findOne({
      _id: new mongoose.Types.ObjectId(userId),
      email,
    })

    if (user) {
      if (
        ![Env.APP_TYPE.FRONTEND, Env.APP_TYPE.BACKEND].includes(req.params.type) ||
        (req.params.type === Env.APP_TYPE.BACKEND && user.type === Env.USER_TYPE.USER) ||
        (req.params.type === Env.APP_TYPE.FRONTEND && user.type !== Env.USER_TYPE.USER) ||
        user.active
      ) {
        return res.sendStatus(403)
      } else {
        const token = await Token.findOne({
          user: new mongoose.Types.ObjectId(req.params.userId),
          token: req.params.token,
        })

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

export async function deleteTokens(req, res) {
  const { userId } = req.params

  try {
    const result = await Token.deleteMany({
      user: new mongoose.Types.ObjectId(userId),
    })

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

export async function resend(req, res) {
  const { email } = req.params

  try {
    const user = await User.findOne({ email })

    if (user) {
      if (
        ![Env.APP_TYPE.FRONTEND, Env.APP_TYPE.BACKEND].includes(req.params.type) ||
        (req.params.type === Env.APP_TYPE.BACKEND && user.type === Env.USER_TYPE.USER) ||
        (req.params.type === Env.APP_TYPE.FRONTEND && user.type !== Env.USER_TYPE.USER)
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

        const mailOptions = {
          from: SMTP_FROM,
          to: user.email,
          subject: reset ? strings.PASSWORD_RESET_SUBJECT : strings.ACCOUNT_ACTIVATION_SUBJECT,
          html:
            `<p>${strings.HELLO}${user.fullName},<br><br>
            ${reset ? strings.PASSWORD_RESET_LINK : strings.ACCOUNT_ACTIVATION_LINK}<br><br>
            ${Helper.joinURL(
              user.type === Env.USER_TYPE.USER ? FRONTEND_HOST : BACKEND_HOST,
              reset ? 'reset-password' : 'activate',
            )}/?u=${encodeURIComponent(user._id)}&e=${encodeURIComponent(user.email)}&t=${encodeURIComponent(token.token)}<br><br>
            ${strings.REGARDS}<br></p>`,
        }

        await Helper.sendMail(mailOptions)
        return res.sendStatus(200)
      }
    } else {
      return res.sendStatus(204)
    }
  } catch (err) {
    console.error(`[user.resend] ${strings.DB_ERROR} ${email}`, err)
    return res.status(400).send(strings.DB_ERROR + err)
  }
}

export async function activate(req, res) {
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

export async function signin(req, res) {
  const { email } = req.body

  try {
    const user = await User.findOne({ email })

    if (
      !req.body.password ||
      !user ||
      !user.password ||
      ![Env.APP_TYPE.FRONTEND, Env.APP_TYPE.BACKEND].includes(req.params.type) ||
      (req.params.type === Env.APP_TYPE.BACKEND && user.type === Env.USER_TYPE.USER) ||
      (req.params.type === Env.APP_TYPE.FRONTEND && user.type !== Env.USER_TYPE.USER)
    ) {
      res.sendStatus(204)
    } else {
      const passwordMatch = await bcrypt.compare(req.body.password, user.password)

      if (passwordMatch) {
        const payload = { id: user._id }

        let options = { expiresIn: JWT_EXPIRE_AT }
        if (req.body.stayConnected) {
          options = {}
        }

        const token = jwt.sign(payload, JWT_SECRET, options)

        return res.status(200).send({
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          language: user.language,
          enableEmailNotifications: user.enableEmailNotifications,
          accessToken: token,
          blacklisted: user.blacklisted,
          avatar: user.avatar,
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

export async function pushToken(req, res) {
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

export async function createPushToken(req, res) {
  const { userId, token } = req.params

  try {
    const exist = await PushNotification.exists({ user: userId })

    if (!exist) {
      const pushNotification = new PushNotification({
        user: userId,
        token,
      })
      await pushNotification.save()
      return res.sendStatus(200)
    }

    return res.status(400).send('Push Token already exists.')
  } catch (err) {
    console.error(`[user.createPushToken] ${strings.DB_ERROR} ${userId}`, err)
    return res.status(400).send(strings.ERROR + err)
  }
}

export async function deletePushToken(req, res) {
  const { userId } = req.params

  try {
    await PushNotification.deleteMany({ user: userId })
    return res.sendStatus(200)
  } catch (err) {
    console.error(`[user.deletePushToken] ${strings.DB_ERROR} ${userId}`, err)
    return res.status(400).send(strings.ERROR + err)
  }
}

export async function validateEmail(req, res) {
  const { email } = req.body

  try {
    const exists = await User.exists({ email })

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

export async function confirmEmail(req, res) {
  try {
    const { token: _token, email: _email } = req.params
    const token = await Token.findOne({ token: _token })
    const user = await User.findOne({ email: _email })
    strings.setLanguage(user.language)
    // token is not found into database i.e. token may have expired
    if (!token) {
      console.error(strings.ACCOUNT_ACTIVATION_LINK_EXPIRED, req.params)
      return res.status(400).send(getStatusMessage(user.language, strings.ACCOUNT_ACTIVATION_LINK_EXPIRED))
    } else {
      // if token is found then check valid user
      // not valid user
      if (!user) {
        console.error('[user.confirmEmail] User not found', req.params)
        return res.status(401).send(getStatusMessage(user.language, strings.ACCOUNT_ACTIVATION_LINK_ERROR))
      } else if (user.verified) {
        // user is already verified
        return res.status(200).send(getStatusMessage(user.language, strings.ACCOUNT_ACTIVATION_ACCOUNT_VERIFIED))
      } else {
        // verify user
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

export async function resendLink(req, res) {
  const { email } = req.body

  try {
    const user = await User.findOne({ email })

    // user is not found into database
    if (!user) {
      console.error('[user.resendLink] User not found:', req.params)
      return res.status(400).send(getStatusMessage(DEFAULT_LANGUAGE, strings.ACCOUNT_ACTIVATION_RESEND_ERROR))
    } else if (user.verified) {
      // user has been already verified
      return res.status(200).send(getStatusMessage(user.language, strings.ACCOUNT_ACTIVATION_ACCOUNT_VERIFIED))
    } else {
      // send verification link
      // generate token and save
      const token = new Token({ user: user._id, token: uuid() })
      await token.save()

      // Send email
      strings.setLanguage(user.language)
      const mailOptions = {
        from: SMTP_FROM,
        to: user.email,
        subject: strings.ACCOUNT_ACTIVATION_SUBJECT,
        html:
          `<p>${strings.HELLO}${user.fullName},<br><br>
          ${strings.ACCOUNT_ACTIVATION_LINK}<br><br>
          http${HTTPS ? 's' : ''}://${req.headers.host}/api/confirm-email/${user.email}/${token.token}<br><br>
          ${strings.REGARDS}<br></p>`,
      }

      await Helper.sendMail(mailOptions)
      return res.status(200).send(getStatusMessage(user.language, strings.ACCOUNT_ACTIVATION_EMAIL_SENT_PART_1 + user.email + strings.ACCOUNT_ACTIVATION_EMAIL_SENT_PART_2))
    }
  } catch (err) {
    console.error(`[user.resendLink] ${strings.DB_ERROR} ${email}`, err)
    return res.status(400).send(strings.DB_ERROR + err)
  }
}

export async function update(req, res) {
  try {
    const { _id } = req.body
    const user = await User.findById(_id)
    if (!user) {
      console.error('[user.update] User not found:', req.body.email)
      return res.sendStatus(204)
    } else {
      const { fullName, phone, bio, location, type, birthDate, enableEmailNotifications, payLater } = req.body
      if (fullName) {
        user.fullName = fullName
      }
      user.phone = phone
      user.location = location
      user.bio = bio
      user.birthDate = birthDate
      if (type) {
        user.type = type
      }
      if (typeof enableEmailNotifications !== 'undefined') {
        user.enableEmailNotifications = enableEmailNotifications
      }
      if (typeof payLater !== 'undefined') {
        user.payLater = payLater
      }

      await user.save()
      return res.sendStatus(200)
    }
  } catch (err) {
    console.error(`[user.update] ${strings.DB_ERROR} ${req.body}`, err)
    return res.status(400).send(strings.DB_ERROR + err)
  }
}

export async function updateEmailNotifications(req, res) {
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

export async function updateLanguage(req, res) {
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

export async function getUser(req, res) {
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
      payLater: 1,
    }).lean()

    if (!user) {
      console.error('[user.getUser] User not found:', req.params)
      return res.sendStatus(204)
    } else {
      return res.json(user)
    }
  } catch (err) {
    console.error(`[user.getUser] ${strings.DB_ERROR} ${id}`, err)
    return res.status(400).send(strings.DB_ERROR + err)
  }
}

export async function createAvatar(req, res) {
  try {
    if (!(await Helper.exists(CDN_TEMP))) {
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

export async function updateAvatar(req, res) {
  const { userId } = req.params

  try {
    const user = await User.findById(userId)

    if (user) {
      if (!(await Helper.exists(CDN))) {
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

export async function deleteAvatar(req, res) {
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

export async function deleteTempAvatar(req, res) {
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

export async function changePassword(req, res) {
  const { _id, password: currentPassword, newPassword, strict } = req.body

  try {
    const user = await User.findOne({ _id })
    if (!user) {
      console.error('[user.changePassword] User not found:', _id)
      return res.sendStatus(204)
    }

    const _changePassword = async () => {
      const salt = await bcrypt.genSalt(10)
      const password = newPassword
      const passwordHash = await bcrypt.hash(password, salt)
      user.password = passwordHash
      await user.save()
      return res.sendStatus(200)
    }

    if (strict) {
      const passwordMatch = await bcrypt.compare(currentPassword, user.password)
      if (passwordMatch) {
        return _changePassword()
      } else {
        return res.sendStatus(204)
      }
    } else {
      return _changePassword()
    }
  } catch (err) {
    console.error(`[user.changePassword] ${strings.DB_ERROR} ${_id}`, err)
    return res.status(400).send(strings.ERROR + err)
  }
}

export async function checkPassword(req, res) {
  const { id, password } = req.params

  try {
    const user = await User.findById(id)
    if (user) {
      const passwordMatch = await bcrypt.compare(password, user.password)
      if (passwordMatch) {
        return res.sendStatus(200)
      } else {
        return res.sendStatus(204)
      }
    } else {
      console.error('[user.checkPassword] User not found:', id)
      return res.sendStatus(204)
    }
  } catch (err) {
    console.error(`[user.checkPassword] ${strings.DB_ERROR} ${id}`, err)
    return res.status(400).send(strings.ERROR + err)
  }
}

export async function getUsers(req, res) {
  try {
    const keyword = escapeStringRegexp(req.query.s || '')
    const options = 'i'
    const page = Number.parseInt(req.params.page)
    const size = Number.parseInt(req.params.size)
    const types = req.body.types
    const userId = req.body.user

    const $match = {
      $and: [
        {
          type: { $in: types },
        },
        {
          fullName: { $regex: keyword, $options: options },
        },
      ],
    }

    if (userId) {
      $match.$and.push({ _id: { $ne: new mongoose.Types.ObjectId(userId) } })
    }

    const users = await User.aggregate(
      [
        {
          $match,
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
            birthDate: 1,
          },
        },
        {
          $facet: {
            resultData: [{ $sort: { fullName: 1 } }, { $skip: (page - 1) * size }, { $limit: size }],
            pageInfo: [
              {
                $count: 'totalRecords',
              },
            ],
          },
        },
      ],
      { collation: { locale: Env.DEFAULT_LANGUAGE, strength: 2 } },
    )

    return res.json(users)
  } catch (err) {
    console.error(`[user.getUsers] ${strings.DB_ERROR}`, err)
    return res.status(400).send(strings.DB_ERROR + err)
  }
}

export async function deleteUsers(req, res) {
  try {
    const ids = req.body.map((id) => new mongoose.Types.ObjectId(id))

    for (const id of ids) {
      const user = await User.findByIdAndDelete(id)
      if (user.avatar) {
        const avatar = path.join(CDN, user.avatar)
        if (await Helper.exists(avatar)) {
          await fs.unlink(avatar)
        }
      }

      if (user.type === Env.USER_TYPE.COMPANY) {
        const additionalDrivers = (await Booking.find({ company: id, _additionalDriver: { $ne: null } }, { _id: 0, _additionalDriver: 1 })).map((b) => b._additionalDriver)
        await AdditionalDriver.deleteMany({ _id: { $in: additionalDrivers } })
        await Booking.deleteMany({ company: id })
        const cars = await Car.find({ company: id })
        await Car.deleteMany({ company: id })
        for (const car of cars) {
          const image = path.join(CDN_CARS, car.image)
          if (await Helper.exists(image)) {
            await fs.unlink(image)
          }
        }
      } else if (user.type === Env.USER_TYPE.USER) {
        await Booking.deleteMany({ driver: id })
      }
      await Notification.deleteMany({ user: id })
    }

    return res.sendStatus(200)
  } catch (err) {
    console.error(`[user.delete] ${strings.DB_ERROR} ${req.body}`, err)
    return res.status(400).send(strings.DB_ERROR + err)
  }
}
