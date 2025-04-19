import React, { useState } from 'react'
import {
  Button,
  FormControl,
  FormHelperText,
  InputLabel,
  OutlinedInput,
  CircularProgress,
} from '@mui/material'
import validator from 'validator'
import * as bookcarsTypes from ':bookcars-types'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/newsletter-form'
import * as helper from '@/common/helper'
import * as UserService from '@/services/UserService'
import { useRecaptchaContext, RecaptchaContextType } from '@/context/RecaptchaContext'

import '@/assets/css/newsletter-form.css'

const NewsletterForm = () => {
  const { reCaptchaLoaded, generateReCaptchaToken } = useRecaptchaContext() as RecaptchaContextType

  const [email, setEmail] = useState('')
  const [emailValid, setEmailValid] = useState(true)
  const [submitting, setSubmitting] = useState(false)

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

      let recaptchaToken = ''
      if (reCaptchaLoaded) {
        recaptchaToken = await generateReCaptchaToken()
        if (!(await helper.verifyReCaptcha(recaptchaToken))) {
          recaptchaToken = ''
        }
      }

      if (env.RECAPTCHA_ENABLED && !recaptchaToken) {
        helper.error('reCAPTCHA error')
        return
      }


      const payload: bookcarsTypes.SendEmailPayload = {
        from: email,
        to: env.CONTACT_EMAIL,
        subject: 'New Newsletter Subscription',
        message: '',
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
            inputProps={{
              'aria-label': 'email',
            }}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setEmail(e.target.value)

              if (!e.target.value) {
                setEmailValid(true)
              }
            }}
          />
          <FormHelperText error={!emailValid}>{(!emailValid && commonStrings.EMAIL_NOT_VALID) || ''}</FormHelperText>
        </FormControl>

        <Button type="submit" variant="contained" className="btn-primary btn" aria-label="Subscribe">
          {
            submitting
              ? <CircularProgress color="inherit" size={24} />
              : strings.SUBSCRIBE
          }
        </Button>
      </div>
    </form>
  )
}

export default NewsletterForm
