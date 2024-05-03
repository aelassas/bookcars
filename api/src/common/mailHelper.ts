import nodemailer from 'nodemailer'
import SMTPTransport from 'nodemailer/lib/smtp-transport'
import * as env from '../config/env.config'

/**
 * Send an email.
 *
 * @export
 * @param {nodemailer.SendMailOptions} mailOptions
 * @returns {Promise<unknown>}
 */
export const sendMail = (mailOptions: nodemailer.SendMailOptions): Promise<nodemailer.SentMessageInfo> => {
  const transporterOptions: SMTPTransport.Options = {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  }

  const transporter: nodemailer.Transporter = nodemailer.createTransport(transporterOptions)

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
