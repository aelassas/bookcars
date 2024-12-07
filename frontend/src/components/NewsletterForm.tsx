import React, { useCallback, useState } from 'react'
import {
  Button,
  FormControl,
  FormHelperText,
  InputLabel,
  OutlinedInput,
  CircularProgress,
} from '@mui/material'
import validator from 'validator'
import { GoogleReCaptcha } from 'react-google-recaptcha-v3'
import * as bookcarsTypes from ':bookcars-types'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/newsletter-form'
import * as helper from '@/common/helper'
import * as UserService from '@/services/UserService'

import '@/assets/css/newsletter-form.css'

const NewsletterForm = () => {
  const [email, setEmail] = useState('')
  const [emailValid, setEmailValid] = useState(true)
  const [recaptchaToken, setRecaptchaToken] = useState('')
  const [refreshReCaptcha, setRefreshReCaptcha] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleRecaptchaVerify = useCallback(async (token: string) => {
    setRecaptchaToken(token)
  }, [])

  const validateEmail = (_email: string) => {
    if (_email) {
      if (validator.isEmail(_email)) {
        setEmailValid(true)
        return true
      }

      setEmailValid(false)
      return false
    }

    setEmailValid(true)
    return false
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    try {
      e.preventDefault()
      setSubmitting(true)

      if (!validateEmail(email)) {
        return
      }

      const ip = await UserService.getIP()

      const payload: bookcarsTypes.SendEmailPayload = {
        from: email,
        to: env.CONTACT_EMAIL,
        subject: 'New Newsletter Subscription',
        message: '',
        recaptchaToken,
        ip,
        isContactForm: false,
      }
      const status = await UserService.sendEmail(payload)

      if (status === 200) {
        setEmail('')
        helper.info(strings.SUCCESS)
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    } finally {
      setSubmitting(false)
      setRefreshReCaptcha((refresh) => !refresh)
    }
  }

  return (
    <form className="newsletter-form" onSubmit={handleSubmit}>
      <h1>{strings.TITLE}</h1>
      <p>{strings.SUB_TITLE}</p>

      <div className="form">
        <FormControl fullWidth margin="normal" size="small" className="input">
          <InputLabel className="required">{commonStrings.EMAIL}</InputLabel>
          <OutlinedInput
            type="text"
            label={commonStrings.EMAIL}
            size="small"
            error={!emailValid}
            required
            autoComplete="off"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setEmail(e.target.value)

              if (!e.target.value) {
                setEmailValid(true)
              }
            }}
          />
          <FormHelperText error={!emailValid}>{(!emailValid && commonStrings.EMAIL_NOT_VALID) || ''}</FormHelperText>
        </FormControl>

        <Button type="submit" variant="contained" className="btn-primary btn">
          {
            submitting
              ? <CircularProgress color="inherit" size={24} />
              : strings.SUBSCRIBE
          }
        </Button>
      </div>

      <GoogleReCaptcha
        refreshReCaptcha={refreshReCaptcha}
        onVerify={handleRecaptchaVerify}
      />
    </form>
  )
}

export default NewsletterForm
