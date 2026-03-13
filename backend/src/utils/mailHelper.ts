import * as nodemailer from 'nodemailer'
import * as env from '../config/env.config'

/**
 * A cached promise of the Nodemailer Transporter to prevent 
 * redundant initialization and race conditions.
 */
let transporterPromise: Promise<nodemailer.Transporter> | null = null

/**
 * Initializes and returns a Nodemailer Transporter.
 * 
 * If running in a CI environment, it generates a temporary Ethereal test account.
 * Otherwise, it uses the SMTP configuration provided in the environment variables.
 * @returns {Promise<nodemailer.Transporter>} The initialized transporter instance.
 * @throws {Error} If the SMTP configuration is invalid or connection fails.
 */
const createTransporter = async (): Promise<nodemailer.Transporter> => {
  if (transporterPromise) {
    return transporterPromise
  }

  transporterPromise = (async () => {
    let transporterOptions: nodemailer.TransportOptions | any

    if (env.CI) {
      const testAccount = await nodemailer.createTestAccount()
      transporterOptions = {
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false, // Ethereal uses STARTTLS
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      }
    } else {
      transporterOptions = {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465, // true for 465 (Implicit TLS), false for other ports (STARTTLS)
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
        pool: true, 
        maxConnections: 5, // Max simultaneous connections to the server
        maxMessages: 100, // Max messages to send per connection
      }
    }

    const transporter = nodemailer.createTransport(transporterOptions)
    
    // Verify connection on startup to catch config errors early
    await transporter.verify()
    
    return transporter
  })()

  return transporterPromise
}

/**
 * Sends an email using the configured SMTP transporter.
 * * @example
 * await sendMail({
 * from: '"Admin" <admin@example.com>',
 * to: "user@example.com",
 * subject: "Hello",
 * text: "Welcome to the platform!"
 * });
 *
 * @param {nodemailer.SendMailOptions} mailOptions - The email content (to, from, subject, body).
 * @returns {Promise<nodemailer.SentMessageInfo>} Result containing messageId and accepted recipients.
 */
export const sendMail = async (mailOptions: nodemailer.SendMailOptions): Promise<nodemailer.SentMessageInfo> => {
  const transporter = await createTransporter()
  return transporter.sendMail(mailOptions)
}
