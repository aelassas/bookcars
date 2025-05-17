import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Input,
  InputLabel,
  FormControl,
  FormHelperText,
  Button,
  Paper,
} from '@mui/material'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as bookcarsTypes from ':bookcars-types'
import * as UserService from '@/services/UserService'
import Layout from '@/components/Layout'
import { strings as commonStrings } from '@/lang/common'
import { strings as cpStrings } from '@/lang/change-password'
import { strings as rpStrings } from '@/lang/reset-password'
import { strings as mStrings } from '@/lang/master'
import { strings } from '@/lang/activate'
import { useUserContext, UserContextType } from '@/context/UserContext'
import NoMatch from './NoMatch'
import * as helper from '@/common/helper'
import Footer from '@/components/Footer'
import Error from './Error'
import { schema, FormFields } from '@/models/ActivateForm'

import '@/assets/css/activate.css'

const Activate = () => {
  const navigate = useNavigate()

  const { setUser, setUserLoaded } = useUserContext() as UserContextType
  const [userId, setUserId] = useState('')
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [visible, setVisible] = useState(false)
  const [resend, setResend] = useState(false)
  const [noMatch, setNoMatch] = useState(false)
  const [reset, setReset] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError, clearErrors } = useForm<FormFields>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
  })

  const onSubmit = async ({ password }: FormFields) => {
    try {
      const data: bookcarsTypes.ActivatePayload = { userId, token, password }

      const status = await UserService.activate(data)
      if (status === 200) {
        const signInResult = await UserService.signin({ email, password })

        if (signInResult.status === 200) {
          const user = await UserService.getUser(signInResult.data._id)
          setIsAuthenticated(true)
          setUser(user)
          setUserLoaded(true)

          const _status = await UserService.deleteTokens(userId)

          if (_status === 200) {
            navigate('/')
          } else {
            helper.error()
          }
        } else {
          helper.error()
        }
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const handleResend = async () => {
    try {
      const status = await UserService.resend(email, false)

      if (status === 200) {
        helper.info(commonStrings.ACTIVATION_EMAIL_SENT)
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const onLoad = async (user?: bookcarsTypes.User) => {
    if (user) {
      setNoMatch(true)
    } else {
      const params = new URLSearchParams(window.location.search)
      if (params.has('u') && params.has('e') && params.has('t')) {
        const _userId = params.get('u')
        const _email = params.get('e')
        const _token = params.get('t')
        if (_userId && _email && _token) {
          try {
            const status = await UserService.checkToken(_userId, _email, _token)

            if (status === 200) {
              setUserId(_userId)
              setEmail(_email)
              setToken(_token)
              setVisible(true)

              if (params.has('r')) {
                const _reset = params.get('r') === 'true'
                setReset(_reset)
              }
            } else if (status === 204) {
              setEmail(_email)
              setResend(true)
            } else {
              setNoMatch(true)
            }
          } catch (err) {
            console.error(err)
            setError('root', {})
          }
        } else {
          setNoMatch(true)
        }
      } else {
        setNoMatch(true)
      }
    }
  }

  return (
    <Layout onLoad={onLoad} strict={false}>
      {resend && (
        <div className="resend">
          <Paper className="resend-form" elevation={10}>
            <h1>{strings.ACTIVATE_HEADING}</h1>
            <div className="resend-form-content">
              <span>{strings.TOKEN_EXPIRED}</span>
              <Button type="button" variant="contained" className="btn-primary btn-resend" onClick={handleResend}>
                {mStrings.RESEND}
              </Button>
              <p className="go-to-home">
                <Button variant="text" onClick={() => navigate('/')} className="btn-lnk">{commonStrings.GO_TO_HOME}</Button>
              </p>
            </div>
          </Paper>
        </div>
      )}
      {visible && (
        <div className="activate">
          <Paper className="activate-form" elevation={10}>
            <h1>{reset ? rpStrings.RESET_PASSWORD_HEADING : strings.ACTIVATE_HEADING}</h1>
            <form onSubmit={handleSubmit(onSubmit)}>
              <FormControl fullWidth margin="dense" error={!!errors.password}>
                <InputLabel className="required">{cpStrings.NEW_PASSWORD}</InputLabel>
                <Input
                  {...register('password')}
                  type="password"
                  required
                  autoComplete="new-password"
                  onChange={() => clearErrors()}
                />
                <FormHelperText error={!!errors.password}>{errors.password?.message || ''}</FormHelperText>
              </FormControl>
              <FormControl fullWidth margin="dense" error={!!errors.confirmPassword}>
                <InputLabel className="required">{commonStrings.CONFIRM_PASSWORD}</InputLabel>
                <Input
                  {...register('confirmPassword')}
                  type="password"
                  required
                  autoComplete="new-password"
                  onChange={() => clearErrors()}
                />
                <FormHelperText error={!!errors.confirmPassword}>{errors.confirmPassword?.message || ''}</FormHelperText>
              </FormControl>
              <div className="buttons">
                <Button type="submit" className="btn-primary btn-margin btn-margin-bottom" variant="contained" disabled={isSubmitting}>
                  {reset ? commonStrings.UPDATE : strings.ACTIVATE}
                </Button>
                <Button variant="outlined" color="primary" className="btn-margin-bottom" onClick={() => navigate('/')}>
                  {commonStrings.CANCEL}
                </Button>
              </div>
            </form>
          </Paper>
        </div>
      )}
      {!isAuthenticated && noMatch && <NoMatch hideHeader />}

      {(resend || visible) && <Footer />}

      {errors.root && <Error />}
    </Layout>
  )
}

export default Activate
