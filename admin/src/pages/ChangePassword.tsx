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
import NoMatch from '@/pages/NoMatch'
import PasswordInput from '@/components/PasswordInput'

import '@/assets/css/change-password.css'


const ChangePassword = () => {
  const navigate = useNavigate()

  const [loggedUser, setLoggedUser] = useState<bookcarsTypes.User>()
  const [userId, setUserId] = useState<string>()
  const [user, setUser] = useState<bookcarsTypes.User | null>()
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(false)
  const [strict, setStrict] = useState<boolean>(false)
  const [noMatch, setNoMatch] = useState(false)

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

      const status = strict ? (await UserService.checkPassword(userId || loggedUser?._id as string, currentPassword!)) : 200

      if (status === 200) {
        const data: bookcarsTypes.ChangePasswordPayload = {
          _id: userId || loggedUser?._id as string,
          password: currentPassword || '',
          newPassword,
          strict,
        }

        const status = await UserService.changePassword(data)

        if (status === 200) {
          setStrict(
            (user?.type === bookcarsTypes.UserType.Admin && loggedUser?.type === bookcarsTypes.UserType.Admin)
            || (user?.type === bookcarsTypes.UserType.Supplier && loggedUser?.type === bookcarsTypes.UserType.Supplier)
          )
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

  const onLoad = async (_loggedUser?: bookcarsTypes.User) => {
    if (_loggedUser) {
      const params = new URLSearchParams(window.location.search)
      let _userId = _loggedUser?._id
      let __user: bookcarsTypes.User | null = null
      if (params.has('u')) {
        _userId = params.get('u') || undefined
        setUserId(_userId)
        __user = await UserService.getUser(_userId)
      } else {
        setUserId(_loggedUser._id)
        __user = _loggedUser
      }

      if (_loggedUser.type === bookcarsTypes.UserType.Supplier
        && (__user?.type === bookcarsTypes.UserType.Admin || (__user?.type === bookcarsTypes.UserType.Supplier && __user._id !== _loggedUser._id))
      ) {
        setNoMatch(true)
        setLoading(false)
        return
      }

      const status = await UserService.hasPassword(_userId!)
      const __hasPassword = status === 200
      setStrict(__hasPassword
        && (
          (__user?.type === bookcarsTypes.UserType.Admin && _loggedUser.type === bookcarsTypes.UserType.Admin)
          || (__user?.type === bookcarsTypes.UserType.Supplier && _loggedUser.type === bookcarsTypes.UserType.Supplier)
        )
      )
      setLoggedUser(_loggedUser)
      setUser(__user)
      setLoading(false)
      setVisible(true)
    }
  }

  return (
    <Layout onLoad={onLoad} strict>
      {!noMatch && (<div className="password-reset" style={visible ? {} : { display: 'none' }}>
        <Paper className="password-reset-form password-reset-form-wrapper" elevation={10}>
          <h1 className="password-reset-form-title">{strings.CHANGE_PASSWORD_HEADING}</h1>
          <form className="form" onSubmit={handleSubmit(onSubmit)}>

            {strict && (
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
      </div>)}
      {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
      {noMatch && <NoMatch hideHeader />}
    </Layout>
  )
}

export default ChangePassword
