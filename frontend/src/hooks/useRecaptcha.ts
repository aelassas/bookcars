import { useEffect, useState } from 'react'
import env from '@/config/env.config'

declare global {
  interface Window {
    grecaptcha: any;
  }
}

const { RECAPTCHA_SITE_KEY } = env

const showBadge = () => {
  if (!window.grecaptcha) return
  window.grecaptcha.ready(() => {
    const badge = document.getElementsByClassName('grecaptcha-badge')[0] as HTMLElement
    if (!badge) return
    badge.style.display = 'block'
    badge.style.zIndex = '1'
  })
}

const hideBadge = () => {
  if (!window.grecaptcha) return
  window.grecaptcha.ready(() => {
    const badge = document.getElementsByClassName('grecaptcha-badge')[0] as HTMLElement
    if (!badge) return
    badge.style.display = 'none'
  })
}

const useReCaptcha = (): { reCaptchaLoaded: boolean; generateReCaptchaToken: (action?: string) => Promise<string> } => {
  const [reCaptchaLoaded, setReCaptchaLoaded] = useState(false)

  // Load ReCaptcha script
  useEffect(() => {
    if (!env.RECAPTCHA_ENABLED) return
    if (env.isSafari) return
    if (typeof window === 'undefined' || reCaptchaLoaded) return
    if (window.grecaptcha) {
      showBadge()
      setReCaptchaLoaded(true)
      return
    }
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`
    script.addEventListener('load', () => {
      setReCaptchaLoaded(true)
      showBadge()
    })
    document.body.appendChild(script)
  }, [reCaptchaLoaded])

  // Hide badge when unmount
  useEffect(() => hideBadge, [])

  // Get token
  const generateReCaptchaToken = (action: string = 'submit'): Promise<string> => new Promise((resolve, reject) => {
    if (env.isSafari) resolve('')
    if (!reCaptchaLoaded) reject(new Error('ReCaptcha not loaded'))
    if (typeof window === 'undefined' || !window.grecaptcha) {
      setReCaptchaLoaded(false)
      reject(new Error('ReCaptcha not loaded'))
    }
    window.grecaptcha.ready(() => {
      window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action }).then((token: string) => {
        resolve(token)
      })
    })
  })

  return { reCaptchaLoaded, generateReCaptchaToken }
}

export default useReCaptcha
