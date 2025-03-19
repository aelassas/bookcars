import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Input,
  InputLabel,
  FormControl,
  FormHelperText,
  Button,
  Paper,
  FormControlLabel,
  Switch
} from '@mui/material'
import { Info as InfoIcon } from '@mui/icons-material'
import validator from 'validator'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import Layout from '@/components/Layout'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings as ccStrings } from '@/lang/create-supplier'
import * as SupplierService from '@/services/SupplierService'
import * as UserService from '@/services/UserService'
import * as helper from '@/common/helper'
import Error from '@/components/Error'
import Backdrop from '@/components/SimpleBackdrop'
import NoMatch from './NoMatch'
import Avatar from '@/components/Avatar'
import ContractList from '@/components/ContractList'

import '@/assets/css/update-supplier.css'

const UpdateSupplier = () => {
  const navigate = useNavigate()

  const [user, setUser] = useState<bookcarsTypes.User>()
  const [supplier, setSupplier] = useState<bookcarsTypes.User>()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  const [bio, setBio] = useState('')
  const [error, setError] = useState(false)
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fullNameError, setFullNameError] = useState(false)
  const [noMatch, setNoMatch] = useState(false)
  const [avatar, setAvatar] = useState('')
  const [avatarError, setAvatarError] = useState(false)
  const [email, setEmail] = useState('')
  const [phoneValid, setPhoneValid] = useState(true)
  const [payLater, setPayLater] = useState(false)
  const [licenseRequired, setLicenseRequired] = useState(true)
  const [minimumRentalDays, setMinimumRentalDays] = useState('')
  const [priceChangeRate, setPriceChangeRate] = useState('')
  const [supplierCarLimit, setSupplierCarLimit] = useState('')
  const [notifyAdminOnNewCar, setNotifyAdminOnNewCar] = useState(false)

  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFullName(e.target.value)

    if (!e.target.value) {
      setFullNameError(false)
    }
  }

  const validateFullName = async (_fullName: string) => {
    if (supplier && _fullName) {
      if (supplier.fullName !== _fullName) {
        try {
          const status = await SupplierService.validate({ fullName: _fullName })

          if (status === 200) {
            setFullNameError(false)
            return true
          }
          setFullNameError(true)
          setAvatarError(false)
          setError(false)
          return false
        } catch (err) {
          helper.error(err)
          return true
        }
      } else {
        setFullNameError(false)
        setAvatarError(false)
        setError(false)
        return true
      }
    } else {
      setFullNameError(true)
      setAvatarError(false)
      setError(false)
      return false
    }
  }

  const handleFullNameBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    await validateFullName(e.target.value)
  }

  const handleSupplierCarLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSupplierCarLimit(e.target.value)
  }

  const handleMinimumRentalDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMinimumRentalDays(e.target.value)
  }

  const handlePriceChangeRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPriceChangeRate(e.target.value)
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(e.target.value)

    if (!e.target.value) {
      setPhoneValid(true)
    }
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

  const handlePhoneBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    validatePhone(e.target.value)
  }

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocation(e.target.value)
  }

  const handleBioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBio(e.target.value)
  }

  const onBeforeUpload = () => {
    setLoading(true)
  }

  const onAvatarChange = (_avatar: string) => {
    if (supplier && user) {
      const _supplier = bookcarsHelper.clone(supplier)
      _supplier.avatar = _avatar

      if (user._id === supplier._id) {
        const _user = bookcarsHelper.clone(user)
        _user.avatar = _avatar
        setUser(_user)
      }

      setLoading(false)
      setSupplier(_supplier)

      if (_avatar) {
        setAvatarError(false)
      }
    } else {
      helper.error()
    }
  }

  const handleResendActivationLink = async () => {
    if (supplier) {
      try {
        const status = await UserService.resend(supplier.email, false, env.APP_TYPE)

        if (status === 200) {
          helper.info(commonStrings.ACTIVATION_EMAIL_SENT)
        } else {
          helper.error()
        }
      } catch (err) {
        helper.error(err)
      }
    }
  }

  const onLoad = async (_user?: bookcarsTypes.User) => {
    if (_user && _user.verified) {
      setLoading(true)
      setUser(_user)

      const params = new URLSearchParams(window.location.search)
      if (params.has('c')) {
        const id = params.get('c')
        if (id && id !== '') {
          try {
            const _supplier = await SupplierService.getSupplier(id)

            if (_supplier) {
              setSupplier(_supplier)
              setEmail(_supplier.email || '')
              setAvatar(_supplier.avatar || '')
              setFullName(_supplier.fullName || '')
              setPhone(_supplier.phone || '')
              setLocation(_supplier.location || '')
              setBio(_supplier.bio || '')
              setPayLater(_supplier.payLater || false)
              setLicenseRequired(_supplier.licenseRequired || false)
              setMinimumRentalDays(_supplier.minimumRentalDays?.toString() || '')
              setPriceChangeRate(_supplier.priceChangeRate?.toString() || '')
              setSupplierCarLimit(_supplier.supplierCarLimit?.toString() || '')
              setNotifyAdminOnNewCar(!!_supplier.notifyAdminOnNewCar)
              setVisible(true)
              setLoading(false)
            } else {
              setLoading(false)
              setNoMatch(true)
            }
          } catch (err) {
            helper.error(err)
            setLoading(false)
            setError(true)
            setVisible(false)
          }
        } else {
          setLoading(false)
          setNoMatch(true)
        }
      } else {
        setLoading(false)
        setNoMatch(true)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    try {
      e.preventDefault()

      const fullNameValid = await validateFullName(fullName)
      if (!fullNameValid) {
        return
      }

      const _phoneValid = validatePhone(phone)
      if (!_phoneValid) {
        return
      }

      if (!avatar) {
        setAvatarError(true)
        setError(false)
        return
      }

      if (!supplier) {
        helper.error()
        return
      }

      const data: bookcarsTypes.UpdateSupplierPayload = {
        _id: supplier._id as string,
        fullName,
        phone,
        location,
        bio,
        payLater,
        licenseRequired,
        minimumRentalDays: minimumRentalDays ? Number(minimumRentalDays) : undefined,
        priceChangeRate: priceChangeRate ? Number(priceChangeRate) : undefined,
        supplierCarLimit: supplierCarLimit ? Number(supplierCarLimit) : undefined,
        notifyAdminOnNewCar,
      }

      const res = await SupplierService.update(data)

      if (res.status === 200) {
        setSupplier(res.data)
        helper.info(commonStrings.UPDATED)
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const admin = helper.admin(user)

  return (
    <Layout onLoad={onLoad} strict>
      {visible && (
        <div className="update-supplier">
          <Paper className="supplier-form-update" elevation={10}>
            <form onSubmit={handleSubmit}>
              <Avatar
                type={bookcarsTypes.RecordType.Supplier}
                mode="update"
                record={supplier}
                size="large"
                readonly={false}
                hideDelete
                onBeforeUpload={onBeforeUpload}
                onChange={onAvatarChange}
                color="disabled"
                className="avatar-ctn"
              />

              <div className="info">
                <InfoIcon />
                <span>{ccStrings.RECOMMENDED_IMAGE_SIZE}</span>
              </div>

              <FormControl fullWidth margin="dense">
                <InputLabel className="required">{commonStrings.FULL_NAME}</InputLabel>
                <Input id="full-name" type="text" error={fullNameError} required onBlur={handleFullNameBlur} onChange={handleFullNameChange} autoComplete="off" value={fullName} />
                <FormHelperText error={fullNameError}>{(fullNameError && ccStrings.INVALID_SUPPLIER_NAME) || ''}</FormHelperText>
              </FormControl>

              <FormControl fullWidth margin="dense">
                <InputLabel className="required">{commonStrings.EMAIL}</InputLabel>
                <Input id="email" type="text" value={email} disabled />
              </FormControl>

              <FormControl fullWidth margin="dense">
                <FormControlLabel
                  control={(
                    <Switch
                      checked={payLater}
                      onChange={(e) => {
                        setPayLater(e.target.checked)
                      }}
                      color="primary"
                    />
                  )}
                  label={commonStrings.PAY_LATER}
                />
              </FormControl>

              <FormControl fullWidth margin="dense">
                <FormControlLabel
                  control={(
                    <Switch
                      checked={licenseRequired}
                      onChange={(e) => {
                        setLicenseRequired(e.target.checked)
                      }}
                      color="primary"
                    />
                  )}
                  label={commonStrings.LICENSE_REQUIRED}
                />
              </FormControl>

              <div className="info">
                <InfoIcon />
                <span>{commonStrings.OPTIONAL}</span>
              </div>

              <FormControl fullWidth margin="dense">
                <FormControlLabel
                  control={(
                    <Switch
                      checked={notifyAdminOnNewCar}
                      disabled={user?.type === bookcarsTypes.UserType.Supplier}
                      onChange={(e) => {
                        setNotifyAdminOnNewCar(e.target.checked)
                      }}
                      color="primary"
                    />
                  )}
                  label={commonStrings.NOTIFY_ADMIN_ON_NEW_CAR}
                />
              </FormControl>

              <FormControl fullWidth margin="dense">
                <InputLabel>{commonStrings.SUPPLIER_CAR_LIMIT}</InputLabel>
                <Input
                  type="text"
                  onChange={handleSupplierCarLimitChange}
                  autoComplete="off"
                  slotProps={{ input: { inputMode: 'numeric', pattern: '^\\d+$' } }}
                  value={supplierCarLimit}
                  disabled={user?.type === bookcarsTypes.UserType.Supplier}
                />
              </FormControl>

              <FormControl fullWidth margin="dense">
                <InputLabel>{commonStrings.MIN_RENTAL_DAYS}</InputLabel>
                <Input
                  type="text"
                  onChange={handleMinimumRentalDaysChange}
                  autoComplete="off"
                  slotProps={{ input: { inputMode: 'numeric', pattern: '^\\d+$' } }}
                  value={minimumRentalDays}
                />
              </FormControl>

              <FormControl fullWidth margin="dense">
                <InputLabel>{commonStrings.PRICE_CHANGE_RATE}</InputLabel>
                <Input
                  type="text"
                  onChange={handlePriceChangeRateChange}
                  autoComplete="off"
                  slotProps={{ input: { inputMode: 'numeric', pattern: '^-?\\d+$' } }}
                  value={priceChangeRate}
                />
              </FormControl>

              <FormControl fullWidth margin="dense">
                <InputLabel>{commonStrings.PHONE}</InputLabel>
                <Input type="text" onChange={handlePhoneChange} onBlur={handlePhoneBlur} autoComplete="off" value={phone} error={!phoneValid} />
                <FormHelperText error={!phoneValid}>{(!phoneValid && commonStrings.PHONE_NOT_VALID) || ''}</FormHelperText>
              </FormControl>
              <FormControl fullWidth margin="dense">
                <InputLabel>{commonStrings.LOCATION}</InputLabel>
                <Input type="text" onChange={handleLocationChange} autoComplete="off" value={location} />
              </FormControl>
              <FormControl fullWidth margin="dense">
                <InputLabel>{commonStrings.BIO}</InputLabel>
                <Input type="text" onChange={handleBioChange} autoComplete="off" value={bio} />
              </FormControl>
              <FormControl fullWidth margin="dense">
                <ContractList supplier={supplier} />
              </FormControl>

              {admin && (
                <FormControl fullWidth margin="dense" className="resend-activation-link">
                  <Button
                    variant="outlined"
                    onClick={handleResendActivationLink}
                  >
                    {commonStrings.RESEND_ACTIVATION_LINK}
                  </Button>
                </FormControl>
              )}
              <div className="buttons">
                <Button type="submit" variant="contained" className="btn-primary btn-margin btn-margin-bottom" size="small" onClick={() => navigate(`/change-password?u=${supplier && supplier._id}`)}>
                  {commonStrings.RESET_PASSWORD}
                </Button>
                <Button type="submit" variant="contained" className="btn-primary btn-margin-bottom" size="small">
                  {commonStrings.SAVE}
                </Button>
                <Button variant="contained" className="btn-secondary btn-margin-bottom" size="small" onClick={() => navigate('/suppliers')}>
                  {commonStrings.CANCEL}
                </Button>
              </div>

              <div className="form-error">
                {error && <Error message={commonStrings.GENERIC_ERROR} />}
                {avatarError && <Error message={commonStrings.IMAGE_REQUIRED} />}
              </div>
            </form>
          </Paper>
        </div>
      )}
      {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
      {noMatch && <NoMatch hideHeader />}
    </Layout>
  )
}

export default UpdateSupplier
