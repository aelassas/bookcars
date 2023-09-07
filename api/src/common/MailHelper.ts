import nodemailer from 'nodemailer'
import SMTPTransport from 'nodemailer/lib/smtp-transport'
import * as env from '../config/env.config'

export function sendMail(mailOptions: nodemailer.SendMailOptions) {
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
