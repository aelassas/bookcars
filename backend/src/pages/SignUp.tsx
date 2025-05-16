import React, { useState } from 'react'
import {
  Input,
  InputLabel,
  FormControl,
  FormHelperText,
  Button,
  Paper
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as bookcarsTypes from ':bookcars-types'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/sign-up'
import * as UserService from '@/services/UserService'
import Layout from '@/components/Layout'
import Error from '@/components/Error'
import Backdrop from '@/components/SimpleBackdrop'
import { useUserContext, UserContextType } from '@/context/UserContext'
import { schema, FormFields } from '@/models/SignUpForm'

import '@/assets/css/signup.css'

const SignUp = () => {
  const navigate = useNavigate()

  const { setUser, setUserLoaded } = useUserContext() as UserContextType

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

      const payload: bookcarsTypes.SignUpPayload = {
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        language: UserService.getLanguage(),
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
      setVisible(true)
    }
  }

  return (
    <Layout strict={false} onLoad={onLoad}>
      <div className="signup">
        <Paper className="signup-form" elevation={10} style={visible ? {} : { display: 'none' }}>
          <h1 className="signup-form-title">{strings.SIGN_UP_HEADING}</h1>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div>
              <FormControl fullWidth margin="dense">
                <InputLabel htmlFor="full-name">{commonStrings.FULL_NAME}</InputLabel>
                <Input
                  type="text"
                  {...register('fullName')}
                  autoComplete="off"
                  onChange={(e) => {
                    setValue('fullName', e.target.value)
                  }}
                  required
                />
              </FormControl>
              <FormControl fullWidth margin="dense">
                <InputLabel htmlFor="email">{commonStrings.EMAIL}</InputLabel>
                <Input
                  type="text"
                  {...register('email')}
                  autoComplete="off"
                  onChange={(e) => {
                    clearErrors('email')
                    setValue('email', e.target.value)
                  }}
                  required
                />
                <FormHelperText error={!!errors.email}>{errors.email?.message || ''}</FormHelperText>
              </FormControl>
              <FormControl fullWidth margin="dense">
                <InputLabel htmlFor="password">{commonStrings.PASSWORD}</InputLabel>
                <Input
                  {...register('password')}
                  type="password"
                  inputProps={{
                    autoComplete: 'new-password',
                    form: {
                      autoComplete: 'off',
                    },
                  }}
                  onChange={(e) => {
                    clearErrors('password')
                    setValue('password', e.target.value)
                  }}
                  required
                />
                <FormHelperText error={!!errors.password}>{errors.password?.message || ''}</FormHelperText>
              </FormControl>
              <FormControl fullWidth margin="dense">
                <InputLabel htmlFor="confirm-password">{commonStrings.CONFIRM_PASSWORD}</InputLabel>
                <Input
                  {...register('confirmPassword')}
                  type="password"
                  inputProps={{
                    autoComplete: 'new-password',
                    form: {
                      autoComplete: 'off',
                    },
                  }}
                  onChange={(e) => {
                    clearErrors('confirmPassword')
                    setValue('confirmPassword', e.target.value)
                  }}
                  required
                />
                <FormHelperText error={!!errors.confirmPassword}>{errors.confirmPassword?.message || ''}</FormHelperText>
              </FormControl>
              <div className="buttons">
                <Button type="submit" variant="contained" className="btn-primary btn-margin-bottom" size="small" disabled={isSubmitting}>
                  {strings.SIGN_UP}
                </Button>
                <Button variant="contained" className="btn-secondary btn-margin-bottom" size="small" onClick={() => navigate('/')}>
                  {commonStrings.CANCEL}
                </Button>
              </div>
            </div>
            <div className="form-error">
              {errors.root && <Error message={errors.root.message!} />}
            </div>
          </form>
        </Paper>
      </div>
      {isSubmitting && <Backdrop text={commonStrings.PLEASE_WAIT} />}
    </Layout>
  )
}

export default SignUp
