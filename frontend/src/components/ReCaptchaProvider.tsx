import React, { ReactNode } from 'react'
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3'
import env from '../config/env.config'
import * as UserService from '../services/UserService'

interface ReCaptchaProviderProps {
  children: ReactNode
}

const ReCaptchaProvider = ({ children }: ReCaptchaProviderProps) => (
  env.RECAPTCHA_ENABLED
    ? (
      <GoogleReCaptchaProvider
        reCaptchaKey={env.RECAPTCHA_SITE_KEY}
        language={UserService.getLanguage()}
      >
        {children}
      </GoogleReCaptchaProvider>
    )
    : <>{children}</>
)

export default ReCaptchaProvider
