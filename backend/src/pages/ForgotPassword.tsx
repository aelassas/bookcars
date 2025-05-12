import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input, InputLabel, FormControl, FormHelperText, Button, Paper } from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import * as UserService from '@/services/UserService'
import Layout from '@/components/Layout'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/reset-password'
import * as helper from '@/common/helper'
import env from '@/config/env.config'

import '@/assets/css/forgot-password.css'

const schema = z.object({
  email: z.string().email({ message: commonStrings.EMAIL_NOT_VALID })
})

type FormFields = z.infer<typeof schema>

const ForgotPassword = () => {
  const navigate = useNavigate()

  const [visible, setVisible] = useState(false)
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
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
      const emailStatus = await UserService.validateEmail({ email, appType: env.APP_TYPE })
      if (emailStatus === 200) {
        // User not found, show error
        setError('email', { message: strings.EMAIL_ERROR })
        return
      }

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
          <h1 className="forgot-password-title">{strings.RESET_PASSWORD_HEADING}</h1>

          <div className={sent ? 'hidden' : ''}>
            <form onSubmit={handleSubmit(onSubmit)}>
              <FormControl fullWidth margin="dense">
                <InputLabel className="required">{commonStrings.EMAIL}</InputLabel>
                <Input
                  {...register('email')}
                  onChange={() => clearErrors('email')}
                  type="text"
                  error={!!errors.email}
                  autoComplete="off"
                  required
                />
                <FormHelperText error={!!errors.email}>
                  {errors.email?.message || ''}
                </FormHelperText>
              </FormControl>

              <div className="buttons">
                <Button type="submit" className="btn-primary" variant="contained" disabled={isSubmitting}>
                  {strings.RESET}
                </Button>
                <Button variant="outlined" onClick={() => navigate('/')}>
                  {commonStrings.CANCEL}
                </Button>
              </div>
            </form>
          </div>

          {sent && (
            <div>
              <span>{strings.EMAIL_SENT}</span>
              <p>
                <Button variant="text" onClick={() => navigate('/')} className="btn-lnk">
                  {commonStrings.GO_TO_HOME}
                </Button>
              </p>
            </div>
          )}
        </Paper>
      </div>
    </Layout>
  )
}

export default ForgotPassword
