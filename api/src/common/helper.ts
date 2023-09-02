import fs from 'node:fs/promises'
import process from 'node:process'
import nodemailer from 'nodemailer'
import SMTPTransport from 'nodemailer/lib/smtp-transport'

export function StringToBoolean(input: string): boolean {
    try {
        return Boolean(JSON.parse(input.toLowerCase()))
    } catch {
        return false
    }
}

export async function exists(path: string): Promise<boolean> {
    try {
        await fs.access(path)
        return true
    } catch {
        return false
    }
}

export function sendMail(mailOptions: nodemailer.SendMailOptions) {
    const SMTP_HOST = String(process.env.BC_SMTP_HOST)
    const SMTP_PORT = Number.parseInt(String(process.env.BC_SMTP_PORT), 10)
    const SMTP_USER = String(process.env.BC_SMTP_USER)
    const SMTP_PASS = String(process.env.BC_SMTP_PASS)

    const transporterOptions: SMTPTransport.Options = {
        host: SMTP_HOST,
        port: SMTP_PORT,
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
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

export function joinURL(part1: string, part2: string): string {
    if (part1.charAt(part1.length - 1) === '/') {
        part1 = part1.substr(0, part1.length - 1)
    }

    if (part2.charAt(0) === '/') {
        part2 = part2.substr(1)
    }

    return `${part1}/${part2}`
}
