import nodemailer from 'nodemailer'
import SMTPTransport from 'nodemailer/lib/smtp-transport'
import * as env from '../config/env.config'

const createTestTransporter = async () => {
  // Create ethereal test account
  let testAccount = await nodemailer.createTestAccount()

  // Create transporter using test SMTP service
  let transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  })

  return transporter
}

/**
 * Send an email.
 *
 * @export
 * @param {nodemailer.SendMailOptions} mailOptions
 * @returns {Promise<unknown>}
 */
export const sendMail = async (mailOptions: nodemailer.SendMailOptions): Promise<nodemailer.SentMessageInfo> => {
  const transporterOptions: SMTPTransport.Options = {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  }

  const transporter: nodemailer.Transporter =
    env.CI ? (await createTestTransporter()) : nodemailer.createTransport(transporterOptions)

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (err: Error | null, info: nodemailer.SentMessageInfo) => {
      if (err) {
        reject(err)
      } else {
        resolve(info)
      }
    })
  })
}
