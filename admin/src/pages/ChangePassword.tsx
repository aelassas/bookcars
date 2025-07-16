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
import Backdrop from '@/components/SimpleBackdrop'
import * as helper from '@/utils/helper'
import { schema, FormFields } from '@/models/ChangePasswordForm'

import '@/assets/css/change-password.css'
import PasswordInput from '@/components/PasswordInput'

const ChangePassword = () => {
  const navigate = useNavigate()

  const [loggedUser, setLoggedUser] = useState<bookcarsTypes.User>()
  const [userId, setUserId] = useState<string>()
  const [loading, setLoading] = useState(true)
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
      if (!userId && !loggedUser) {
        return
      }

      const status = hasPassword ? (await UserService.checkPassword(userId || loggedUser?._id as string, currentPassword!)) : 200

      if (status === 200) {
        const data: bookcarsTypes.ChangePasswordPayload = {
          _id: userId || loggedUser?._id as string,
          password: currentPassword || '',
          newPassword,
          strict: hasPassword,
        }

        const status = await UserService.changePassword(data)

        if (status === 200) {
          setHasPassword(true)
          reset()
          helper.info(strings.PASSWORD_UPDATE)
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

  const onLoad = async (user?: bookcarsTypes.User) => {
    if (user) {
      const params = new URLSearchParams(window.location.search)
      let _userId = user?._id
      if (params.has('u')) {
        _userId = params.get('u') || undefined
        setUserId(_userId)
      }
      const status = await UserService.hasPassword(_userId!)
      setHasPassword(status === 200)
      setLoggedUser(user)
      setLoading(false)
      setVisible(true)
    }
  }

  return (
    <Layout onLoad={onLoad} strict>
      <div className="password-reset" style={visible ? {} : { display: 'none' }}>
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
              <Button type="submit" className="btn-primary btn-margin btn-margin-bottom" size="small" variant="contained" disabled={isSubmitting}>
                {commonStrings.RESET_PASSWORD}
              </Button>
              <Button className="btn-secondary btn-margin-bottom" size="small" variant="contained" onClick={() => navigate('/')}>
                {commonStrings.CANCEL}
              </Button>
            </div>
          </form>
        </Paper>
      </div>
      {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
    </Layout>
  )
}

export default ChangePassword
