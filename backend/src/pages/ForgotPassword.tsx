import React, { useState } from 'react'
import {
  Input,
  InputLabel,
  FormControl,
  FormHelperText,
  Button,
  Paper,
  Link
} from '@mui/material'
import validator from 'validator'
import * as bookcarsTypes from ':bookcars-types'
import * as UserService from '@/services/UserService'
import Layout from '@/components/Layout'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/reset-password'
import NoMatch from './NoMatch'
import * as helper from '@/common/helper'
import env from '@/config/env.config'

import '@/assets/css/forgot-password.css'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState(false)
  const [emailValid, setEmailValid] = useState(true)
  const [noMatch, setNoMatch] = useState(false)
  const [sent, setSent] = useState(false)

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)

    if (!e.target.value) {
      setError(false)
      setEmailValid(true)
    }
  }

  const validateEmail = async (_email?: string) => {
    if (_email) {
      if (validator.isEmail(_email)) {
        try {
          const status = await UserService.validateEmail({ email: _email })

          if (status === 200) {
            // user not found (error)
            setError(true)
            setEmailValid(true)
            return false
          }
          setError(false)
          setEmailValid(true)
          return true
        } catch (err) {
          helper.error(err)
          setError(false)
          setEmailValid(true)
          return false
        }
      } else {
        setError(false)
        setEmailValid(false)
        return false
      }
    } else {
      setError(false)
      setEmailValid(true)
      return false
    }
  }

  const handleEmailBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    await validateEmail(e.target.value)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement> | React.KeyboardEvent<HTMLElement>) => {
    try {
      e.preventDefault()

      const _emailValid = await validateEmail(email)
      if (!_emailValid) {
        return
      }

      const status = await UserService.resend(email, true, env.APP_TYPE)
      if (status === 200) {
        setError(false)
        setEmailValid(true)
        setSent(true)
      } else {
        setError(true)
        setEmailValid(true)
      }
    } catch {
      setError(true)
      setEmailValid(true)
    }
  }

  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter') {
      handleSubmit(e)
    }
  }

  const onLoad = (user?: bookcarsTypes.User) => {
    if (user) {
      setNoMatch(true)
      setVisible(false)
    } else {
      setVisible(true)
      console.log('boo')
    }
  }

  return (
    <Layout onLoad={onLoad} strict={false}>
      {visible && (
        <div className="forgot-password">
          <Paper className="forgot-password-form" elevation={10}>
            <h1 className="forgot-password-title">
              {' '}
              {strings.RESET_PASSWORD_HEADING}
              {' '}
            </h1>
            {sent && (
              <div>
                <span>{strings.EMAIL_SENT}</span>
                <p>
                  <Link href="/">{commonStrings.GO_TO_HOME}</Link>
                </p>
              </div>
            )}
            {!sent && (
              <form onSubmit={handleSubmit}>
                <span>{strings.RESET_PASSWORD}</span>
                <FormControl fullWidth margin="dense">
                  <InputLabel className="required">{commonStrings.EMAIL}</InputLabel>
                  <Input onChange={handleEmailChange} onKeyDown={handleEmailKeyDown} onBlur={handleEmailBlur} type="text" error={error || !emailValid} autoComplete="off" required />
                  <FormHelperText error={error || !emailValid}>
                    {(!emailValid && commonStrings.EMAIL_NOT_VALID) || ''}
                    {(error && strings.EMAIL_ERROR) || ''}
                  </FormHelperText>
                </FormControl>

                <div className="buttons">
                  <Button type="submit" className="btn-primary btn-margin btn-margin-bottom" size="small" variant="contained">
                    {strings.RESET}
                  </Button>
                  <Button className="btn-secondary btn-margin-bottom" size="small" variant="contained" href="/">
                    {commonStrings.CANCEL}
                  </Button>
                </div>
              </form>
            )}
          </Paper>
        </div>
      )}
      {noMatch && <NoMatch hideHeader />}
    </Layout>
  )
}

export default ForgotPassword
