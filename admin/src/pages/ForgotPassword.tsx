import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  FormControl,
  InputLabel,
  OutlinedInput,
  FormHelperText,
  Button,
  Paper,
} from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import * as UserService from '@/services/UserService'
import Layout from '@/components/Layout'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/reset-password'
import * as helper from '@/utils/helper'
import env from '@/config/env.config'
import { schema, FormFields } from '@/models/ForgotPasswordForm'

import '@/assets/css/forgot-password.css'

const ForgotPassword = () => {
  const navigate = useNavigate()

  const [visible, setVisible] = useState(false)
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    clearErrors,
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
  })

  const onLoad = (user?: bookcarsTypes.User) => {
    if (user) {
      navigate('/')
    } else {
      setVisible(true)
    }
  }

  const onSubmit = async ({ email }: FormFields) => {
    try {
      const status = await UserService.resend(email, true, env.APP_TYPE)
      if (status === 200) {
        setSent(true)
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    }
  }

  return (
    <Layout onLoad={onLoad} strict={false}>
      <div className="forgot-password">
        <Paper className={`forgot-password-form ${visible ? '' : 'hidden'}`} elevation={10}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <h1 className="forgot-password-title">{strings.RESET_PASSWORD_HEADING}</h1>

            {!sent ? (
              <>
                <p className="forgot-password-subtitle">{strings.RESET_PASSWORD}</p>

                <FormControl fullWidth margin="dense" variant="outlined" error={!!errors.email}>
                  <InputLabel htmlFor="email">{commonStrings.EMAIL}</InputLabel>
                  <OutlinedInput
                    id="email"
                    label={commonStrings.EMAIL}
                    {...register('email')}
                    onChange={() => {
                      if (errors.email) {
                        clearErrors('email')
                      }
                    }}
                    autoComplete="email"
                    required
                  />
                  <FormHelperText error={!!errors.email}>
                    {errors.email?.message || ''}
                  </FormHelperText>
                </FormControl>

                <div className="buttons">
                  <Button type="submit" variant="contained" className="btn-primary btn-margin-bottom" disabled={isSubmitting}>
                    {strings.RESET}
                  </Button>
                  <Button variant="outlined" color="primary" className="btn-margin-bottom" onClick={() => navigate('/')}>
                    {commonStrings.CANCEL}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="forgot-password-sent">{strings.EMAIL_SENT}</p>

                <div className="buttons">
                  <Button variant="contained" className="btn-primary" onClick={() => navigate('/')}>
                    {commonStrings.GO_TO_HOME}
                  </Button>
                </div>
              </>
            )}
          </form>
        </Paper>
      </div>
    </Layout>
  )
}

export default ForgotPassword
