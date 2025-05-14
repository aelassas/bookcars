import React, { useState } from 'react'
import {
  OutlinedInput,
  InputLabel,
  FormControl,
  FormHelperText,
  Button,
  Paper,
  Checkbox,
  Link
} from '@mui/material'
import validator from 'validator'
import { intervalToDuration } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import * as bookcarsTypes from ':bookcars-types'
import env from '@/config/env.config'
import * as helper from '@/common/helper'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/sign-up'
import * as UserService from '@/services/UserService'
import { useUserContext, UserContextType } from '@/context/UserContext'
import { useRecaptchaContext, RecaptchaContextType } from '@/context/RecaptchaContext'
import Layout from '@/components/Layout'
import Error from '@/components/Error'
import Backdrop from '@/components/SimpleBackdrop'
import DatePicker from '@/components/DatePicker'
import SocialLogin from '@/components/SocialLogin'
import Footer from '@/components/Footer'

import '@/assets/css/signup.css'

const schema = z.object({
  fullName: z.string(),
  email: z.string().refine((value) => !value || validator.isEmail(value), { message: commonStrings.EMAIL_NOT_VALID }),
  phone: z.string().refine((value) => !value || validator.isMobilePhone(value), { message: commonStrings.PHONE_NOT_VALID }),
  birthDate: z.date().refine((value) => {
    const sub = intervalToDuration({ start: value, end: new Date() }).years ?? 0
    return sub >= env.MINIMUM_AGE
  }, { message: commonStrings.BIRTH_DATE_NOT_VALID }),
  password: z.string().min(env.PASSWORD_MIN_LENGTH, { message: commonStrings.PASSWORD_ERROR }),
  confirmPassword: z.string(),
  tos: z.boolean().refine((value) => value, { message: commonStrings.TOS_ERROR })
}).refine((data) => data.password === data.confirmPassword, {
  path: ['confirmPassword'],
  message: commonStrings.PASSWORDS_DONT_MATCH,
})

type FormFields = z.infer<typeof schema>

const SignUp = () => {
  const navigate = useNavigate()

  const { setUser, setUserLoaded } = useUserContext() as UserContextType
  const { reCaptchaLoaded, generateReCaptchaToken } = useRecaptchaContext() as RecaptchaContextType

  const [language, setLanguage] = useState(env.DEFAULT_LANGUAGE)
  const [recaptchaError, setRecaptchaError] = useState(false)
  const [visible, setVisible] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError, clearErrors, setValue } = useForm<FormFields>({
    resolver: zodResolver(schema),
    mode: 'onSubmit'
  })

  const onSubmit = async (data: FormFields) => {
    try {
      const emailStatus = await UserService.validateEmail({ email: data.email })
      if (emailStatus !== 200) {
        setError('email', { message: commonStrings.EMAIL_ALREADY_REGISTERED })
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
        setRecaptchaError(true)
        return
      }

      const payload: bookcarsTypes.SignUpPayload = {
        email: data.email,
        phone: data.phone,
        password: data.password,
        fullName: data.fullName,
        birthDate: data.birthDate,
        language: UserService.getLanguage()
      }

      const status = await UserService.signup(payload)

      if (status === 200) {
        const signInResult = await UserService.signin({
          email: data.email,
          password: data.password,
        })

        if (signInResult.status === 200) {
          const user = await UserService.getUser(signInResult.data._id)
          setUser(user)
          setUserLoaded(true)
          navigate(`/${window.location.search}`)
        }
      }
    } catch (err) {
      console.error(err)
      setError('root', { message: strings.SIGN_UP_ERROR })
    }
  }

  const onLoad = (user?: bookcarsTypes.User) => {
    if (user) {
      navigate('/')
    } else {
      setLanguage(UserService.getLanguage())
      setVisible(true)
    }
  }

  return (
    <Layout strict={false} onLoad={onLoad}>
      <div className="signup">
        <Paper className={`signup-form ${visible ? '' : 'hidden'}`} elevation={10}>
          <h1 className="signup-form-title">{strings.SIGN_UP_HEADING}</h1>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div>
              <FormControl fullWidth margin="dense" error={!!errors.fullName}>
                <InputLabel className="required">{commonStrings.FULL_NAME}</InputLabel>
                <OutlinedInput
                  type="text"
                  {...register('fullName')}
                  label={commonStrings.FULL_NAME}
                  autoComplete="off"
                  required
                />
              </FormControl>
              <FormControl fullWidth margin="dense" error={!!errors.email}>
                <InputLabel className="required">{commonStrings.EMAIL}</InputLabel>
                <OutlinedInput
                  type="text"
                  {...register('email')}
                  label={commonStrings.EMAIL}
                  autoComplete="off"
                  onChange={() => {
                    clearErrors('email')
                  }}
                  required
                />
                <FormHelperText error={!!errors.email}>{errors.email?.message || ''}</FormHelperText>
              </FormControl>
              <FormControl fullWidth margin="dense" error={!!errors.phone}>
                <InputLabel className="required">{commonStrings.PHONE}</InputLabel>
                <OutlinedInput
                  type="text"
                  {...register('phone')}
                  label={commonStrings.PHONE}
                  autoComplete="off"
                  onChange={() => {
                    clearErrors('phone')
                  }}
                  required
                />
                <FormHelperText error={!!errors.phone}>{errors.phone?.message || ''}</FormHelperText>
              </FormControl>
              <FormControl fullWidth margin="dense" error={!!errors.birthDate}>
                <DatePicker
                  label={commonStrings.BIRTH_DATE}
                  variant="outlined"
                  required
                  onChange={(birthDate) => {
                    if (birthDate) {
                      clearErrors('birthDate')
                      setValue('birthDate', birthDate, { shouldValidate: true })
                    }
                  }}
                  language={language}
                />

                <FormHelperText error={!!errors.birthDate}>{errors.birthDate?.message || ''}</FormHelperText>
              </FormControl>
              <FormControl fullWidth margin="dense" error={!!errors.password}>
                <InputLabel className="required">{commonStrings.PASSWORD}</InputLabel>
                <OutlinedInput
                  {...register('password')}
                  type="password"
                  label={commonStrings.PASSWORD}
                  inputProps={{
                    autoComplete: 'new-password',
                    form: {
                      autoComplete: 'off',
                    },
                  }}
                  onChange={() => {
                    clearErrors('password')
                  }}
                  required
                />
                <FormHelperText error={!!errors.password}>{errors.password?.message || ''}</FormHelperText>
              </FormControl>
              <FormControl fullWidth margin="dense" error={!!errors.confirmPassword}>
                <InputLabel className="required">{commonStrings.CONFIRM_PASSWORD}</InputLabel>
                <OutlinedInput
                  {...register('confirmPassword')}
                  type="password"
                  label={commonStrings.CONFIRM_PASSWORD}
                  inputProps={{
                    autoComplete: 'new-password',
                    form: {
                      autoComplete: 'off',
                    },
                  }}
                  onChange={() => {
                    clearErrors('confirmPassword')
                  }}
                  required
                />
                <FormHelperText error={!!errors.confirmPassword}>{errors.confirmPassword?.message || ''}</FormHelperText>
              </FormControl>

              <div className="signup-tos">
                <table>
                  <tbody>
                    <tr>
                      <td aria-label="tos">
                        <Checkbox
                          {...register('tos')}
                          color="primary"
                          onChange={() => clearErrors('tos')}
                        />
                      </td>
                      <td>
                        <Link href="/tos" target="_blank" rel="noreferrer">
                          {commonStrings.TOS}
                        </Link>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2}>
                        <FormHelperText error={!!errors.tos}>{errors.tos?.message || ''}</FormHelperText>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <SocialLogin redirectToHomepage />

              <div className="buttons">
                <Button type="submit" variant="contained" className="btn-primary btn-margin-bottom" disabled={isSubmitting}>
                  {strings.SIGN_UP}
                </Button>
                <Button variant="outlined" color="primary" className="btn-margin-bottom" onClick={() => navigate('/')}>
                  {commonStrings.CANCEL}
                </Button>
              </div>
            </div>
            <div className="form-error">
              {errors.root && <Error message={errors.root.message!} />}
              {recaptchaError && <Error message={commonStrings.RECAPTCHA_ERROR} />}
            </div>
          </form>
        </Paper>
      </div>

      <Footer />

      {isSubmitting && <Backdrop text={commonStrings.PLEASE_WAIT} />}
    </Layout>
  )
}

export default SignUp
