import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Paper,
  FormControl,
  InputLabel,
  Input,
  Button,
  FormHelperText,
} from '@mui/material'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import * as bookcarsTypes from ':bookcars-types'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/sign-in'
import * as UserService from '@/services/UserService'
import Header from '@/components/Header'
import Error from '@/components/Error'
import * as langHelper from '@/common/langHelper'
import { useUserContext, UserContextType } from '@/context/UserContext'
import env from '@/config/env.config'

import '@/assets/css/signin.css'

const schema = z.object({
  email: z.string().email({ message: commonStrings.EMAIL_NOT_VALID }),
  password: z.string().min(env.PASSWORD_MIN_LENGTH, { message: commonStrings.PASSWORD_ERROR }),
  stayConnected: z.boolean().optional()
})

type FormFields = z.infer<typeof schema>

const SignIn = () => {
  const navigate = useNavigate()

  const { setUser, setUserLoaded } = useUserContext() as UserContextType
  const [visible, setVisible] = useState(false)

  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    defaultValues: {
      stayConnected: false,
    },
  })

  const signinError = () => {
    setError('root', { message: strings.ERROR_IN_SIGN_IN })
  }

  const onSubmit = async ({ email, password, stayConnected }: FormFields) => {
    try {
      const data: bookcarsTypes.SignInPayload = {
        email,
        password,
        stayConnected: stayConnected,
      }

      const res = await UserService.signin(data)

      if (res.status === 200) {
        if (res.data.blacklisted) {
          await UserService.signout(false)
          setError('root', { message: strings.IS_BLACKLISTED })
        } else {
          const user = await UserService.getUser(res.data._id)
          setUser(user)
          setUserLoaded(true)

          const params = new URLSearchParams(window.location.search)

          if (params.has('u')) {
            navigate(`/user${window.location.search}`)
          } else if (params.has('c')) {
            navigate(`/supplier${window.location.search}`)
          } else if (params.has('cr')) {
            navigate(`/car${window.location.search}`)
          } else if (params.has('b')) {
            navigate(`/update-booking${window.location.search}`)
          } else {
            navigate('/')
          }
        }
      } else {
        signinError()
      }
    } catch {
      signinError()
    }
  }

  useEffect(() => {
    const init = async () => {
      try {
        langHelper.setLanguage(strings)

        const currentUser = UserService.getCurrentUser()

        if (currentUser) {
          const status = await UserService.validateAccessToken()

          if (status === 200) {
            const user = await UserService.getUser(currentUser._id)

            if (user) {
              navigate(`/${window.location.search}`)
            } else {
              await UserService.signout()
            }
          }
        } else {
          setVisible(true)
        }
      } catch {
        await UserService.signout()
      }
    }

    init()
  }, [navigate])

  return (
    <div>
      <Header />

      {visible && (
        <div className="signin">
          <Paper className={`signin-form ${visible ? '' : 'hidden'}`} elevation={10}>
            <form onSubmit={handleSubmit(onSubmit)}>
              <h1 className="signin-form-title">{strings.SIGN_IN_HEADING}</h1>
              <FormControl fullWidth margin="dense" error={!!errors.email}>
                <InputLabel htmlFor="email">{commonStrings.EMAIL}</InputLabel>
                <Input
                  {...register('email')}
                  onChange={(e) => {
                    clearErrors()
                    // Without the next line, if the field is auto-filled by the browser, react-form does not know it
                    setValue('email', e.target.value)
                  }}
                  autoComplete="email"
                  required
                />
                <FormHelperText error={!!errors.email}>{errors.email?.message || ''}</FormHelperText>
              </FormControl>
              <FormControl fullWidth margin="dense" error={!!errors.password}>
                <InputLabel htmlFor="password">{commonStrings.PASSWORD}</InputLabel>
                <Input
                  {...register('password')}
                  onChange={(e) => {
                    clearErrors()
                    setValue('password', e.target.value)
                  }}
                  type="password"
                  autoComplete="password"
                  required
                />
                <FormHelperText error={!!errors.password}>{errors.password?.message || ''}</FormHelperText>
              </FormControl>

              <div className="stay-connected">
                <input
                  id="stay-connected"
                  type="checkbox"
                  onChange={(e) => {
                    setValue('stayConnected', e.currentTarget.checked)
                  }}
                />
                <label
                  htmlFor="stay-connected"
                >
                  {strings.STAY_CONNECTED}
                </label>
              </div>

              <div className="forgot-password">
                <Button variant="text" onClick={() => navigate('/forgot-password')} className="btn-lnk">{strings.RESET_PASSWORD}</Button>
              </div>

              <div className="signin-buttons">
                <Button type="submit" variant="contained" size="small" className="btn-primary" disabled={isSubmitting}>
                  {strings.SIGN_IN}
                </Button>
              </div>
              <div className="form-error">
                {errors.root && <Error message={errors.root.message!} />}
              </div>
            </form>
          </Paper>
        </div>
      )}
    </div>
  )
}

export default SignIn
