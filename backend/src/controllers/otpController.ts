import { Request, Response } from 'express'
import * as bookcarsTypes from ':bookcars-types'
import * as env from '../config/env.config'
import * as helper from '../utils/helper'
import * as logger from '../utils/logger'
import i18n from '../lang/i18n'
import * as mailHelper from '../utils/mailHelper'
import OTP from '../models/OTP'
import validator from 'validator'

/**
 * Generate a 6-digit OTP.
 *
 * @returns {string}
 */
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Send OTP via Email.
 *
 * @async
 * @param {string} email
 * @param {string} otp
 * @param {string} purpose
 * @param {string} language
 * @returns {Promise<void>}
 */
const sendEmailOTP = async (email: string, otp: string, purpose: string, language: string): Promise<void> => {
  i18n.locale = language

  let subject = ''
  let message = ''

  switch (purpose) {
    case 'signup':
      subject = i18n.t('OTP_SIGNUP_SUBJECT') || 'Your Sign Up Verification Code'
      message = i18n.t('OTP_SIGNUP_MESSAGE') || `Your verification code is: ${otp}. This code will expire in 10 minutes.`
      break
    case 'signin':
      subject = i18n.t('OTP_SIGNIN_SUBJECT') || 'Your Sign In Verification Code'
      message = i18n.t('OTP_SIGNIN_MESSAGE') || `Your verification code is: ${otp}. This code will expire in 10 minutes.`
      break
    case 'password-reset':
      subject = i18n.t('OTP_PASSWORD_RESET_SUBJECT') || 'Your Password Reset Code'
      message = i18n.t('OTP_PASSWORD_RESET_MESSAGE') || `Your password reset code is: ${otp}. This code will expire in 10 minutes.`
      break
    case 'phone-verification':
      subject = i18n.t('OTP_PHONE_VERIFICATION_SUBJECT') || 'Your Phone Verification Code'
      message = i18n.t('OTP_PHONE_VERIFICATION_MESSAGE') || `Your phone verification code is: ${otp}. This code will expire in 10 minutes.`
      break
    default:
      subject = 'Your Verification Code'
      message = `Your verification code is: ${otp}. This code will expire in 10 minutes.`
  }

  const mailOptions: any = {
    from: env.SMTP_FROM,
    to: email,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333; margin-bottom: 20px;">${subject}</h2>
        <p style="font-size: 16px; color: #555; line-height: 1.6;">
          ${message}
        </p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
          <h1 style="color: #121212; font-size: 32px; letter-spacing: 5px; margin: 0;">${otp}</h1>
        </div>
        <p style="font-size: 14px; color: #999; margin-top: 20px;">
          ${i18n.t('OTP_EXPIRY_NOTICE') || 'This code will expire in 10 minutes. If you did not request this code, please ignore this email.'}
        </p>
      </div>
    `,
  }

  await mailHelper.sendMail(mailOptions)
}

/**
 * Send OTP via SMS.
 * TODO: Implement SMS provider (Twilio, Vonage, etc.)
 *
 * @async
 * @param {string} phone
 * @param {string} otp
 * @param {string} purpose
 * @returns {Promise<void>}
 */
const sendSMSOTP = async (phone: string, otp: string, purpose: string): Promise<void> => {
  // TODO: Implement SMS sending using Twilio, Vonage, or similar service
  logger.info(`[OTP] SMS OTP for ${phone}: ${otp} (Purpose: ${purpose})`)
  // For now, just log it. In production, integrate with SMS provider
}

/**
 * Send OTP.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const sendOTP = async (req: Request, res: Response) => {
  try {
    const { body }: { body: bookcarsTypes.SendOTPPayload } = req
    const { identifier, type, purpose } = body

    if (!identifier || !type || !purpose) {
      res.status(400).send({ message: 'Missing required fields: identifier, type, purpose' })
      return
    }

    // Validate identifier based on type
    if (type === 'email' && !helper.isValidEmail(identifier)) {
      res.status(400).send({ message: 'Invalid email address' })
      return
    }

    if (type === 'sms' && !validator.isMobilePhone(identifier)) {
      res.status(400).send({ message: 'Invalid phone number' })
      return
    }

    // Check for existing unverified OTPs (rate limiting)
    const existingOTP = await OTP.findOne({
      identifier,
      type,
      purpose,
      verified: false,
      expireAt: { $gt: new Date() },
    })

    if (existingOTP && existingOTP.createdAt) {
      const timeSinceCreation = Date.now() - existingOTP.createdAt.getTime()
      const cooldownPeriod = 60000 // 1 minute cooldown

      if (timeSinceCreation < cooldownPeriod) {
        const remainingSeconds = Math.ceil((cooldownPeriod - timeSinceCreation) / 1000)
        res.status(429).send({
          message: `Please wait ${remainingSeconds} seconds before requesting a new OTP`,
        })
        return
      }
    }

    // Generate OTP
    const otp = generateOTP()

    // Delete old unverified OTPs for this identifier
    await OTP.deleteMany({
      identifier,
      type,
      purpose,
      verified: false,
    })

    // Create new OTP
    const otpDoc = new OTP({
      identifier,
      otp,
      type,
      purpose,
      verified: false,
      attempts: 0,
    })

    await otpDoc.save()

    // Send OTP
    const language = env.DEFAULT_LANGUAGE
    if (type === 'email') {
      await sendEmailOTP(identifier, otp, purpose, language)
    } else if (type === 'sms') {
      await sendSMSOTP(identifier, otp, purpose)
    }

    logger.info(`[OTP] OTP sent to ${type}: ${identifier} (Purpose: ${purpose})`)
    res.status(200).send({ message: 'OTP sent successfully' })
  } catch (err) {
    logger.error('[OTP] Error sending OTP', err)
    res.status(400).send({ message: 'Failed to send OTP', error: String(err) })
  }
}

/**
 * Verify OTP.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { body }: { body: bookcarsTypes.VerifyOTPPayload } = req
    const { identifier, otp, type, purpose } = body

    if (!identifier || !otp || !type || !purpose) {
      res.status(400).send({ message: 'Missing required fields: identifier, otp, type, purpose' })
      return
    }

    // Find OTP
    const otpDoc = await OTP.findOne({
      identifier,
      type,
      purpose,
      verified: false,
      expireAt: { $gt: new Date() },
    })

    if (!otpDoc) {
      res.status(400).send({ message: 'Invalid or expired OTP' })
      return
    }

    // Check attempts (max 5 attempts)
    if (otpDoc.attempts >= 5) {
      res.status(429).send({ message: 'Too many verification attempts. Please request a new OTP.' })
      return
    }

    // Increment attempts
    otpDoc.attempts += 1

    // Verify OTP
    if (otpDoc.otp !== otp) {
      await otpDoc.save()
      res.status(400).send({ message: 'Invalid OTP' })
      return
    }

    // Mark as verified
    otpDoc.verified = true
    otpDoc.verifiedAt = new Date()
    await otpDoc.save()

    logger.info(`[OTP] OTP verified for ${type}: ${identifier} (Purpose: ${purpose})`)
    res.status(200).send({ message: 'OTP verified successfully', verified: true })
  } catch (err) {
    logger.error('[OTP] Error verifying OTP', err)
    res.status(400).send({ message: 'Failed to verify OTP', error: String(err) })
  }
}

