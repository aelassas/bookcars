import path from 'node:path'
import asyncFs from 'node:fs/promises'
import bcrypt from 'bcrypt'
import { nanoid } from 'nanoid'
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
import * as helper from '../utils/helper'
import * as authHelper from '../utils/authHelper'
import * as mailHelper from '../utils/mailHelper'
import Notification from '../models/Notification'
import NotificationCounter from '../models/NotificationCounter'
import Car from '../models/Car'
import AdditionalDriver from '../models/AdditionalDriver'
import * as logger from '../utils/logger'

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

    const { password } = body
    const passwordHash = await authHelper.hashPassword(password)
    body.password = passwordHash

    user = new User(body)
    await user.save()

    // avatar
    if (body.avatar) {
      // -----------------------------
      // 1️. Sanitize filename
      // -----------------------------
      const safeAvatar = path.basename(body.avatar)

      // If basename changed it, it's a traversal attempt
      if (safeAvatar !== body.avatar) {
        logger.warn(`[user.signup] Directory traversal attempt (avatar): ${body.avatar}`)
        res.status(400).send('Invalid avatar filename')
        return
      }

      const tempDir = path.resolve(env.CDN_TEMP_USERS)
      const usersDir = path.resolve(env.CDN_USERS)

      const avatarPath = path.resolve(tempDir, safeAvatar)

      // -----------------------------
      // 2️. Ensure source is inside temp directory
      // -----------------------------
      if (!avatarPath.startsWith(tempDir + path.sep)) {
        logger.warn(`[user.signup] Avatar source path escape attempt: ${avatarPath}`)
        res.status(400).send('Invalid avatar path')
        return
      }

      if (await helper.pathExists(avatarPath)) {
        const ext = path.extname(safeAvatar)

        // security check: restrict allowed extensions
        if (!env.allowedImageExtensions.includes(ext.toLowerCase())) {
          res.status(400).send('Invalid avatar file type')
          return
        }

        const filename = `${user._id}_${Date.now()}${ext}`
        const newPath = path.resolve(usersDir, filename)

        // -----------------------------
        // 3. Ensure destination is inside users directory
        // -----------------------------
        if (!newPath.startsWith(usersDir + path.sep)) {
          logger.warn(`[user.signup] Avatar destination path escape attempt: ${newPath}`)
          res.status(400).send('Invalid avatar destination')
          return
        }

        await asyncFs.rename(avatarPath, newPath)

        user.avatar = filename
        await user.save()
      }
    }
  } catch (err) {
    logger.error(`[user.signup] ${i18n.t('ERROR')} ${JSON.stringify(body)}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
    return
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

    const activationLink = `http${env.HTTPS ? 's' : ''}://${req.headers.host}/api/confirm-email/${user.email}/${token.token}`

    const mailOptions: nodemailer.SendMailOptions = {
      from: env.SMTP_FROM,
      to: user.email,
      subject: i18n.t('ACCOUNT_ACTIVATION_SUBJECT'),
      html:
        `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <p style="font-size: 16px; color: #555;">
            ${i18n.t('HELLO')} ${user.fullName},<br><br>
            ${i18n.t('ACCOUNT_ACTIVATION_LINK')}<br><br>
            <a href="${activationLink}" target="_blank">${activationLink}</a><br><br>
            ${i18n.t('REGARDS')}<br>
          </p>
        </div>`,
    }
    await mailHelper.sendMail(mailOptions)
    res.sendStatus(200)
  } catch (err) {
    try {
      //
      // Delete user in case of smtp failure
      //
      await Token.deleteMany({ user: user._id.toString() })
      await user.deleteOne()
    } catch (deleteErr) {
      logger.error(`[user.signup] ${i18n.t('ERROR')} ${JSON.stringify(body)}`, deleteErr)
    }
    logger.error(`[user.signup] ${i18n.t('SMTP_ERROR')}`, err)
    res.status(400).send(i18n.t('SMTP_ERROR') + err)
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
 * Admin Sign Up.
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
    // begin of security check
    const sessionUserId = req.user?._id
    const sessionUser = await User.findById(sessionUserId)
    if (!sessionUser || sessionUser.type === bookcarsTypes.UserType.User) {
      logger.error(`[user.create] Unauthorized attempt to create user by user ${sessionUserId}`)
      res.status(403).send('Forbidden: You cannot create user')
      return
    }
    // end of security check

    body.verified = false
    body.blacklisted = false

    if (body.password) {
      const { password } = body
      const passwordHash = await authHelper.hashPassword(password)
      body.password = passwordHash
    }

    const { contracts } = body
    body.contracts = undefined

    const user = new User(body)
    await user.save()

    // contracts
    const finalContracts: bookcarsTypes.Contract[] = []
    if (contracts) {
      for (const contract of contracts) {
        if (!contract.language || !contract.file) {
          continue
        }

        // -----------------------------
        // 1. Validate language (ISO 639-1)
        // -----------------------------
        const language = contract.language.toLowerCase().trim()

        // Exactly 2 letters, a–z only
        if (!helper.validateLanguage(language)) {
          logger.warn(`[contract] Invalid ISO 639-1 language: ${contract.language}`)
          continue
        }

        // -----------------------------
        // 2. Sanitize filename (prevent traversal)
        // -----------------------------
        const safeFile = path.basename(contract.file)

        // If basename changed it, it's a traversal attempt
        if (safeFile !== contract.file) {
          logger.warn(`[contract] Directory traversal attempt (file): ${contract.file}`)
          continue
        }

        // security check: restrict allowed extensions
        const ext = path.extname(safeFile)
        if (!env.allowedContractExtensions.includes(ext.toLowerCase())) {
          res.status(400).send('Invalid contract file type')
          return
        }

        const tempDir = path.resolve(env.CDN_TEMP_CONTRACTS)
        const contractsDir = path.resolve(env.CDN_CONTRACTS)

        const tempFile = path.resolve(tempDir, safeFile)

        // Ensure source stays inside temp directory
        if (!tempFile.startsWith(tempDir + path.sep)) {
          logger.warn(`[contract] Source path escape attempt: ${tempFile}`)
          continue
        }

        if (await helper.pathExists(tempFile)) {
          const ext = path.extname(safeFile)

          const filename = `${user._id.toString()}_${language}${ext}`
          const newPath = path.resolve(contractsDir, filename)

          // Ensure destination stays inside contracts directory
          if (!newPath.startsWith(contractsDir + path.sep)) {
            logger.warn(`[contract] Destination path escape attempt: ${newPath}`)
            continue
          }

          await asyncFs.rename(tempFile, newPath)

          finalContracts.push({
            language,
            file: filename
          })
        }
      }

      user.contracts = finalContracts
      await user.save()
    }

    // avatar
    if (body.avatar) {
      // -----------------------------
      // 1️. Sanitize filename
      // -----------------------------
      const safeAvatar = path.basename(body.avatar)

      // If basename changed it, it's a traversal attempt
      if (safeAvatar !== body.avatar) {
        logger.warn(`[user.create] Directory traversal attempt (avatar): ${body.avatar}`)
        res.status(400).send('Invalid avatar filename')
        return
      }

      const tempDir = path.resolve(env.CDN_TEMP_USERS)
      const usersDir = path.resolve(env.CDN_USERS)

      const avatarPath = path.resolve(tempDir, safeAvatar)

      // -----------------------------
      // 2️. Ensure source is inside temp directory
      // -----------------------------
      if (!avatarPath.startsWith(tempDir + path.sep)) {
        logger.warn(`[user.create] Avatar source path escape attempt: ${avatarPath}`)
        res.status(400).send('Invalid avatar path')
        return
      }

      if (await helper.pathExists(avatarPath)) {
        const ext = path.extname(safeAvatar)

        // security check: restrict allowed extensions
        if (!env.allowedImageExtensions.includes(ext.toLowerCase())) {
          res.status(400).send('Invalid avatar file type')
          return
        }

        const filename = `${user._id}_${Date.now()}${ext}`
        const newPath = path.resolve(usersDir, filename)

        // -----------------------------
        // 3. Ensure destination is inside users directory
        // -----------------------------
        if (!newPath.startsWith(usersDir + path.sep)) {
          logger.warn(`[user.create] Avatar destination path escape attempt: ${newPath}`)
          res.status(400).send('Invalid avatar destination')
          return
        }

        await asyncFs.rename(avatarPath, newPath)

        user.avatar = filename
        await user.save()
      }
    }

    // license
    if (body.license && user.type === bookcarsTypes.UserType.User) {
      // -----------------------------
      // 1. Sanitize filename
      // -----------------------------
      const safeLicense = path.basename(body.license)

      // If basename changed it, it's a traversal attempt
      if (safeLicense !== body.license) {
        logger.warn(`[user.create] Directory traversal attempt (license): ${body.license}`)
        res.status(400).send('Invalid license filename')
        return
      }

      const tempDir = path.resolve(env.CDN_TEMP_LICENSES)
      const licensesDir = path.resolve(env.CDN_LICENSES)

      const licensePath = path.resolve(tempDir, safeLicense)

      // -----------------------------
      // 2. Ensure source stays inside temp directory
      // -----------------------------
      if (!licensePath.startsWith(tempDir + path.sep)) {
        logger.warn(`[user.create] License source path escape attempt: ${licensePath}`)
        res.status(400).send('Invalid license path')
        return
      }

      if (await helper.pathExists(licensePath)) {
        // security check: restrict allowed extensions
        const ext = path.extname(safeLicense)
        if (!env.allowedLicenseExtensions.includes(ext.toLowerCase())) {
          res.status(400).send('Invalid license file type')
          return
        }

        const filename = `${user._id}${ext}`
        const newPath = path.resolve(licensesDir, filename)

        // -----------------------------
        // 3. Ensure destination stays inside licenses directory
        // -----------------------------
        if (!newPath.startsWith(licensesDir + path.sep)) {
          logger.warn(`[user.create] License destination path escape attempt: ${newPath}`)
          res.status(400).send('Invalid license destination')
          return
        }

        await asyncFs.rename(licensePath, newPath)

        user.license = filename
        await user.save()
      }
    }

    if (body.password) {
      res.sendStatus(200)
      return
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
          user.type === bookcarsTypes.UserType.User ? env.FRONTEND_HOST : env.ADMIN_HOST,
          'activate',
        )}/?u=${encodeURIComponent(user._id.toString())}&e=${encodeURIComponent(user.email)}&t=${encodeURIComponent(token.token)}<br><br>
        ${i18n.t('REGARDS')}<br>
        </p>`,
    }

    await mailHelper.sendMail(mailOptions)
    res.sendStatus(200)
  } catch (err) {
    logger.error(`[user.create] ${i18n.t('ERROR')} ${JSON.stringify(body)}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
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
        ![bookcarsTypes.AppType.Frontend, bookcarsTypes.AppType.Admin].includes(type)
        || (type === bookcarsTypes.AppType.Admin && user.type === bookcarsTypes.UserType.User)
        || (type === bookcarsTypes.AppType.Frontend && user.type !== bookcarsTypes.UserType.User)
        || user.active
      ) {
        res.sendStatus(204)
        return
      }

      const token = await Token.findOne({
        user: new mongoose.Types.ObjectId(userId),
        token: req.params.token,
      })

      if (token) {
        res.sendStatus(200)
        return
      }

      res.sendStatus(204)
      return
    }

    res.sendStatus(204)
  } catch (err) {
    logger.error(`[user.checkToken] ${i18n.t('ERROR')} ${JSON.stringify(req.params)}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
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
      res.sendStatus(200)
      return
    }

    res.sendStatus(400)
  } catch (err) {
    logger.error(`[user.deleteTokens] ${i18n.t('ERROR')} ${userId}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
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
        ![bookcarsTypes.AppType.Frontend, bookcarsTypes.AppType.Admin].includes(type)
        || (type === bookcarsTypes.AppType.Admin && user.type === bookcarsTypes.UserType.User)
        || (type === bookcarsTypes.AppType.Frontend && user.type !== bookcarsTypes.UserType.User)
      ) {
        res.sendStatus(403)
        return
      }
      user.active = false
      await user.save()

      // generate token and save
      const token = new Token({ user: user._id, token: helper.generateToken() })
      await token.save()

      // Send email
      i18n.locale = user.language

      const reset = req.params.reset === 'true'

      const activationOrResetLink = `${helper.joinURL(
        user.type === bookcarsTypes.UserType.User ? env.FRONTEND_HOST : env.ADMIN_HOST,
        reset ? 'reset-password' : 'activate',
      )}/?u=${encodeURIComponent(user._id.toString())}&e=${encodeURIComponent(user.email)}&t=${encodeURIComponent(token.token)}`

      const mailOptions: nodemailer.SendMailOptions = {
        from: env.SMTP_FROM,
        to: user.email,
        subject: reset ? i18n.t('PASSWORD_RESET_SUBJECT') : i18n.t('ACCOUNT_ACTIVATION_SUBJECT'),
        html:
          `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <p style="font-size: 16px; color: #555;">
              ${i18n.t('HELLO')} ${user.fullName},<br><br>  
              ${reset ? i18n.t('PASSWORD_RESET_LINK') : i18n.t('ACCOUNT_ACTIVATION_LINK')}<br><br>  
              <a href="${activationOrResetLink}" target="_blank">${activationOrResetLink}</a><br><br>
              ${i18n.t('REGARDS')}<br>
            </p>
          </div>`,
      }
      await mailHelper.sendMail(mailOptions)
      res.sendStatus(200)
      return
    }

    res.sendStatus(204)
  } catch (err) {
    logger.error(`[user.resend] ${i18n.t('ERROR')} ${email}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
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
        const { password } = body
        const passwordHash = await authHelper.hashPassword(password)
        user.password = passwordHash

        user.active = true
        user.verified = true
        user.expireAt = undefined
        await user.save()

        res.sendStatus(200)
        return
      }
    }

    res.sendStatus(204)
  } catch (err) {
    logger.error(`[user.activate] ${i18n.t('ERROR')} ${userId}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
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

  try {
    if (!emailFromBody) {
      throw new Error('body.email not found')
    }

    const email = helper.trim(emailFromBody, ' ')

    if (!helper.isValidEmail(email)) {
      throw new Error('body.email is not valid')
    }

    const user = await User.findOne({ email })
    const type = req.params.type.toLowerCase() as bookcarsTypes.AppType

    if (
      !password
      || !user
      || !user.password
      || ![bookcarsTypes.AppType.Frontend, bookcarsTypes.AppType.Admin].includes(type)
      || (type === bookcarsTypes.AppType.Admin && user.type === bookcarsTypes.UserType.User)
      || (type === bookcarsTypes.AppType.Frontend && user.type !== bookcarsTypes.UserType.User)
    ) {
      res.sendStatus(204)
      return
    }
    const passwordMatch = await bcrypt.compare(password, user.password)

    if (passwordMatch) {
      //
      // On production, authentication cookies are httpOnly, signed, secure and strict sameSite.
      // These options prevent XSS, CSRF and MITM attacks.
      // Authentication cookies are protected against XST attacks as well via allowedMethods middleware.
      //
      const cookieOptions: CookieOptions = helper.clone(env.COOKIE_OPTIONS)

      if (stayConnected) {
        //
        // Cookies can no longer set an expiration date more than 400 days in the future.
        // The limit MUST NOT be greater than 400 days in duration.
        // The RECOMMENDED limit is 400 days in duration, but the user agent MAY adjust the
        // limit to be less.
        //
        cookieOptions.maxAge = 400 * 24 * 60 * 60 * 1000
      } else {
        //
        // Cookie maxAge option is set in milliseconds.
        //
        cookieOptions.maxAge = env.JWT_EXPIRE_AT * 1000
      }

      const payload: authHelper.SessionData = { id: user._id.toString() }
      const token = await authHelper.encryptJWT(payload, stayConnected)

      const loggedUser: bookcarsTypes.User = {
        _id: user._id.toString(),
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

        res
          .status(200)
          .send(loggedUser)
        return
      }

      //
      // On web, we return the token in a httpOnly, signed, secure and strict sameSite cookie.
      //
      const cookieName = authHelper.getAuthCookieName(req)

      res
        .clearCookie(cookieName)
        .cookie(cookieName, token, cookieOptions)
        .status(200)
        .send(loggedUser)
      return
    }

    res.sendStatus(204)
  } catch (err) {
    logger.error(`[user.signin] ${i18n.t('ERROR')} ${emailFromBody}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
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
export const socialSignin = async (req: Request, res: Response) => {
  const { body }: { body: bookcarsTypes.SignInPayload } = req
  const { socialSignInType, accessToken, email: emailFromBody, fullName, avatar, stayConnected, mobile } = body

  try {
    if (!socialSignInType) {
      throw new Error('body.socialSignInType not found')
    }

    if (!emailFromBody) {
      throw new Error('body.email not found')
    }

    const email = helper.trim(emailFromBody, ' ')

    if (!helper.isValidEmail(email)) {
      throw new Error('body.email is not valid')
    }

    if (!accessToken) {
      throw new Error('body.accessToken not found')
    }

    if (!(await authHelper.validateAccessToken(socialSignInType, accessToken, email))) {
      throw new Error('body.accessToken is not valid')
    }

    let user = await User.findOne({ email })

    if (!user) {
      user = new User({
        email,
        fullName,
        active: true,
        verified: true,
        language: 'en',
        enableEmailNotifications: true,
        type: bookcarsTypes.UserType.User,
        blacklisted: false,
        avatar,
      })
      await user.save()
    }

    //
    // On production, authentication cookies are httpOnly, signed, secure and strict sameSite.
    // These options prevent XSS, CSRF and MITM attacks.
    // Authentication cookies are protected against XST attacks as well via allowedMethods middleware.
    //
    const cookieOptions: CookieOptions = helper.clone(env.COOKIE_OPTIONS)

    if (stayConnected) {
      //
      // Cookies can no longer set an expiration date more than 400 days in the future.
      // The limit MUST NOT be greater than 400 days in duration.
      // The RECOMMENDED limit is 400 days in duration, but the user agent MAY adjust the
      // limit to be less.
      //
      cookieOptions.maxAge = 400 * 24 * 60 * 60 * 1000
    } else {
      //
      // Cookie maxAge option is set in milliseconds.
      //
      cookieOptions.maxAge = env.JWT_EXPIRE_AT * 1000
    }

    const payload: authHelper.SessionData = { id: user._id.toString() }
    const token = await authHelper.encryptJWT(payload, stayConnected)

    const loggedUser: bookcarsTypes.User = {
      _id: user._id.toString(),
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

      res
        .status(200)
        .send(loggedUser)
      return
    }

    //
    // On web, we return the token in a httpOnly, signed, secure and strict sameSite cookie.
    //
    const cookieName = authHelper.getAuthCookieName(req)

    res
      .clearCookie(cookieName)
      .cookie(cookieName, token, cookieOptions)
      .status(200)
      .send(loggedUser)
  } catch (err) {
    logger.error(`[user.socialSignin] ${i18n.t('ERROR')} ${emailFromBody}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
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

  res
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
      res.json(pushToken.token)
      return
    }

    res.sendStatus(204)
  } catch (err) {
    logger.error(`[user.pushToken] ${i18n.t('ERROR')} ${userId}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
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
      res.sendStatus(200)
      return
    }

    res.status(400).send('Push Token already exists.')
  } catch (err) {
    logger.error(`[user.createPushToken] ${i18n.t('ERROR')} ${userId}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
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
    res.sendStatus(200)
  } catch (err) {
    logger.error(`[user.deletePushToken] ${i18n.t('ERROR')} ${userId}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
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
  const { email, appType } = body

  try {
    if (!helper.isValidEmail(email)) {
      throw new Error('body.email is not valid')
    }

    const _appType = appType || bookcarsTypes.AppType.Frontend
    const types = _appType === bookcarsTypes.AppType.Frontend
      ? [bookcarsTypes.UserType.User, bookcarsTypes.UserType.Admin, bookcarsTypes.UserType.Supplier]
      : [bookcarsTypes.UserType.Admin, bookcarsTypes.UserType.Supplier]

    const exists = await User.exists(
      {
        email,
        type: { $in: types }
      }
    )

    if (exists) {
      res.sendStatus(204)
      return
    }

    // email does not exist in db (can be added)
    res.sendStatus(200)
  } catch (err) {
    logger.error(`[user.validateEmail] ${i18n.t('ERROR')} ${email}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Validate JWT token.
 *
 * @param {Request} req
 * @param {Response} res
 * @returns {*}
 */
export const validateAccessToken = async (req: Request, res: Response) => {
  res.sendStatus(200)
}

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
      res.status(204).send(i18n.t('ACCOUNT_ACTIVATION_LINK_ERROR'))
      return
    }

    i18n.locale = user.language
    const token = await Token.findOne({ user: user._id, token: _token })

    // token is not found into database i.e. token may have expired
    if (!token) {
      logger.error(i18n.t('ACCOUNT_ACTIVATION_LINK_EXPIRED'), req.params)
      res.status(400).send(getStatusMessage(user.language, i18n.t('ACCOUNT_ACTIVATION_LINK_EXPIRED')))
      return
    }

    // if token is found then check valid user
    // not valid user
    if (user.verified) {
      // user is already verified
      res.status(200).send(getStatusMessage(user.language, i18n.t('ACCOUNT_ACTIVATION_ACCOUNT_VERIFIED')))
      return
    }

    // verify user
    // change verified to true
    user.verified = true
    user.verifiedAt = new Date()
    await user.save()
    res.status(200).send(getStatusMessage(user.language, i18n.t('ACCOUNT_ACTIVATION_SUCCESS')))
  } catch (err) {
    logger.error(`[user.confirmEmail] ${i18n.t('ERROR')} ${JSON.stringify(req.params)}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
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
      res.status(400).send(getStatusMessage(env.DEFAULT_LANGUAGE, i18n.t('ACCOUNT_ACTIVATION_RESEND_ERROR')))
      return
    }

    if (user.verified) {
      // user has been already verified
      res.status(200).send(getStatusMessage(user.language, i18n.t('ACCOUNT_ACTIVATION_ACCOUNT_VERIFIED')))
    }

    // send verification link
    // generate token and save
    const token = new Token({ user: user._id, token: helper.generateToken() })
    await token.save()

    // Send email
    i18n.locale = user.language

    const activateLink = `http${env.HTTPS ? 's' : ''}://${req.headers.host}/api/confirm-email/${user.email}/${token.token}`

    const mailOptions: nodemailer.SendMailOptions = {
      from: env.SMTP_FROM,
      to: user.email,
      subject: i18n.t('ACCOUNT_ACTIVATION_SUBJECT'),
      html:
        `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <p style="font-size: 16px; color: #555;">
            ${i18n.t('HELLO')} ${user.fullName},<br><br>
            ${i18n.t('ACCOUNT_ACTIVATION_LINK')}<br><br>
            <a href="${activateLink}" target="_blank">${activateLink}</a><br><br>
            ${i18n.t('REGARDS')}<br>
          </p>
        </div>`,
    }

    await mailHelper.sendMail(mailOptions)
    res
      .status(200)
      .send(getStatusMessage(user.language, i18n.t('ACCOUNT_ACTIVATION_EMAIL_SENT_PART_1') + user.email + i18n.t('ACCOUNT_ACTIVATION_EMAIL_SENT_PART_2')))
  } catch (err) {
    logger.error(`[user.resendLink] ${i18n.t('ERROR')} ${email}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
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
      res.sendStatus(204)
      return
    }

    // begin of security check
    const sessionUserId = req.user?._id
    const sessionUser = await User.findById(sessionUserId)
    if (!sessionUser
      || (sessionUser.type === bookcarsTypes.UserType.User && sessionUserId !== user._id.toString())
      || (sessionUser.type === bookcarsTypes.UserType.Supplier
        && ((user.type === bookcarsTypes.UserType.User && sessionUserId !== user.supplier?.toString())
          || (user.type === bookcarsTypes.UserType.Supplier && sessionUserId !== user._id.toString())))
    ) {
      logger.error(`[user.update] Unauthorized attempt to update user ${_id} by user ${sessionUserId}`)
      res.status(403).send('Forbidden: You cannot update user information')
      return
    }
    // end of security check

    const {
      fullName,
      phone,
      bio,
      location,
      type,
      birthDate,
      enableEmailNotifications,
      payLater,
      licenseRequired,
      minimumRentalDays,
      priceChangeRate,
      supplierCarLimit,
      notifyAdminOnNewCar,
      blacklisted,
    } = body

    if (fullName) {
      user.fullName = fullName
    }
    user.phone = phone
    user.location = location
    user.bio = bio
    user.birthDate = birthDate ? new Date(birthDate) : undefined
    user.minimumRentalDays = minimumRentalDays
    user.priceChangeRate = priceChangeRate
    user.supplierCarLimit = supplierCarLimit
    user.notifyAdminOnNewCar = notifyAdminOnNewCar
    user.blacklisted = !!blacklisted
    // only admins can update user type
    if (type && sessionUser.type === bookcarsTypes.UserType.Admin) {
      user.type = type as bookcarsTypes.UserType
    }
    if (typeof enableEmailNotifications !== 'undefined') {
      user.enableEmailNotifications = enableEmailNotifications
    }
    if (typeof payLater !== 'undefined') {
      user.payLater = payLater
    }
    if (typeof licenseRequired !== 'undefined') {
      user.licenseRequired = licenseRequired
    }

    await user.save()
    res.sendStatus(200)
  } catch (err) {
    logger.error(`[user.update] ${i18n.t('ERROR')} ${JSON.stringify(req.body)}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
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
      res.sendStatus(204)
      return
    }

    const { enableEmailNotifications } = body
    user.enableEmailNotifications = enableEmailNotifications
    await user.save()

    res.sendStatus(200)
  } catch (err) {
    logger.error(`[user.updateEmailNotifications] ${i18n.t('ERROR')} ${JSON.stringify(body)}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
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
      res.sendStatus(204)
      return
    }

    // begin of security check
    const sessionUserId = req.user?._id
    const sessionUser = await User.findById(sessionUserId)
    if (!sessionUser) {
      logger.error(`[user.updateLanguage] Invalid session user: ${sessionUserId}`)
      res.status(403).send('Forbidden: Invalid session')
      return
    }
    // users can only update their own language
    if (
      sessionUser.type === bookcarsTypes.UserType.User && sessionUserId !== user._id.toString()
    ) {
      logger.error(`[user.updateLanguage] User ${sessionUserId} tried to update another user's language`)
      res.status(403).send('Forbidden: You cannot update another user')
      return
    }
    // suppliers can only update their own language
    if (
      sessionUser.type === bookcarsTypes.UserType.Supplier && sessionUserId !== user._id.toString()
    ) {
      logger.error(`[user.updateLanguage] Supplier ${sessionUserId} tried to update another user's language`)
      res.status(403).send('Forbidden: You cannot update another user')
      return
    }
    // end of security check

    if (!helper.validateLanguage(language)) {
      throw new Error('Invalid language code')
    }

    user.language = language
    await user.save()
    res.sendStatus(200)
  } catch (err) {
    logger.error(`[user.updateLanguage] ${i18n.t('ERROR')} ${JSON.stringify(req.body)}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
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
      licenseRequired: 1,
      license: 1,
      minimumRentalDays: 1,
      priceChangeRate: 1,
      supplierCarLimit: 1,
      notifyAdminOnNewCar: 1,
    }).lean()

    if (!user) {
      logger.error('[user.getUser] User not found:', req.params)
      res.sendStatus(204)
      return
    }

    res.json(user)
  } catch (err) {
    logger.error(`[user.getUser] ${i18n.t('ERROR')} ${id}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
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

    const filename = `${helper.getFilenameWithoutExtension(req.file.originalname)}_${nanoid()}_${Date.now()}${path.extname(req.file.originalname)}`
    const filepath = path.join(env.CDN_TEMP_USERS, filename)

    // security check: restrict allowed extensions
    const ext = path.extname(filename)
    if (!env.allowedImageExtensions.includes(ext.toLowerCase())) {
      res.status(400).send('Invalid avatar file type')
      return
    }

    await asyncFs.writeFile(filepath, req.file.buffer)
    res.json(filename)
  } catch (err) {
    logger.error(`[user.createAvatar] ${i18n.t('ERROR')}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
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
      logger.error(`[user.updateAvatar] ${msg}`)
      res.status(400).send(msg)
      return
    }

    const user = await User.findById(userId)

    if (user) {
      if (user.avatar && !user.avatar.startsWith('http')) {
        const avatar = path.join(env.CDN_USERS, user.avatar)

        if (await helper.pathExists(avatar)) {
          await asyncFs.unlink(avatar)
        }
      }

      const filename = `${user._id}_${Date.now()}${path.extname(req.file.originalname)}`
      const filepath = path.join(env.CDN_USERS, filename)

      // security check: restrict allowed extensions
      const ext = path.extname(filename)
      if (!env.allowedImageExtensions.includes(ext.toLowerCase())) {
        res.status(400).send('Invalid avatar file type')
        return
      }

      await asyncFs.writeFile(filepath, req.file.buffer)
      user.avatar = filename
      await user.save()
      res.json(filename)
      return
    }

    logger.error('[user.updateAvatar] User not found:', userId)
    res.sendStatus(204)
  } catch (err) {
    logger.error(`[user.updateAvatar] ${i18n.t('ERROR')} ${userId}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
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
      if (user.avatar && !user.avatar.startsWith('http')) {
        const avatar = path.join(env.CDN_USERS, user.avatar)
        if (await helper.pathExists(avatar)) {
          await asyncFs.unlink(avatar)
        }
      }
      user.avatar = undefined

      await user.save()
      res.sendStatus(200)
      return
    }

    logger.error('[user.deleteAvatar] User not found:', userId)
    res.sendStatus(204)
  } catch (err) {
    logger.error(`[user.deleteAvatar] ${i18n.t('ERROR')} ${userId}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
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
    // prevent null bytes
    if (avatar.includes('\0')) {
      res.status(400).send('Invalid filename')
      return
    }

    const baseDir = path.resolve(env.CDN_TEMP_USERS)
    const targetPath = path.resolve(baseDir, avatar)

    // critical security check: prevent directory traversal
    if (!targetPath.startsWith(baseDir + path.sep)) {
      logger.warn(`Directory traversal attempt: ${avatar}`)
      res.status(403).send('Forbidden')
      return
    }

    if (await helper.pathExists(targetPath)) {
      await asyncFs.unlink(targetPath)
    } else {
      throw new Error(`[user.deleteTempAvatar] temp avatar ${avatar} not found`)
    }

    res.sendStatus(200)
  } catch (err) {
    logger.error(`[user.deleteTempAvatar] ${i18n.t('ERROR')} ${avatar}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
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
      res.sendStatus(204)
      return
    }

    // begin of security check
    const sessionUserId = req.user?._id
    const sessionUser = await User.findById(sessionUserId)
    if (!sessionUser
      || (sessionUser.type === bookcarsTypes.UserType.User && sessionUserId !== user._id.toString())
      || (sessionUser.type === bookcarsTypes.UserType.Supplier
        && ((user.type === bookcarsTypes.UserType.User && sessionUserId !== user.supplier?.toString())
          || (user.type === bookcarsTypes.UserType.Supplier && sessionUserId !== user._id.toString())))
    ) {
      logger.error(`[user.changePassword] Unauthorized attempt to change user password ${_id} by user ${sessionUserId}`)
      res.status(403).send('Forbidden: You cannot change user password')
      return
    }
    // end of security check

    if (strict && !user.password) {
      logger.error('[user.changePassword] User.password not found:', _id)
      res.sendStatus(204)
      return
    }

    const _changePassword = async () => {
      const password = newPassword
      const passwordHash = await authHelper.hashPassword(password)
      user.password = passwordHash
      await user.save()
      res.sendStatus(200)
    }

    if (strict) {
      const passwordMatch = await bcrypt.compare(currentPassword, user.password!)
      if (passwordMatch) {
        return _changePassword()
      }

      res.sendStatus(204)
      return
    }

    return _changePassword()
  } catch (err) {
    logger.error(`[user.changePassword] ${i18n.t('ERROR')} ${_id}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
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
        res.sendStatus(204)
        return
      }

      const passwordMatch = await bcrypt.compare(password, user.password)
      if (passwordMatch) {
        res.sendStatus(200)
        return
      }

      res.sendStatus(204)
      return
    }

    logger.error('[user.checkPassword] User not found:', id)
    res.sendStatus(204)
  } catch (err) {
    logger.error(`[user.checkPassword] ${i18n.t('ERROR')} ${id}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
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
    // begin of security check
    const sessionUserId = req.user?._id
    const sessionUser = await User.findById(sessionUserId)
    if (!sessionUser || sessionUser.type === bookcarsTypes.UserType.User) {
      throw new Error('Forbidden: You cannot fetch users')
    }
    // end of security check

    const keyword = escapeStringRegexp(String(req.query.s || ''))
    const options = 'i'
    const page = Number.parseInt(req.params.page, 10)
    const size = Number.parseInt(req.params.size, 10)
    const { body }: { body: bookcarsTypes.GetUsersBody } = req
    const { types, user: userId } = body

    const $match: mongoose.QueryFilter<env.User> = {
      $and: [
        {
          type: { $in: types },
        },
        {
          $or: [
            { fullName: { $regex: keyword, $options: options } },
            { email: { $regex: keyword, $options: options } },
          ],
        },
        {
          expireAt: null,
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

    res.json(users)
  } catch (err) {
    logger.error(`[user.getUsers] ${i18n.t('ERROR')}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
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

    const sessionUserId = req.user?._id
    const sessionUser = await User.findById(sessionUserId)

    let unauthorizedAttemptLogged = false
    for (const id of ids) {
      const user = await User.findById(id)

      if (user) {
        // begin of security check
        if (!sessionUser || sessionUser.type === bookcarsTypes.UserType.User || (sessionUser.type === bookcarsTypes.UserType.Supplier && sessionUserId !== user.supplier?.toString())) {
          logger.error(`[user.delete] Unauthorized attempt to delete user ${id} by user ${sessionUserId}`)
          unauthorizedAttemptLogged = true
          continue
        }
        // end of security check


        await User.deleteOne({ _id: id })

        if (user.avatar) {
          const avatar = path.join(env.CDN_USERS, user.avatar)
          if (await helper.pathExists(avatar)) {
            await asyncFs.unlink(avatar)
          }
        }

        if (user.contracts && user.contracts.length > 0) {
          for (const contract of user.contracts) {
            if (contract.file) {
              const file = path.join(env.CDN_CONTRACTS, contract.file)
              if (await helper.pathExists(file)) {
                await asyncFs.unlink(file)
              }
            }
          }
        }

        if (user.license) {
          const file = path.join(env.CDN_LICENSES, user.license)
          if (await helper.pathExists(file)) {
            await asyncFs.unlink(file)
          }
        }

        if (user.type === bookcarsTypes.UserType.Supplier) {
          const additionalDrivers = (
            await Booking
              .find(
                { supplier: id, _additionalDriver: { $ne: null } },
              )
              .select('_additionalDriver -_id')
              .lean()
          ).map((b) => b._additionalDriver)
          await AdditionalDriver.deleteMany({ _id: { $in: additionalDrivers } })
          await Booking.deleteMany({ supplier: id })
          const cars = await Car.find({ supplier: id })
          await Car.deleteMany({ supplier: id })
          for (const car of cars) {
            if (car.image) {
              const image = path.join(env.CDN_CARS, car.image)
              if (await helper.pathExists(image)) {
                await asyncFs.unlink(image)
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

    if (unauthorizedAttemptLogged) {
      res.status(403).send('Forbidden: You cannot delete some of the users')
      return
    }

    res.sendStatus(200)
  } catch (err) {
    logger.error(`[user.delete] ${i18n.t('ERROR')} ${JSON.stringify(req.body)}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
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
      res.sendStatus(200)
      return
    }
    res.sendStatus(204)
  } catch (err) {
    logger.error(`[user.delete] ${i18n.t('ERROR')} ${JSON.stringify(req.body)}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
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
    const whitelist = [
      helper.trimEnd(env.ADMIN_HOST, '/'),
      helper.trimEnd(env.FRONTEND_HOST, '/'),
    ]
    const { origin } = req.headers
    if (!origin || whitelist.indexOf(helper.trimEnd(origin, '/')) === -1) {
      throw new Error('Unauthorized!')
    }

    const { body }: { body: bookcarsTypes.SendEmailPayload } = req
    const { from, to, subject, message, isContactForm } = body

    const mailOptions: nodemailer.SendMailOptions = {
      from: env.SMTP_FROM,
      to,
      subject: isContactForm ? i18n.t('CONTACT_SUBJECT') : subject,
      html:
        `<p>
              ${i18n.t('FROM')}: ${from}<br>
              ${(isContactForm && `${i18n.t('SUBJECT')}: ${subject}<br>`) || ''}
              ${(message && `${i18n.t('MESSAGE')}:<br>${message.replace(/(?:\r\n|\r|\n)/g, '<br>')}<br>`) || ''}
         </p>`,
    }
    await mailHelper.sendMail(mailOptions)

    res.sendStatus(200)
  } catch (err) {
    logger.error(`[user.sendEmail] ${JSON.stringify(req.body)}`, err)
    res.status(400).send(err)
  }
}

/**
 * Check if password exists.
 *
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const hasPassword = async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    if (!helper.isValidObjectId(id)) {
      throw new Error('User id not valid')
    }
    const passwordExists = await User.exists({ _id: id, password: { $ne: null } })

    if (passwordExists) {
      res.sendStatus(200)
      return
    }

    res.sendStatus(204)
  } catch (err) {
    logger.error(`[user.hasPassword] ${i18n.t('ERROR')} ${id}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Upload a license to temp folder.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const createLicense = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      throw new Error('req.file not found')
    }
    if (!req.file.originalname.includes('.')) {
      throw new Error('File extension not found')
    }

    const filename = `${nanoid()}${path.extname(req.file.originalname)}`
    const filepath = path.join(env.CDN_TEMP_LICENSES, filename)

    // security check: restrict allowed extensions
    const ext = path.extname(filename)
    if (!env.allowedLicenseExtensions.includes(ext.toLowerCase())) {
      res.status(400).send('Invalid license file type')
      return
    }

    await asyncFs.writeFile(filepath, req.file.buffer)
    res.json(filename)
  } catch (err) {
    logger.error(`[user.createLicense] ${i18n.t('ERROR')}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
* Update a license.
*
* @export
* @async
* @param {Request} req
* @param {Response} res
* @returns {unknown}
*/
export const updateLicense = async (req: Request, res: Response) => {
  const { id } = req.params
  const { file } = req

  try {
    if (!file) {
      throw new Error('req.file not found')
    }
    if (!file.originalname.includes('.')) {
      throw new Error('File extension not found')
    }
    if (!helper.isValidObjectId(id)) {
      throw new Error('User Id not valid')
    }

    const user = await User.findOne({ _id: id, type: bookcarsTypes.UserType.User })

    if (user) {
      if (user.license) {
        const licenseFile = path.join(env.CDN_LICENSES, user.license)
        if (await helper.pathExists(licenseFile)) {
          await asyncFs.unlink(licenseFile)
        }
      }

      const filename = `${user._id.toString()}${path.extname(file.originalname)}`
      const filepath = path.join(env.CDN_LICENSES, filename)

      // security check: restrict allowed extensions
      const ext = path.extname(filename)
      if (!env.allowedLicenseExtensions.includes(ext.toLowerCase())) {
        res.status(400).send('Invalid license file type')
        return
      }

      await asyncFs.writeFile(filepath, file.buffer)

      user.license = filename
      await user.save()
      res.json(filename)
      return
    }

    res.sendStatus(204)
  } catch (err) {
    logger.error(`[user.updateLicense] ${i18n.t('ERROR')} ${id}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
* Delete a license.
*
* @export
* @async
* @param {Request} req
* @param {Response} res
* @returns {unknown}
*/
export const deleteLicense = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    if (!helper.isValidObjectId(id)) {
      throw new Error('User Id not valid')
    }

    const user = await User.findOne({ _id: id, type: bookcarsTypes.UserType.User })

    if (user) {
      if (user.license) {
        const licenseFile = path.join(env.CDN_LICENSES, user.license)
        if (await helper.pathExists(licenseFile)) {
          await asyncFs.unlink(licenseFile)
        }
        user.license = null
      }

      await user.save()
      res.sendStatus(200)
      return
    }
    res.sendStatus(204)
  } catch (err) {
    logger.error(`[user.deleteLicense] ${i18n.t('ERROR')} ${id}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
* Delete a temp license.
*
* @export
* @async
* @param {Request} req
* @param {Response} res
* @returns {*}
*/
export const deleteTempLicense = async (req: Request, res: Response) => {
  const { file } = req.params

  try {
    // prevent null bytes
    if (file.includes('\0')) {
      res.status(400).send('Invalid filename')
      return
    }

    const baseDir = path.resolve(env.CDN_TEMP_LICENSES)
    const targetPath = path.resolve(baseDir, file)

    // critical security check: prevent directory traversal
    if (!targetPath.startsWith(baseDir + path.sep)) {
      logger.warn(`Directory traversal attempt: ${file}`)
      res.status(403).send('Forbidden')
      return
    }

    if (await helper.pathExists(targetPath)) {
      await asyncFs.unlink(targetPath)
    }

    res.sendStatus(200)
  } catch (err) {
    logger.error(`[user.deleteTempLicense] ${i18n.t('ERROR')} ${file}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}
