import axios from 'axios'
import * as env from '../config/env.config'

interface SiteVerifyResponse {
  success?: unknown
  action?: unknown
  score?: unknown
}

export const verifyRecaptchaToken = async (token: string, ip: string): Promise<boolean> => {
  if (!env.RECAPTCHA_SECRET || env.RECAPTCHA_SECRET === 'RECAPTCHA_SECRET') {
    throw new Error('reCAPTCHA secret is not configured')
  }

  const result = await axios.post<SiteVerifyResponse>(
    'https://www.google.com/recaptcha/api/siteverify',
    new URLSearchParams({
      secret: env.RECAPTCHA_SECRET,
      response: token,
      remoteip: ip,
    }),
    { timeout: 5000 }
  )

  const { success, action, score } = result.data
  return success === true && action === 'submit' && typeof score === 'number' && score >= 0.5
}
