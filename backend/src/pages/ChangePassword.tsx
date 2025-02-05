import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Paper,
  Input,
  InputLabel,
  FormControl,
  FormHelperText,
  Button
} from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/change-password'
import * as UserService from '@/services/UserService'
import Backdrop from '@/components/SimpleBackdrop'
import * as helper from '@/common/helper'

import '@/assets/css/change-password.css'

const ChangePassword = () => {
  const navigate = useNavigate()

  const [loggedUser, setLoggedUser] = useState<bookcarsTypes.User>()
  const [userId, setUserId] = useState<string>()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [newPasswordError, setNewPasswordError] = useState(false)
  const [confirmPasswordError, setConfirmPasswordError] = useState(false)
  const [passwordLengthError, setPasswordLengthError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [currentPasswordError, setCurrentPasswordError] = useState(false)

  const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPassword(e.target.value)
  }

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value)
  }

  const handleCurrentPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentPassword(e.target.value)
  }

  const error = () => {
    helper.error(null, strings.PASSWORD_UPDATE_ERROR)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement> | React.KeyboardEvent<HTMLElement>) => {
    try {
      e.preventDefault()

      if (!userId && !loggedUser) {
        error()
        return
      }

      const submit = async () => {
        if (newPassword.length < 6) {
          setPasswordLengthError(true)
          setConfirmPasswordError(false)
          setNewPasswordError(false)
          return
        }
        setPasswordLengthError(false)
        setNewPasswordError(false)

        if (newPassword !== confirmPassword) {
          setConfirmPasswordError(true)
          setNewPasswordError(false)
          return
        }
        setConfirmPasswordError(false)
        setNewPasswordError(false)

        const data: bookcarsTypes.ChangePasswordPayload = {
          _id: userId || loggedUser?._id as string,
          password: currentPassword,
          newPassword,
          strict: true,
        }

        const status = await UserService.changePassword(data)

        if (status === 200) {
          setNewPasswordError(false)
          setCurrentPassword('')
          setNewPassword('')
          setConfirmPassword('')
          helper.info(strings.PASSWORD_UPDATE)
        } else {
          error()
        }
      }

      const status = await UserService.checkPassword(userId || loggedUser?._id as string, currentPassword)

      setCurrentPasswordError(status !== 200)
      setNewPasswordError(false)
      setPasswordLengthError(false)
      setConfirmPasswordError(false)

      if (status === 200) {
        submit()
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const handleConfirmPasswordKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter') {
      handleSubmit(e)
    }
  }

  const onLoad = (user?: bookcarsTypes.User) => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('u')) {
      const _userId = params.get('u') || undefined
      setUserId(_userId)
    }
    setLoggedUser(user)
    setLoading(false)
    setVisible(true)
  }

  return (
    <Layout onLoad={onLoad} strict>
      <div className="password-reset" style={visible ? {} : { display: 'none' }}>
        <Paper className="password-reset-form password-reset-form-wrapper" elevation={10}>
          <h1 className="password-reset-form-title">
            {' '}
            {strings.CHANGE_PASSWORD_HEADING}
            {' '}
          </h1>
          <form className="form" onSubmit={handleSubmit}>
            <FormControl fullWidth margin="dense">
              <InputLabel error={currentPasswordError} className="required">
                {strings.CURRENT_PASSWORD}
              </InputLabel>
              <Input id="password-current" onChange={handleCurrentPasswordChange} value={currentPassword} error={currentPasswordError} type="password" required />
              <FormHelperText error={currentPasswordError}>{(currentPasswordError && strings.CURRENT_PASSWORD_ERROR) || ''}</FormHelperText>
            </FormControl>
            <FormControl fullWidth margin="dense">
              <InputLabel className="required" error={newPasswordError}>
                {strings.NEW_PASSWORD}
              </InputLabel>
              <Input id="password-new" onChange={handleNewPasswordChange} type="password" value={newPassword} error={newPasswordError || passwordLengthError} required />
              <FormHelperText error={newPasswordError || passwordLengthError}>
                {(newPasswordError && strings.NEW_PASSWORD_ERROR) || (passwordLengthError && commonStrings.PASSWORD_ERROR) || ''}
              </FormHelperText>
            </FormControl>
            <FormControl fullWidth margin="dense" error={confirmPasswordError}>
              <InputLabel error={confirmPasswordError} className="required">
                {commonStrings.CONFIRM_PASSWORD}
              </InputLabel>
              <Input
                id="password-confirm"
                onChange={handleConfirmPasswordChange}
                onKeyDown={handleConfirmPasswordKeyDown}
                error={confirmPasswordError}
                type="password"
                value={confirmPassword}
                required
              />
              <FormHelperText error={confirmPasswordError}>{confirmPasswordError && commonStrings.PASSWORDS_DONT_MATCH}</FormHelperText>
            </FormControl>
            <div className="buttons">
              <Button type="submit" className="btn-primary btn-margin btn-margin-bottom" size="small" variant="contained">
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
