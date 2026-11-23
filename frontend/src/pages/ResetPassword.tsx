import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Paper,
  Box,
  Typography
} from '@mui/material'
import {
  VpnKey as KeyIcon,
  LockReset as ResetIcon
} from '@mui/icons-material'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as bookcarsTypes from ':bookcars-types'
import * as UserService from '@/services/UserService'
import Layout from '@/components/Layout'
import { strings as commonStrings } from '@/lang/common'
import { strings as rpStrings } from '@/lang/reset-password'
import { useUserContext, UserContextType } from '@/context/UserContext'
import * as helper from '@/utils/helper'
import Error from './Error'
import NoMatch from './NoMatch'
import Footer from '@/components/Footer'
import { schema, FormFields } from '@/models/ResetPasswordForm'

import '@/assets/css/reset-password.css'
import PasswordInput from '@/components/PasswordInput'

const ResetPassword = () => {
  const navigate = useNavigate()

  const { setUser, setUserLoaded } = useUserContext() as UserContextType
  const [userId, setUserId] = useState('')
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [visible, setVisible] = useState(false)
  const [noMatch, setNoMatch] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, setError, clearErrors } = useForm<FormFields>({
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
      <div className={visible ? '' : 'hidden'}>
        <Box
          className="reset-password"
          sx={{
            minHeight: '80vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            py: 6,
            px: 2,
            background: 'linear-gradient(180deg, rgba(11, 17, 32, 0.03) 0%, transparent 100%)'
          }}
        >
          <Paper
            elevation={12}
            sx={{
              width: '100%',
              maxWidth: 460,
              borderRadius: '20px',
              p: { xs: 3, sm: 4.5 },
              border: '1px solid var(--sr-border, #E2E8F0)',
              background: 'var(--sr-surface, #FFFFFF)',
              boxShadow: '0 20px 40px rgba(11, 17, 32, 0.08)'
            }}
          >
            {/* Header Icon */}
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '16px',
                  bgcolor: 'rgba(5, 150, 105, 0.1)',
                  color: 'var(--sr-emerald)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2
                }}
              >
                <ResetIcon sx={{ fontSize: 30 }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--sr-text, #0B1120)', letterSpacing: '-0.02em', mb: 0.5 }}>
                {rpStrings.RESET_PASSWORD_HEADING}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Choose a strong, unique password with at least 6 characters.
              </Typography>
            </Box>

            <form onSubmit={handleSubmit(onSubmit)}>
              <PasswordInput
                label={commonStrings.PASSWORD}
                variant="standard"
                {...register('password')}
                error={!!errors.password}
                helperText={errors.password?.message}
                onChange={(e) => {
                  if (errors.password) {
                    clearErrors('password')
                  }
                  setValue('password', e.target.value)
                }}
                required
                autoComplete="new-password"
              />

              <PasswordInput
                label={commonStrings.CONFIRM_PASSWORD}
                variant="standard"
                {...register('confirmPassword')}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword?.message}
                onChange={(e) => {
                  if (errors.confirmPassword) {
                    clearErrors('confirmPassword')
                  }
                  setValue('confirmPassword', e.target.value)
                }}
                required
                inputProps={{
                  autoComplete: 'new-password',
                  form: {
                    autoComplete: 'off',
                  },
                }}
              />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 3.5 }}>
                <Button
                  type="submit"
                  className="btn-primary"
                  variant="contained"
                  disabled={isSubmitting}
                  sx={{
                    bgcolor: '#107487',
                    '&:hover': { bgcolor: '#047857' },
                    fontWeight: 700,
                    py: 1.2,
                    textTransform: 'none',
                    borderRadius: '10px'
                  }}
                >
                  {commonStrings.SAVE}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/')}
                  sx={{
                    textTransform: 'none',
                    borderRadius: '10px',
                    borderColor: 'var(--sr-border, #CBD5E1)',
                    color: 'var(--sr-text, #334155)'
                  }}
                >
                  {commonStrings.CANCEL}
                </Button>
              </Box>
            </form>
          </Paper>
        </Box>

        <Footer />
      </div>

      {errors.root && <Error />}

      {!isAuthenticated && noMatch && <NoMatch hideHeader />}
    </Layout>
  )
}

export default ResetPassword
