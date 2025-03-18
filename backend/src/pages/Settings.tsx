import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Input,
  InputLabel,
  FormHelperText,
  FormControl,
  FormControlLabel,
  Switch,
  Button,
  Paper
} from '@mui/material'
import validator from 'validator'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import Layout from '@/components/Layout'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/settings'
import * as UserService from '@/services/UserService'
import * as BankDetailsService from '@/services/BankDetailsService'
import Backdrop from '@/components/SimpleBackdrop'
import Avatar from '@/components/Avatar'
import * as helper from '@/common/helper'
import { useUserContext, UserContextType } from '@/context/UserContext'

import '@/assets/css/settings.css'

const Settings = () => {
  const navigate = useNavigate()

  const { user, setUser } = useUserContext() as UserContextType

  const [admin, setAdmin] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  const [bio, setBio] = useState('')
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [phoneValid, setPhoneValid] = useState(true)
  const [enableEmailNotifications, setEnableEmailNotifications] = useState(false)

  const [bankDetailsId, setBankDetailsId] = useState('')
  const [accountHolder, setAccountHolder] = useState('')
  const [bankName, setBankName] = useState('')
  const [iban, setIban] = useState('')
  const [swiftBic, setSwiftBic] = useState('')
  const [showBankDetailsPage, setShowBankDetailsPage] = useState(true)

  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFullName(e.target.value)
  }

  const validatePhone = (_phone?: string) => {
    if (_phone) {
      const _phoneValid = validator.isMobilePhone(_phone)
      setPhoneValid(_phoneValid)

      return _phoneValid
    }
    setPhoneValid(true)

    return true
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(e.target.value)

    if (!e.target.value) {
      setPhoneValid(true)
    }
  }

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocation(e.target.value)
  }

  const handleBioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBio(e.target.value)
  }

  const handleEmailNotificationsChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (user) {
        setEnableEmailNotifications(e.target.checked)

        const _user = bookcarsHelper.clone(user) as bookcarsTypes.User
        _user.enableEmailNotifications = e.target.checked

        const payload: bookcarsTypes.UpdateEmailNotificationsPayload = {
          _id: user._id as string,
          enableEmailNotifications: _user.enableEmailNotifications
        }
        const status = await UserService.updateEmailNotifications(payload)

        if (status === 200) {
          setUser(_user)
          helper.info(strings.SETTINGS_UPDATED)
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

  const onBeforeUpload = () => {
    setLoading(true)
  }

  const onAvatarChange = (avatar: string) => {
    const _user = bookcarsHelper.clone(user)
    _user.avatar = avatar
    setUser(_user)
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    try {
      e.preventDefault()

      if (!user) {
        helper.error()
        return
      }

      const _phoneValid = validatePhone(phone)
      if (!_phoneValid) {
        return
      }

      const data: bookcarsTypes.UpdateUserPayload = {
        _id: user._id as string,
        fullName,
        phone,
        location,
        bio,
      }

      const status = await UserService.updateUser(data)

      if (status === 200) {
        helper.info(strings.SETTINGS_UPDATED)
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const handleBankDetailsSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    try {
      e.preventDefault()

      const payload: bookcarsTypes.UpsertBankDetailsPayload = {
        _id: bankDetailsId || undefined,
        accountHolder,
        bankName,
        iban,
        swiftBic,
        showBankDetailsPage,
      }

      const { status, data } = await BankDetailsService.upsertBankDetails(payload)

      if (status === 200) {
        helper.info(strings.SETTINGS_UPDATED)
        setBankDetailsId(data._id)
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const onLoad = async (_user?: bookcarsTypes.User) => {
    if (_user) {
      setUser(_user)
      setAdmin(helper.admin(_user))
      setFullName(_user.fullName)
      setPhone(_user.phone || '')
      setLocation(_user.location || '')
      setBio(_user.bio || '')
      setEnableEmailNotifications(_user.enableEmailNotifications || false)

      const bankDetails = await BankDetailsService.getBankDetails()
      if (bankDetails) {
        setBankDetailsId(bankDetails._id)
        setAccountHolder(bankDetails.accountHolder)
        setBankName(bankDetails.bankName)
        setIban(bankDetails.iban)
        setSwiftBic(bankDetails.swiftBic)
        setShowBankDetailsPage(bankDetails.showBankDetailsPage)
      }

      setVisible(true)
      setLoading(false)
    }
  }

  return (
    <Layout onLoad={onLoad} strict>
      {visible && user && (
        <div className="settings">

          <Paper className="settings-form settings-form-wrapper" elevation={10}>
            <form onSubmit={handleSubmit}>
              <Avatar
                type={user.type}
                mode="update"
                record={user}
                size="large"
                // readonly={false}
                readonly
                onBeforeUpload={onBeforeUpload}
                onChange={onAvatarChange}
                hideDelete={!admin}
                color="disabled"
                className="avatar-ctn"
              />
              <FormControl fullWidth margin="dense">
                <InputLabel className="required">{commonStrings.FULL_NAME}</InputLabel>
                <Input id="full-name" type="text" required onChange={handleFullNameChange} autoComplete="off" value={fullName} />
              </FormControl>
              <FormControl fullWidth margin="dense">
                <InputLabel className="required">{commonStrings.EMAIL}</InputLabel>
                <Input id="email" type="text" value={user.email} disabled />
              </FormControl>
              <FormControl fullWidth margin="dense">
                <InputLabel>{commonStrings.PHONE}</InputLabel>
                <Input id="phone" type="text" error={!phoneValid} onChange={handlePhoneChange} autoComplete="off" value={phone} />
                <FormHelperText error={!phoneValid}>{(!phoneValid && commonStrings.PHONE_NOT_VALID) || ''}</FormHelperText>
              </FormControl>
              <FormControl fullWidth margin="dense">
                <InputLabel>{commonStrings.LOCATION}</InputLabel>
                <Input id="location" type="text" onChange={handleLocationChange} autoComplete="off" value={location} />
              </FormControl>
              <FormControl fullWidth margin="dense">
                <InputLabel>{commonStrings.BIO}</InputLabel>
                <Input id="bio" type="text" onChange={handleBioChange} autoComplete="off" value={bio} />
              </FormControl>
              <div className="buttons">
                <Button variant="contained" className="btn-primary btn-margin btn-margin-bottom" size="small" onClick={() => navigate('/change-password')}>
                  {commonStrings.RESET_PASSWORD}
                </Button>
                <Button type="submit" variant="contained" className="btn-primary btn-margin-bottom" size="small">
                  {commonStrings.SAVE}
                </Button>
                <Button variant="contained" className="btn-secondary btn-margin-bottom" size="small" onClick={() => navigate('/')}>
                  {commonStrings.CANCEL}
                </Button>
              </div>
            </form>
          </Paper>

          <Paper className="settings-net settings-net-wrapper" elevation={10}>
            <h1 className="settings-form-title">
              {' '}
              {strings.NETWORK_SETTINGS}
              {' '}
            </h1>
            <FormControl component="fieldset">
              <FormControlLabel
                control={(
                  <Switch
                    checked={enableEmailNotifications}
                    onChange={handleEmailNotificationsChange}
                  />
                )}
                label={strings.SETTINGS_EMAIL_NOTIFICATIONS}
              />
            </FormControl>
          </Paper>

          {user.type === bookcarsTypes.UserType.Admin && (
            <Paper className="settings-form settings-form-wrapper" elevation={10}>
              <form onSubmit={handleBankDetailsSubmit}>
                <h1 className="settings-form-title">
                  {' '}
                  {strings.BANK_DETAILS}
                  {' '}
                </h1>

                <FormControl fullWidth margin="dense">
                  <InputLabel className="required">{strings.ACCOUNT_HOLDER}</InputLabel>
                  <Input type="text" required onChange={(e) => setAccountHolder(e.target.value)} autoComplete="off" value={accountHolder} />
                </FormControl>

                <FormControl fullWidth margin="dense">
                  <InputLabel className="required">{strings.BANK_NAME}</InputLabel>
                  <Input type="text" required onChange={(e) => setBankName(e.target.value)} autoComplete="off" value={bankName} />
                </FormControl>

                <FormControl fullWidth margin="dense">
                  <InputLabel className="required">{strings.IBAN}</InputLabel>
                  <Input type="text" required onChange={(e) => setIban(e.target.value)} autoComplete="off" value={iban} />
                </FormControl>

                <FormControl fullWidth margin="dense">
                  <InputLabel className="required">{strings.SWIFT_BIC}</InputLabel>
                  <Input type="text" required onChange={(e) => setSwiftBic(e.target.value)} autoComplete="off" value={swiftBic} />
                </FormControl>

                <FormControl component="fieldset">
                  <FormControlLabel
                    control={(
                      <Switch
                        checked={showBankDetailsPage}
                        onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
                          setShowBankDetailsPage(e.target.checked)
                        }}
                      />
                    )}
                    label={strings.SHOW_BANK_DETAILS_PAGE}
                  />
                </FormControl>

                <div className="buttons">
                  <Button type="submit" variant="contained" className="btn-primary btn-margin-bottom" size="small" disabled>
                    {commonStrings.SAVE}
                  </Button>
                  <Button variant="contained" className="btn-secondary btn-margin-bottom" size="small" onClick={() => navigate('/')}>
                    {commonStrings.CANCEL}
                  </Button>
                </div>
              </form>
            </Paper>
          )}

        </div>
      )}
      {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
    </Layout>
  )
}

export default Settings
