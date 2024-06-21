import path from 'node:path'
import fs from 'node:fs/promises'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { v1 as uuid } from 'uuid'
import escapeStringRegexp from 'escape-string-regexp'
import mongoose from 'mongoose'
import { CookieOptions, Request, Response } from 'express'
import nodemailer from 'nodemailer'
import axios from 'axios'
import * as bookcarsTypes from ':bookcars-types'
import i18n from '../lang/i18n'
import * as env from '../config/env.config'
import User from '../models/User'
import Booking from '../models/Booking'
import Token from '../models/Token'
import PushToken from '../models/PushToken'
import * as helper from '../common/helper'
import * as authHelper from '../common/authHelper'
import * as mailHelper from '../common/mailHelper'
import Notification from '../models/Notification'
import NotificationCounter from '../models/NotificationCounter'
import Car from '../models/Car'
import AdditionalDriver from '../models/AdditionalDriver'
import * as logger from '../common/logger'

/**
 * Get status message as HTML.
 *
 * @param {string} lang
 * @param {string} msg
 * @returns {string}
 */
const getStatusMessage = (lang: string, msg: string) => (
  `<!DOCTYPE html><html lang="'${lang}'"><head></head><body><p>${msg}</p></body></html>`
)

/**
 * Sign Up.
 *
 * @async
 * @param {Request} req
 * @param {Response} res
 * @param {bookcarsTypes.UserType} userType
 * @returns {unknown}
 */
const _signup = async (req: Request, res: Response, userType: bookcarsTypes.UserType) => {
  const { body }: { body: bookcarsTypes.SignUpPayload } = req

  //
  // Create user
  //
  let user: env.User
  try {
    body.email = helper.trim(body.email, ' ')
    body.active = true
    body.verified = false
    body.blacklisted = false
    body.type = userType

    const salt = await bcrypt.genSalt(10)
    const { password } = body
    const passwordHash = await bcrypt.hash(password, salt)
    body.password = passwordHash

    user = new User(body)
    await user.save()

    if (body.avatar) {
      const avatar = path.join(env.CDN_TEMP_USERS, body.avatar)
      if (await helper.exists(avatar)) {
        const filename = `${user._id}_${Date.now()}${path.extname(body.avatar)}`
        const newPath = path.join(env.CDN_USERS, filename)

        await fs.rename(avatar, newPath)
        user.avatar = filename
        await user.save()
      }
    }
  } catch (err) {
    logger.error(`[user.signup] ${i18n.t('DB_ERROR')} ${JSON.stringify(body)}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }

  //
  // Send confirmation email
  //
  try {
    // generate token and save
    const token = new Token({ user: user._id, token: helper.generateToken() })

    await token.save()

    // Send email
    i18n.locale = user.language

    const mailOptions: nodemailer.SendMailOptions = {
      from: env.SMTP_FROM,
      to: user.email,
      subject: i18n.t('ACCOUNT_ACTIVATION_SUBJECT'),
      html:
        `<p>
    ${i18n.t('HELLO')}${user.fullName},<br><br>
    ${i18n.t('ACCOUNT_ACTIVATION_LINK')}<br><br>
    http${env.HTTPS ? 's' : ''}://${req.headers.host}/api/confirm-email/${user.email}/${token.token}<br><br>
    ${i18n.t('REGARDS')}<br>
    </p>`,
    }
    await mailHelper.sendMail(mailOptions)
    return res.sendStatus(200)
  } catch (err) {
    try {
      //
      // Delete user in case of smtp failure
      //
      await user.deleteOne()
    } catch (deleteErr) {
      logger.error(`[user.signup] ${i18n.t('DB_ERROR')} ${JSON.stringify(body)}`, deleteErr)
    }
    logger.error(`[user.signup] ${i18n.t('SMTP_ERROR')}`, err)
    return res.status(400).send(i18n.t('SMTP_ERROR') + err)
  }
}

/**
 * Frontend Sign Up.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 */
export const signup = async (req: Request, res: Response) => {
  await _signup(req, res, bookcarsTypes.UserType.User)
}

/**
 * Backend Sign Up.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 */
export const adminSignup = async (req: Request, res: Response) => {
  await _signup(req, res, bookcarsTypes.UserType.Admin)
}

/**
 * Create a User.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const create = async (req: Request, res: Response) => {
  const { body }: { body: bookcarsTypes.CreateUserPayload } = req

  try {
    body.verified = false
    body.blacklisted = false

    if (body.password) {
      const salt = await bcrypt.genSalt(10)
      const { password } = body
      const passwordHash = await bcrypt.hash(password, salt)
      body.password = passwordHash
    }

    const user = new User(body)
    await user.save()

    // avatar
    if (body.avatar) {
      const avatar = path.join(env.CDN_TEMP_USERS, body.avatar)
      if (await helper.exists(avatar)) {
        const filename = `${user._id}_${Date.now()}${path.extname(body.avatar)}`
        const newPath = path.join(env.CDN_USERS, filename)

        await fs.rename(avatar, newPath)
        user.avatar = filename
        await user.save()
      }
    }

    if (body.password) {
      return res.sendStatus(200)
    }

    // generate token and save
    const token = new Token({ user: user._id, token: helper.generateToken() })
    await token.save()

    // Send email
    i18n.locale = user.language

    const mailOptions: nodemailer.SendMailOptions = {
      from: env.SMTP_FROM,
      to: user.email,
      subject: i18n.t('ACCOUNT_ACTIVATION_SUBJECT'),
      html:
        `<p>
        ${i18n.t('HELLO')}${user.fullName},<br><br>
        ${i18n.t('ACCOUNT_ACTIVATION_LINK')}<br><br>
        ${helper.joinURL(
          user.type === bookcarsTypes.UserType.User ? env.FRONTEND_HOST : env.BACKEND_HOST,
          'activate',
        )}/?u=${encodeURIComponent(user.id)}&e=${encodeURIComponent(user.email)}&t=${encodeURIComponent(token.token)}<br><br>
        ${i18n.t('REGARDS')}<br>
        </p>`,
    }

    await mailHelper.sendMail(mailOptions)
    return res.sendStatus(200)
  } catch (err) {
    logger.error(`[user.create] ${i18n.t('DB_ERROR')} ${JSON.stringify(body)}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Check a Validation Token.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const checkToken = async (req: Request, res: Response) => {
  const { userId, email } = req.params

  try {
    const user = await User.findOne({
      _id: new mongoose.Types.ObjectId(userId),
      email,
    })

    if (user) {
      const type = req.params.type.toLowerCase() as bookcarsTypes.AppType

      if (
        ![bookcarsTypes.AppType.Frontend, bookcarsTypes.AppType.Backend].includes(type)
        || (type === bookcarsTypes.AppType.Backend && user.type === bookcarsTypes.UserType.User)
        || (type === bookcarsTypes.AppType.Frontend && user.type !== bookcarsTypes.UserType.User)
        || user.active
      ) {
        return res.sendStatus(204)
      }

      const token = await Token.findOne({
        user: new mongoose.Types.ObjectId(userId),
        token: req.params.token,
      })

      if (token) {
        return res.sendStatus(200)
      }

      return res.sendStatus(204)
    }

    return res.sendStatus(204)
  } catch (err) {
    logger.error(`[user.checkToken] ${i18n.t('DB_ERROR')} ${JSON.stringify(req.params)}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Delete Validation Tokens.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const deleteTokens = async (req: Request, res: Response) => {
  const { userId } = req.params

  try {
    const result = await Token.deleteMany({
      user: new mongoose.Types.ObjectId(userId),
    })

    if (result.deletedCount > 0) {
      return res.sendStatus(200)
    }

    return res.sendStatus(400)
  } catch (err) {
    logger.error(`[user.deleteTokens] ${i18n.t('DB_ERROR')} ${userId}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Resend Validation email.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const resend = async (req: Request, res: Response) => {
  const { email } = req.params

  try {
    if (!helper.isValidEmail(email)) {
      throw new Error('email is not valid')
    }
    const user = await User.findOne({ email })

    if (user) {
      const type = req.params.type.toLowerCase() as bookcarsTypes.AppType

      if (
        ![bookcarsTypes.AppType.Frontend, bookcarsTypes.AppType.Backend].includes(type)
        || (type === bookcarsTypes.AppType.Backend && user.type === bookcarsTypes.UserType.User)
        || (type === bookcarsTypes.AppType.Frontend && user.type !== bookcarsTypes.UserType.User)
      ) {
        return res.sendStatus(403)
      }
      user.active = false
      await user.save()

      // generate token and save
      const token = new Token({ user: user._id, token: helper.generateToken() })
      await token.save()

      // Send email
      i18n.locale = user.language

      const reset = req.params.reset === 'true'

      const mailOptions: nodemailer.SendMailOptions = {
        from: env.SMTP_FROM,
        to: user.email,
        subject: reset ? i18n.t('PASSWORD_RESET_SUBJECT') : i18n.t('ACCOUNT_ACTIVATION_SUBJECT'),
        html:
          `<p>
          ${i18n.t('HELLO')}${user.fullName},<br><br>  
          ${reset ? i18n.t('PASSWORD_RESET_LINK') : i18n.t('ACCOUNT_ACTIVATION_LINK')}<br><br>  
          ${helper.joinURL(
            user.type === bookcarsTypes.UserType.User ? env.FRONTEND_HOST : env.BACKEND_HOST,
            reset ? 'reset-password' : 'activate',
          )}/?u=${encodeURIComponent(user.id)}&e=${encodeURIComponent(user.email)}&t=${encodeURIComponent(token.token)}<br><br>
          ${i18n.t('REGARDS')}<br>
          </p>`,
      }

      await mailHelper.sendMail(mailOptions)
      return res.sendStatus(200)
    }

    return res.sendStatus(204)
  } catch (err) {
    logger.error(`[user.resend] ${i18n.t('DB_ERROR')} ${email}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Activate a User and set his Password.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const activate = async (req: Request, res: Response) => {
  const { body }: { body: bookcarsTypes.ActivatePayload } = req
  const { userId } = body

  try {
    if (!helper.isValidObjectId(userId)) {
      throw new Error('body.userId is not valid')
    }

    const user = await User.findById(userId)

    if (user) {
      const token = await Token.findOne({ user: userId, token: body.token })

      if (token) {
        const salt = await bcrypt.genSalt(10)
        const { password } = body
        const passwordHash = await bcrypt.hash(password, salt)
        user.password = passwordHash

        user.active = true
        user.verified = true
        await user.save()

        return res.sendStatus(200)
      }
    }

    return res.sendStatus(204)
  } catch (err) {
    logger.error(`[user.activate] ${i18n.t('DB_ERROR')} ${userId}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Sign In.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const signin = async (req: Request, res: Response) => {
  const { body }: { body: bookcarsTypes.SignInPayload } = req
  const { email: emailFromBody, password, stayConnected, mobile } = body
  const email = helper.trim(emailFromBody, ' ')

  try {
    if (!helper.isValidEmail(email)) {
      throw new Error('body.email is not valid')
    }

    const user = await User.findOne({ email })
    const type = req.params.type.toLowerCase() as bookcarsTypes.AppType

    if (
      !password
      || !user
      || !user.password
      || ![bookcarsTypes.AppType.Frontend, bookcarsTypes.AppType.Backend].includes(type)
      || (type === bookcarsTypes.AppType.Backend && user.type === bookcarsTypes.UserType.User)
      || (type === bookcarsTypes.AppType.Frontend && user.type !== bookcarsTypes.UserType.User)
    ) {
      return res.sendStatus(204)
    }
    const passwordMatch = await bcrypt.compare(password, user.password)

    if (passwordMatch) {
      const payload = { id: user._id }

      let options: { expiresIn?: number }
      //
      // On production, authentication cookies are httpOnly, signed, secure and strict sameSite.
      // These options prevent XSS, CSRF and MITM attacks.
      // Authentication cookies are protected against XST attacks as well via allowedMethods middleware.
      //
      const cookieOptions: CookieOptions = helper.clone(env.COOKIE_OPTIONS)

      if (stayConnected) {
        //
        // Empty JWT options object will result in no expiration.
        //
        options = {}
        //
        // Cookies can no longer set an expiration date more than 400 days in the future.
        // The limit MUST NOT be greater than 400 days in duration.
        // The RECOMMENDED limit is 400 days in duration, but the user agent MAY adjust the
        // limit to be less.
        //
        cookieOptions.maxAge = 400 * 24 * 60 * 60 * 1000
      } else {
        //
        // JWT expiration is set in seconds.
        //
        options = { expiresIn: env.JWT_EXPIRE_AT }
        //
        // Cookie maxAge option is set in milliseconds.
        //
        cookieOptions.maxAge = env.JWT_EXPIRE_AT * 1000
      }

      const token = jwt.sign(payload, env.JWT_SECRET, options)

      const loggedUser: bookcarsTypes.User = {
        _id: user.id,
        email: user.email,
        fullName: user.fullName,
        language: user.language,
        enableEmailNotifications: user.enableEmailNotifications,
        blacklisted: user.blacklisted,
        avatar: user.avatar,
      }

      //
      // On mobile, we return the token in the response body.
      //
      if (mobile) {
        loggedUser.accessToken = token

        return res
          .status(200)
          .send(loggedUser)
      }

      //
      // On web, we return the token in a httpOnly, signed, secure and strict sameSite cookie.
      //
      const cookieName = authHelper.getAuthCookieName(req)

      return res
        .clearCookie(cookieName)
        .cookie(cookieName, token, cookieOptions)
        .status(200)
        .send(loggedUser)
    }

    return res.sendStatus(204)
  } catch (err) {
    logger.error(`[user.signin] ${i18n.t('DB_ERROR')} ${email}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Sign out.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const signout = async (req: Request, res: Response) => {
  const cookieName = authHelper.getAuthCookieName(req)

  return res
    .clearCookie(cookieName)
    .sendStatus(200)
}

/**
 * Get Push Notification Token.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getPushToken = async (req: Request, res: Response) => {
  const { userId } = req.params

  try {
    if (!helper.isValidObjectId(userId)) {
      throw new Error('userId is not valid')
    }

    const pushToken = await PushToken.findOne({ user: userId })
    if (pushToken) {
      return res.json(pushToken.token)
    }

    return res.sendStatus(204)
  } catch (err) {
    logger.error(`[user.pushToken] ${i18n.t('DB_ERROR')} ${userId}`, err)
    return res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Create Push Notification Token.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const createPushToken = async (req: Request, res: Response) => {
  const { userId, token } = req.params

  try {
    if (!helper.isValidObjectId(userId)) {
      throw new Error('userId is not valid')
    }

    const exist = await PushToken.exists({ user: userId })

    if (!exist) {
      const pushToken = new PushToken({
        user: userId,
        token,
      })
      await pushToken.save()
      return res.sendStatus(200)
    }

    return res.status(400).send('Push Token already exists.')
  } catch (err) {
    logger.error(`[user.createPushToken] ${i18n.t('DB_ERROR')} ${userId}`, err)
    return res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Delete Push Notification Token.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const deletePushToken = async (req: Request, res: Response) => {
  const { userId } = req.params

  try {
    if (!helper.isValidObjectId(userId)) {
      throw new Error('userId is not valid')
    }

    await PushToken.deleteMany({ user: userId })
    return res.sendStatus(200)
  } catch (err) {
    logger.error(`[user.deletePushToken] ${i18n.t('DB_ERROR')} ${userId}`, err)
    return res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Validate email.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const validateEmail = async (req: Request, res: Response) => {
  const { body }: { body: bookcarsTypes.ValidateEmailPayload } = req
  const { email } = body

  try {
    if (!helper.isValidEmail(email)) {
      throw new Error('body.email is not valid')
    }

    const exists = await User.exists({ email })

    if (exists) {
      return res.sendStatus(204)
    }

    // email does not exist in db (can be added)
    return res.sendStatus(200)
  } catch (err) {
    logger.error(`[user.validateEmail] ${i18n.t('DB_ERROR')} ${email}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Validate JWT token.
 *
 * @param {Request} req
 * @param {Response} res
 * @returns {*}
 */
export const validateAccessToken = async (req: Request, res: Response) => res.sendStatus(200)

/**
 * Get Validation result as HTML.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const confirmEmail = async (req: Request, res: Response) => {
  try {
    const { token: _token, email: _email } = req.params

    if (!helper.isValidEmail(_email)) {
      throw new Error('email is not valid')
    }

    const user = await User.findOne({ email: _email })

    if (!user) {
      logger.error('[user.confirmEmail] User not found', req.params)
      return res.status(204).send(i18n.t('ACCOUNT_ACTIVATION_LINK_ERROR'))
    }

    i18n.locale = user.language
    const token = await Token.findOne({ user: user._id, token: _token })

    // token is not found into database i.e. token may have expired
    if (!token) {
      logger.error(i18n.t('ACCOUNT_ACTIVATION_LINK_EXPIRED'), req.params)
      return res.status(400).send(getStatusMessage(user.language, i18n.t('ACCOUNT_ACTIVATION_LINK_EXPIRED')))
    }

    // if token is found then check valid user
    // not valid user
    if (user.verified) {
      // user is already verified
      return res.status(200).send(getStatusMessage(user.language, i18n.t('ACCOUNT_ACTIVATION_ACCOUNT_VERIFIED')))
    }

    // verify user
    // change verified to true
    user.verified = true
    user.verifiedAt = new Date()
    await user.save()
    return res.status(200).send(getStatusMessage(user.language, i18n.t('ACCOUNT_ACTIVATION_SUCCESS')))
  } catch (err) {
    logger.error(`[user.confirmEmail] ${i18n.t('DB_ERROR')} ${JSON.stringify(req.params)}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Resend Validation email.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const resendLink = async (req: Request, res: Response) => {
  const { body }: { body: bookcarsTypes.ResendLinkPayload } = req
  const { email } = body

  try {
    if (!email || !helper.isValidEmail(email)) {
      throw new Error('email is not valid')
    }

    const user = await User.findOne({ email })

    // user is not found into database
    if (!user) {
      logger.error('[user.resendLink] User not found:', email)
      return res.status(400).send(getStatusMessage(env.DEFAULT_LANGUAGE, i18n.t('ACCOUNT_ACTIVATION_RESEND_ERROR')))
    }

    if (user.verified) {
      // user has been already verified
      return res.status(200).send(getStatusMessage(user.language, i18n.t('ACCOUNT_ACTIVATION_ACCOUNT_VERIFIED')))
    }

    // send verification link
    // generate token and save
    const token = new Token({ user: user._id, token: helper.generateToken() })
    await token.save()

    // Send email
    i18n.locale = user.language
    const mailOptions: nodemailer.SendMailOptions = {
      from: env.SMTP_FROM,
      to: user.email,
      subject: i18n.t('ACCOUNT_ACTIVATION_SUBJECT'),
      html:
        `<p>
        ${i18n.t('HELLO')}${user.fullName},<br><br>
        ${i18n.t('ACCOUNT_ACTIVATION_LINK')}<br><br>
        http${env.HTTPS ? 's' : ''}://${req.headers.host}/api/confirm-email/${user.email}/${token.token}<br><br>
        ${i18n.t('REGARDS')}<br>
        </p>`,
    }

    await mailHelper.sendMail(mailOptions)
    return res
      .status(200)
      .send(getStatusMessage(user.language, i18n.t('ACCOUNT_ACTIVATION_EMAIL_SENT_PART_1') + user.email + i18n.t('ACCOUNT_ACTIVATION_EMAIL_SENT_PART_2')))
  } catch (err) {
    logger.error(`[user.resendLink] ${i18n.t('DB_ERROR')} ${email}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Update User.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const update = async (req: Request, res: Response) => {
  try {
    const { body }: { body: bookcarsTypes.UpdateUserPayload } = req
    const { _id } = body

    if (!helper.isValidObjectId(_id)) {
      throw new Error('User id is not valid')
    }

    const user = await User.findById(_id)

    if (!user) {
      logger.error('[user.update] User not found:', body.email)
      return res.sendStatus(204)
    }

    const {
      fullName,
      phone,
      bio,
      location,
      type,
      birthDate,
      enableEmailNotifications,
      payLater,
    } = body

    if (fullName) {
      user.fullName = fullName
    }
    user.phone = phone
    user.location = location
    user.bio = bio
    user.birthDate = birthDate ? new Date(birthDate) : undefined
    if (type) {
      user.type = type as bookcarsTypes.UserType
    }
    if (typeof enableEmailNotifications !== 'undefined') {
      user.enableEmailNotifications = enableEmailNotifications
    }
    if (typeof payLater !== 'undefined') {
      user.payLater = payLater
    }

    await user.save()
    return res.sendStatus(200)
  } catch (err) {
    logger.error(`[user.update] ${i18n.t('DB_ERROR')} ${JSON.stringify(req.body)}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Update email notifications setting.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const updateEmailNotifications = async (req: Request, res: Response) => {
  const { body }: { body: bookcarsTypes.UpdateEmailNotificationsPayload } = req

  try {
    const { _id } = body

    if (!helper.isValidObjectId(_id)) {
      throw new Error('User id is not valid')
    }

    const user = await User.findById(_id)

    if (!user) {
      logger.error('[user.updateEmailNotifications] User not found:', body)
      return res.sendStatus(204)
    }

    const { enableEmailNotifications } = body
    user.enableEmailNotifications = enableEmailNotifications
    await user.save()

    return res.sendStatus(200)
  } catch (err) {
    logger.error(`[user.updateEmailNotifications] ${i18n.t('DB_ERROR')} ${JSON.stringify(body)}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Update language.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const updateLanguage = async (req: Request, res: Response) => {
  try {
    const { body }: { body: bookcarsTypes.UpdateLanguagePayload } = req
    const { id, language } = body

    if (!helper.isValidObjectId(id)) {
      throw new Error('User id is not valid')
    }

    const user = await User.findById(id)
    if (!user) {
      logger.error('[user.updateLanguage] User not found:', id)
      return res.sendStatus(204)
    }

    user.language = language
    await user.save()
    return res.sendStatus(200)
  } catch (err) {
    logger.error(`[user.updateLanguage] ${i18n.t('DB_ERROR')} ${JSON.stringify(req.body)}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Get User by ID.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getUser = async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    if (!helper.isValidObjectId(id)) {
      throw new Error('User id is not valid')
    }

    const user = await User.findById(id, {
      supplier: 1,
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
      customerId: 1,
    }).lean()

    if (!user) {
      logger.error('[user.getUser] User not found:', req.params)
      return res.sendStatus(204)
    }

    return res.json(user)
  } catch (err) {
    logger.error(`[user.getUser] ${i18n.t('DB_ERROR')} ${id}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Upload avatar to temp folder.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const createAvatar = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      throw new Error('[user.createAvatar] req.file not found')
    }

    const filename = `${helper.getFilenameWithoutExtension(req.file.originalname)}_${uuid()}_${Date.now()}${path.extname(req.file.originalname)}`
    const filepath = path.join(env.CDN_TEMP_USERS, filename)

    await fs.writeFile(filepath, req.file.buffer)
    return res.json(filename)
  } catch (err) {
    logger.error(`[user.createAvatar] ${i18n.t('DB_ERROR')}`, err)
    return res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Update avatar.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const updateAvatar = async (req: Request, res: Response) => {
  const { userId } = req.params

  try {
    if (!req.file) {
      const msg = 'req.file not found'
      logger.error(`[user.createAvatar] ${msg}`)
      return res.status(400).send(msg)
    }

    const user = await User.findById(userId)

    if (user) {
      if (user.avatar) {
        const avatar = path.join(env.CDN_USERS, user.avatar)

        if (await helper.exists(avatar)) {
          await fs.unlink(avatar)
        }
      }

      const filename = `${user._id}_${Date.now()}${path.extname(req.file.originalname)}`
      const filepath = path.join(env.CDN_USERS, filename)

      await fs.writeFile(filepath, req.file.buffer)
      user.avatar = filename
      await user.save()
      return res.json(filename)
    }

    logger.error('[user.updateAvatar] User not found:', userId)
    return res.sendStatus(204)
  } catch (err) {
    logger.error(`[user.updateAvatar] ${i18n.t('DB_ERROR')} ${userId}`, err)
    return res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Delete avatar.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const deleteAvatar = async (req: Request, res: Response) => {
  const { userId } = req.params

  try {
    const user = await User.findById(userId)

    if (user) {
      if (user.avatar) {
        const avatar = path.join(env.CDN_USERS, user.avatar)
        if (await helper.exists(avatar)) {
          await fs.unlink(avatar)
        }
      }
      user.avatar = undefined

      await user.save()
      return res.sendStatus(200)
    }

    logger.error('[user.deleteAvatar] User not found:', userId)
    return res.sendStatus(204)
  } catch (err) {
    logger.error(`[user.deleteAvatar] ${i18n.t('DB_ERROR')} ${userId}`, err)
    return res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Delete temp avatar.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const deleteTempAvatar = async (req: Request, res: Response) => {
  const { avatar } = req.params

  try {
    const avatarFile = path.join(env.CDN_TEMP_USERS, avatar)
    if (!await helper.exists(avatarFile)) {
      throw new Error(`[user.deleteTempAvatar] temp avatar ${avatarFile} not found`)
    }

    await fs.unlink(avatarFile)

    return res.sendStatus(200)
  } catch (err) {
    logger.error(`[user.deleteTempAvatar] ${i18n.t('DB_ERROR')} ${avatar}`, err)
    return res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Change password.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const changePassword = async (req: Request, res: Response) => {
  const { body }: { body: bookcarsTypes.ChangePasswordPayload } = req
  const {
    _id,
    password: currentPassword,
    newPassword,
    strict,
  } = body

  try {
    if (!helper.isValidObjectId(_id)) {
      throw new Error('User id is not valid')
    }

    const user = await User.findOne({ _id })
    if (!user) {
      logger.error('[user.changePassword] User not found:', _id)
      return res.sendStatus(204)
    }

    if (!user.password) {
      logger.error('[user.changePassword] User.password not found:', _id)
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
      }

      return res.sendStatus(204)
    }

    return _changePassword()
  } catch (err) {
    logger.error(`[user.changePassword] ${i18n.t('DB_ERROR')} ${_id}`, err)
    return res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Check password.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const checkPassword = async (req: Request, res: Response) => {
  const { id, password } = req.params

  try {
    if (!helper.isValidObjectId(id)) {
      throw new Error('User id is not valid')
    }

    const user = await User.findById(id)
    if (user) {
      if (!user.password) {
        logger.error('[user.changePassword] User.password not found')
        return res.sendStatus(204)
      }

      const passwordMatch = await bcrypt.compare(password, user.password)
      if (passwordMatch) {
        return res.sendStatus(200)
      }

      return res.sendStatus(204)
    }

    logger.error('[user.checkPassword] User not found:', id)
    return res.sendStatus(204)
  } catch (err) {
    logger.error(`[user.checkPassword] ${i18n.t('DB_ERROR')} ${id}`, err)
    return res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Get Users.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getUsers = async (req: Request, res: Response) => {
  try {
    const keyword = escapeStringRegexp(String(req.query.s || ''))
    const options = 'i'
    const page = Number.parseInt(req.params.page, 10)
    const size = Number.parseInt(req.params.size, 10)
    const { body }: { body: bookcarsTypes.GetUsersBody } = req
    const { types, user: userId } = body

    const $match: mongoose.FilterQuery<any> = {
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
      $match.$and!.push({ _id: { $ne: new mongoose.Types.ObjectId(userId) } })
    }

    const users = await User.aggregate(
      [
        {
          $match,
        },
        {
          $project: {
            supplier: 1,
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
            customerId: 1,
          },
        },
        {
          $facet: {
            resultData: [{ $sort: { fullName: 1, _id: 1 } }, { $skip: (page - 1) * size }, { $limit: size }],
            pageInfo: [
              {
                $count: 'totalRecords',
              },
            ],
          },
        },
      ],
      { collation: { locale: env.DEFAULT_LANGUAGE, strength: 2 } },
    )

    return res.json(users)
  } catch (err) {
    logger.error(`[user.getUsers] ${i18n.t('DB_ERROR')}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Delete Users.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const deleteUsers = async (req: Request, res: Response) => {
  try {
    const { body }: { body: string[] } = req
    const ids: mongoose.Types.ObjectId[] = body.map((id: string) => new mongoose.Types.ObjectId(id))

    for (const id of ids) {
      const user = await User.findById(id)

      if (user) {
        await User.deleteOne({ _id: id })

        if (user.avatar) {
          const avatar = path.join(env.CDN_USERS, user.avatar)
          if (await helper.exists(avatar)) {
            await fs.unlink(avatar)
          }
        }

        if (user.type === bookcarsTypes.UserType.Supplier) {
          const additionalDrivers = (await Booking.find({ supplier: id, _additionalDriver: { $ne: null } }, { _id: 0, _additionalDriver: 1 })).map((b) => b._additionalDriver)
          await AdditionalDriver.deleteMany({ _id: { $in: additionalDrivers } })
          await Booking.deleteMany({ supplier: id })
          const cars = await Car.find({ supplier: id })
          await Car.deleteMany({ supplier: id })
          for (const car of cars) {
            if (car.image) {
              const image = path.join(env.CDN_CARS, car.image)
              if (await helper.exists(image)) {
                await fs.unlink(image)
              }
            }
          }
        } else if (user.type === bookcarsTypes.UserType.User) {
          await Booking.deleteMany({ driver: id })
        }
        await NotificationCounter.deleteMany({ user: id })
        await Notification.deleteMany({ user: id })
      } else {
        logger.error('User not found:', id)
      }
    }

    return res.sendStatus(200)
  } catch (err) {
    logger.error(`[user.delete] ${i18n.t('DB_ERROR')} ${JSON.stringify(req.body)}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Validate Google reCAPTCHA v3 token.
 *
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const verifyRecaptcha = async (req: Request, res: Response) => {
  try {
    const { token, ip } = req.params
    const result = await axios.get(`https://www.google.com/recaptcha/api/siteverify?secret=${encodeURIComponent(env.RECAPTCHA_SECRET)}&response=${encodeURIComponent(token)}&remoteip=${ip}`)
    const { success } = result.data

    if (success) {
      return res.sendStatus(200)
    }
    return res.sendStatus(204)
  } catch (err) {
    logger.error(`[user.delete] ${i18n.t('DB_ERROR')} ${JSON.stringify(req.body)}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Send an email. reCAPTCHA is mandatory.
 *
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const sendEmail = async (req: Request, res: Response) => {
  try {
    const { body }: { body: bookcarsTypes.SendEmailPayload } = req
    const { from, to, subject, message, recaptchaToken: token, ip } = body
    const result = await axios.get(`https://www.google.com/recaptcha/api/siteverify?secret=${encodeURIComponent(env.RECAPTCHA_SECRET)}&response=${encodeURIComponent(token)}&remoteip=${ip}`)
    const { success } = result.data

    if (!success) {
      return res.sendStatus(400)
    }

    const mailOptions: nodemailer.SendMailOptions = {
      from: env.SMTP_FROM,
      to,
      subject: i18n.t('CONTACT_SUBJECT'),
      html:
        `<p>
              ${i18n.t('FROM')}: ${from}<br>
              ${i18n.t('SUBJECT')}: ${subject}<br>
              ${i18n.t('MESSAGE')}:<br>${message.replace(/(?:\r\n|\r|\n)/g, '<br>')}<br>
         </p>`,
    }
    await mailHelper.sendMail(mailOptions)

    return res.sendStatus(200)
  } catch (err) {
    logger.error(`[user.delete] ${i18n.t('DB_ERROR')} ${JSON.stringify(req.body)}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}
