import React, { useState } from 'react'
import {
  Input,
  InputLabel,
  FormControl,
  FormHelperText,
  Button,
  Paper
} from '@mui/material'
import validator from 'validator'
import { useNavigate } from 'react-router-dom'
import * as bookcarsTypes from ':bookcars-types'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/sign-up'
import * as UserService from '@/services/UserService'
import Layout from '@/components/Layout'
import Error from '@/components/Error'
import Backdrop from '@/components/SimpleBackdrop'
import * as helper from '@/common/helper'
import { useUserContext, UserContextType } from '@/context/UserContext'

import '@/assets/css/signup.css'

const SignUp = () => {
  const navigate = useNavigate()

  const { setUser, setUserLoaded } = useUserContext() as UserContextType

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(false)
  const [passwordError, setPasswordError] = useState(false)
  const [passwordsDontMatch, setPasswordsDontMatch] = useState(false)
  const [emailError, setEmailError] = useState(false)
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [emailValid, setEmailValid] = useState(true)

  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFullName(e.target.value)
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)

    if (!e.target.value) {
      setEmailError(false)
      setEmailValid(true)
    }
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
  }

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value)
  }

  const validateEmail = async (_email?: string) => {
    if (_email) {
      if (validator.isEmail(_email)) {
        try {
          const status = await UserService.validateEmail({ email: _email })
          if (status === 200) {
            setEmailError(false)
            setEmailValid(true)
            return true
          }
          setEmailError(true)
          setEmailValid(true)
          setError(false)
          return false
        } catch (err) {
          helper.error(err)
          setEmailError(false)
          setEmailValid(true)
          return false
        }
      } else {
        setEmailError(false)
        setEmailValid(false)
        return false
      }
    } else {
      setEmailError(false)
      setEmailValid(true)
      return false
    }
  }

  const handleBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    await validateEmail(e.target.value)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    try {
      e.preventDefault()

      const _emailValid = await validateEmail(email)
      if (!_emailValid) {
        return
      }

      if (password.length < 6) {
        setPasswordError(true)
        setPasswordsDontMatch(false)
        setError(false)
        return
      }

      if (password !== confirmPassword) {
        setPasswordError(false)
        setPasswordsDontMatch(true)
        setError(false)
        return
      }

      setLoading(true)

      const data: bookcarsTypes.SignUpPayload = {
        email,
        password,
        fullName,
        language: UserService.getLanguage(),
      }

      const status = await UserService.signup(data)

      if (status === 200) {
        const signInResult = await UserService.signin({
          email,
          password,
        })

        if (signInResult.status === 200) {
          const user = await UserService.getUser(signInResult.data._id)
          setUser(user)
          setUserLoaded(true)
          navigate(`/${window.location.search}`)
        } else {
          setPasswordError(false)
          setPasswordsDontMatch(false)
          setError(true)
        }
      } else {
        setPasswordError(false)
      }

      setPasswordsDontMatch(false)
    } catch (err) {
      console.error(err)
      setPasswordError(false)
      setPasswordsDontMatch(false)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const onLoad = (user?: bookcarsTypes.User) => {
    if (user) {
      navigate('/')
    } else {
      setVisible(true)
    }
  }

  return (
    <Layout strict={false} onLoad={onLoad}>
      <div className="signup">
        <Paper className="signup-form" elevation={10} style={visible ? {} : { display: 'none' }}>
          <h1 className="signup-form-title">
            {' '}
            {strings.SIGN_UP_HEADING}
            {' '}
          </h1>
          <form onSubmit={handleSubmit}>
            <div>
              <FormControl fullWidth margin="dense">
                <InputLabel htmlFor="full-name">{commonStrings.FULL_NAME}</InputLabel>
                <Input id="full-name" type="text" name="FullName" required onChange={handleFullNameChange} autoComplete="off" />
              </FormControl>
              <FormControl fullWidth margin="dense">
                <InputLabel htmlFor="email">{commonStrings.EMAIL}</InputLabel>
                <Input id="email" type="text" error={!emailValid || emailError} name="Email" onBlur={handleBlur} onChange={handleEmailChange} required autoComplete="off" />
                <FormHelperText error={!emailValid || emailError}>
                  {(!emailValid && commonStrings.EMAIL_NOT_VALID) || ''}
                  {(emailError && commonStrings.EMAIL_ALREADY_REGISTERED) || ''}
                </FormHelperText>
              </FormControl>
              <FormControl fullWidth margin="dense">
                <InputLabel htmlFor="password">{commonStrings.PASSWORD}</InputLabel>
                <Input
                  id="password"
                  name="Password"
                  onChange={handlePasswordChange}
                  required
                  type="password"
                  inputProps={{
                    autoComplete: 'new-password',
                    form: {
                      autoComplete: 'off',
                    },
                  }}
                />
              </FormControl>
              <FormControl fullWidth margin="dense">
                <InputLabel htmlFor="confirm-password">{commonStrings.CONFIRM_PASSWORD}</InputLabel>
                <Input
                  id="confirm-password"
                  name="ConfirmPassword"
                  onChange={handleConfirmPasswordChange}
                  autoComplete="password"
                  required
                  type="password"
                  inputProps={{
                    autoComplete: 'new-password',
                    form: {
                      autoComplete: 'off',
                    },
                  }}
                />
              </FormControl>
              <div className="buttons">
                <Button type="submit" variant="contained" className="btn-primary btn-margin-bottom" size="small">
                  {strings.SIGN_UP}
                </Button>
                <Button variant="contained" className="btn-secondary btn-margin-bottom" size="small" onClick={() => navigate('/')}>
                  {' '}
                  {commonStrings.CANCEL}
                </Button>
              </div>
            </div>
            <div className="form-error">
              {passwordError && <Error message={commonStrings.PASSWORD_ERROR} />}
              {passwordsDontMatch && <Error message={commonStrings.PASSWORDS_DONT_MATCH} />}
              {error && <Error message={strings.SIGN_UP_ERROR} />}
            </div>
          </form>
        </Paper>
      </div>
      {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
    </Layout>
  )
}

export default SignUp
