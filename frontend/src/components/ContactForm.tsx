import React, { useEffect, useState } from 'react'
import {
  OutlinedInput,
  InputLabel,
  FormControl,
  FormHelperText,
  Button,
  Paper,
  CircularProgress,
} from '@mui/material'
import validator from 'validator'
import { useNavigate } from 'react-router-dom'
import * as bookcarsTypes from ':bookcars-types'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/contact-form'
import * as UserService from '@/services/UserService'
import { useRecaptchaContext, RecaptchaContextType } from '@/context/RecaptchaContext'

import * as helper from '@/common/helper'

import '@/assets/css/contact-form.css'

interface ContactFormProps {
  user?: bookcarsTypes.User
  className?: string
}

const ContactForm = ({ user, className }: ContactFormProps) => {
  const navigate = useNavigate()
  const { reCaptchaLoaded, generateReCaptchaToken } = useRecaptchaContext() as RecaptchaContextType

  const [email, setEmail] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [emailValid, setEmailValid] = useState(true)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (user) {
      setIsAuthenticated(true)
      setEmail(user.email!)
    }
  }, [user])

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)

    if (!e.target.value) {
      setEmailValid(true)
    }
  }

  const validateEmail = (_email?: string) => {
    if (_email) {
      const valid = validator.isEmail(_email)
      setEmailValid(valid)
      return valid
    }
    setEmailValid(true)
    return false
  }

  const handleEmailBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    await validateEmail(e.target.value)
  }

  const handleSubjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSubject(e.target.value)
  }

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    try {
      e.preventDefault()
      setSending(true)

      const _emailValid = await validateEmail(email)
      if (!_emailValid) {
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
        subject,
        message,
        isContactForm: true,
      }
      const status = await UserService.sendEmail(payload)

      if (status === 200) {
        if (!isAuthenticated) {
          setEmail('')
        }
        setSubject('')
        setMessage('')
        helper.info(strings.MESSAGE_SENT)
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    } finally {
      setSending(false)
    }
  }

  if (!env.RECAPTCHA_ENABLED) {
    return null
  }

  return (
    <Paper className={`${className ? `${className} ` : ''}contact-form`} elevation={10}>
      <h1 className="contact-form-title">
        {' '}
        {strings.CONTACT_HEADING}
        {' '}
      </h1>
      <form onSubmit={handleSubmit}>
        {!isAuthenticated && (
          <FormControl fullWidth margin="dense">
            <InputLabel className="required">{commonStrings.EMAIL}</InputLabel>
            <OutlinedInput
              type="text"
              label={commonStrings.EMAIL}
              error={!emailValid}
              value={email}
              onBlur={handleEmailBlur}
              onChange={handleEmailChange}
              required
              autoComplete="off"
            />
            <FormHelperText error={!emailValid}>
              {(!emailValid && commonStrings.EMAIL_NOT_VALID) || ''}
            </FormHelperText>
          </FormControl>
        )}

        <FormControl fullWidth margin="dense">
          <InputLabel className="required">{strings.SUBJECT}</InputLabel>
          <OutlinedInput type="text" label={strings.SUBJECT} value={subject} required onChange={handleSubjectChange} autoComplete="off" />
        </FormControl>

        <FormControl fullWidth margin="dense">
          <InputLabel className="required">{strings.MESSAGE}</InputLabel>
          <OutlinedInput
            type="text"
            label={strings.MESSAGE}
            onChange={handleMessageChange}
            autoComplete="off"
            value={message}
            required
            multiline
            minRows={7}
            maxRows={7}
          />
        </FormControl>

        <div className="buttons">
          <Button type="submit" variant="contained" className="btn-primary btn-margin-bottom btn" aria-label="Send" disabled={sending}>
            {
              sending
                ? <CircularProgress color="inherit" size={24} />
                : strings.SEND
            }
          </Button>
          <Button
            variant="outlined"
            color="primary"
            className="btn-margin-bottom btn"
            aria-label="Cancel"
            onClick={() => {
              navigate('/')
            }}
          >
            {' '}
            {commonStrings.CANCEL}
          </Button>
        </div>
      </form>
    </Paper>
  )
}

export default ContactForm
