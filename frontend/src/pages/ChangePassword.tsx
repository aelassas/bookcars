import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Paper,
  Button
} from '@mui/material'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/change-password'
import * as UserService from '@/services/UserService'
import Footer from '@/components/Footer'
import * as helper from '@/utils/helper'
import { schema, FormFields } from '@/models/ChangePasswordForm'
import PasswordInput from '@/components/PasswordInput'

import '@/assets/css/change-password.css'

const ChangePassword = () => {
  const navigate = useNavigate()

  const [user, setUser] = useState<bookcarsTypes.User>()
  const [visible, setVisible] = useState(false)
  const [hasPassword, setHasPassword] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, clearErrors, setError, reset } = useForm<FormFields>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
  })

  const error = () => {
    helper.error(null, strings.PASSWORD_UPDATE_ERROR)
  }

  const onSubmit = async ({ currentPassword, newPassword }: FormFields) => {
    try {
      if (!user) {
        return
      }

      const status = hasPassword ? (await UserService.checkPassword(user._id as string, currentPassword!)) : 200

      if (status === 200) {
        const data: bookcarsTypes.ChangePasswordPayload = {
          _id: user._id as string,
          password: currentPassword || '',
          newPassword,
          strict: hasPassword,
        }

        const status = await UserService.changePassword(data)

        if (status === 200) {
          const _user = await UserService.getUser(user._id as string)

          if (_user) {
            setUser(_user)
            setHasPassword(true)
            reset()
            helper.info(strings.PASSWORD_UPDATE)
          } else {
            error()
          }
        } else {
          error()
        }
      } else {
        setError('currentPassword', { message: strings.CURRENT_PASSWORD_ERROR })
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const onLoad = async (_user?: bookcarsTypes.User) => {
    if (_user) {
      setUser(_user)

      const status = await UserService.hasPassword(_user._id!)
      setHasPassword(status === 200)

      setVisible(true)
    }
  }

  return (
    <Layout onLoad={onLoad} strict>
      {visible && (
        <>
          <div className="password-reset">
            <Paper className="password-reset-form password-reset-form-wrapper" elevation={10}>
              <h1 className="password-reset-form-title">{strings.CHANGE_PASSWORD_HEADING}</h1>
              <form className="form" onSubmit={handleSubmit(onSubmit)}>
                {hasPassword && (
                  <PasswordInput
                    label={strings.CURRENT_PASSWORD}
                    variant="standard"
                    {...register('currentPassword')}
                    error={!!errors.currentPassword}
                    helperText={errors.currentPassword?.message}
                    onChange={(e) => {
                      if (errors.currentPassword) {
                        clearErrors('currentPassword')
                      }
                      setValue('currentPassword', e.target.value)
                    }}
                    required
                  />
                )}

                <PasswordInput
                  label={strings.NEW_PASSWORD}
                  variant="standard"
                  {...register('newPassword')}
                  error={!!errors.newPassword}
                  helperText={errors.newPassword?.message}
                  onChange={(e) => {
                    if (errors.newPassword) {
                      clearErrors('newPassword')
                    }
                    setValue('newPassword', e.target.value)
                  }}
                  required
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
                />

                <div className="buttons">
                  <Button type="submit" className="btn-primary btn-margin btn-margin-bottom btn-cp" variant="contained" disabled={isSubmitting}>
                    {commonStrings.RESET_PASSWORD}
                  </Button>
                  <Button
                    className="btn-margin-bottom btn-cp"
                    variant="outlined"
                    color="primary"
                    onClick={() => {
                      navigate('/')
                    }}
                  >
                    {commonStrings.CANCEL}
                  </Button>
                </div>
              </form>
            </Paper>
          </div>

          <Footer />
        </>
      )}
    </Layout>
  )
}

export default ChangePassword
