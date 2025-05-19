import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Input,
  InputLabel,
  FormControl,
  FormHelperText,
  Button,
  Paper,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
} from '@mui/material'
import { Info as InfoIcon } from '@mui/icons-material'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import Layout from '@/components/Layout'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings as csStrings } from '@/lang/create-supplier'
import { strings } from '@/lang/update-user'
import * as helper from '@/common/helper'
import * as UserService from '@/services/UserService'
import * as SupplierService from '@/services/SupplierService'
import NoMatch from './NoMatch'
import Error from '@/components/Error'
import Backdrop from '@/components/SimpleBackdrop'
import Avatar from '@/components/Avatar'
import DatePicker from '@/components/DatePicker'
import DriverLicense from '@/components/DriverLicense'
import { schema, FormFields } from '@/models/UserForm'

import '@/assets/css/update-user.css'

const UpdateUser = () => {
  const navigate = useNavigate()

  const [loggedUser, setLoggedUser] = useState<bookcarsTypes.User>()
  const [user, setUser] = useState<bookcarsTypes.User>()
  const [visible, setVisible] = useState(false)
  const [noMatch, setNoMatch] = useState(false)
  const [admin, setAdmin] = useState(false)
  const [formError, setFormError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [avatar, setAvatar] = useState('')
  const [avatarError, setAvatarError] = useState(false)

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    setFocus,
    clearErrors,
    setValue,
    trigger,
  } = useForm<FormFields>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: {
      type: '',
      fullName: '',
      email: '',
      phone: '',
      location: '',
      bio: '',
      payLater: false,
      licenseRequired: false,
      minimumRentalDays: '',
      priceChangeRate: '',
      supplierCarLimit: '',
      notifyAdminOnNewCar: false
    },
  })

  const type = useWatch({ control, name: 'type' })
  const fullName = useWatch({ control, name: 'fullName' })
  const email = useWatch({ control, name: 'email' })
  const blacklisted = useWatch({ control, name: 'blacklisted' })
  const payLater = useWatch({ control, name: 'payLater' })
  const licenseRequired = useWatch({ control, name: 'licenseRequired' })
  const notifyAdminOnNewCar = useWatch({ control, name: 'notifyAdminOnNewCar' })

  const onBeforeUpload = () => {
    setLoading(true)
  }

  const onAvatarChange = (_avatar: string) => {
    if (loggedUser && user && loggedUser._id === user._id) {
      const _loggedUser = bookcarsHelper.clone(loggedUser)
      _loggedUser.avatar = _avatar

      setLoggedUser(_loggedUser)
    }

    const _user = bookcarsHelper.clone(user)
    _user.avatar = _avatar

    setLoading(false)
    setUser(_user)
    setAvatar(_avatar)

    if (_avatar !== null && type === bookcarsTypes.RecordType.Supplier) {
      setAvatarError(false)
    }
  }

  const handleCancel = async () => {
    navigate('/users')
  }

  const handleResendActivationLink = async () => {
    try {
      const status = await UserService.resend(email, false, type === bookcarsTypes.RecordType.User ? 'frontend' : 'backend')

      if (status === 200) {
        helper.info(commonStrings.ACTIVATION_EMAIL_SENT)
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const onLoad = async (_loggedUser?: bookcarsTypes.User) => {
    if (_loggedUser && _loggedUser.verified) {
      setLoading(true)

      const params = new URLSearchParams(window.location.search)
      if (params.has('u')) {
        const id = params.get('u')
        if (id && id !== '') {
          try {
            const _user = await UserService.getUser(id)

            if (_user) {
              if (!(
                _loggedUser.type === bookcarsTypes.UserType.Admin
                || (_user.type === bookcarsTypes.UserType.Supplier && _loggedUser._id === _user._id)
                || (_user.type === bookcarsTypes.UserType.User && _loggedUser._id === _user.supplier)
              )) {
                setLoading(false)
                setNoMatch(true)
                return
              }

              setLoggedUser(_loggedUser)
              setUser(_user)
              setAdmin(helper.admin(_loggedUser))
              setAvatar(_user.avatar || '')
              setValue('type', _user.type || '')
              setValue('email', _user.email || '')
              setValue('fullName', _user.fullName || '')
              setValue('phone', _user.phone || '')
              setValue('location', _user.location || '')
              setValue('bio', _user.bio || '')
              setValue('birthDate', _user && _user.birthDate ? new Date(_user.birthDate) : undefined)
              setValue('payLater', _user.payLater || false)
              setValue('licenseRequired', _user.licenseRequired || false)
              setValue('minimumRentalDays', _user.minimumRentalDays?.toString() || '')
              setValue('priceChangeRate', _user.priceChangeRate?.toString() || '')
              setValue('supplierCarLimit', _user.supplierCarLimit?.toString() || '')
              setValue('notifyAdminOnNewCar', !!_user.notifyAdminOnNewCar)
              setValue('blacklisted', !!_user.blacklisted)
              setVisible(true)
              setLoading(false)
            } else {
              setLoading(false)
              setNoMatch(true)
            }
          } catch (err) {
            helper.error(err)
            setLoading(false)
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

  const validateFullName = async (value?: string) => {
    if (!!value && type === bookcarsTypes.UserType.Supplier && user?.fullName !== value) {
      const status = await SupplierService.validate({ fullName: value })
      if (status !== 200) {
        setError('fullName', { message: csStrings.INVALID_SUPPLIER_NAME })
        setFocus('fullName')
        return false
      }
    }
    return true
  }

  const onSubmit = async (data: FormFields) => {
    try {
      if (!user) {
        helper.error()
        return
      }

      const language = UserService.getLanguage()
      const payload: bookcarsTypes.UpdateUserPayload = {
        _id: user._id as string,
        phone: data.phone || '',
        location: data.location || '',
        bio: data.bio || '',
        fullName: data.fullName,
        language,
        type: data.type,
        avatar,
        birthDate: data.birthDate,
        minimumRentalDays: data.minimumRentalDays ? Number(data.minimumRentalDays) : undefined,
        priceChangeRate: data.priceChangeRate ? Number(data.priceChangeRate) : undefined,
        supplierCarLimit: data.supplierCarLimit ? Number(data.supplierCarLimit) : undefined,
        notifyAdminOnNewCar: type === bookcarsTypes.RecordType.Supplier ? notifyAdminOnNewCar : undefined,
        blacklisted: data.blacklisted,
      }

      if (type === bookcarsTypes.RecordType.Supplier) {
        payload.payLater = payLater
        payload.licenseRequired = licenseRequired
      }

      const status = await UserService.updateUser(payload)

      if (status === 200) {
        const _user = bookcarsHelper.clone(user) as bookcarsTypes.User
        _user.fullName = data.fullName
        _user.type = type
        setUser(_user)
        helper.info(commonStrings.UPDATED)
      } else {
        helper.error()

        setFormError(false)
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const supplier = type === bookcarsTypes.RecordType.Supplier
  const driver = type === bookcarsTypes.RecordType.User
  const activate = admin
    || (loggedUser && user && loggedUser.type === bookcarsTypes.RecordType.Supplier && user.type === bookcarsTypes.RecordType.User && user.supplier as string === loggedUser._id)

  return (
    <Layout onLoad={onLoad} strict>
      {loggedUser && user && visible && (
        <div className="update-user">
          <Paper className="user-form user-form-wrapper" elevation={10}>
            <h1 className="user-form-title">{strings.UPDATE_USER_HEADING}</h1>
            <form onSubmit={handleSubmit(onSubmit)}>
              <Avatar
                type={type}
                mode="update"
                record={user}
                size="large"
                readonly={false}
                onBeforeUpload={onBeforeUpload}
                onChange={onAvatarChange}
                color="disabled"
                className="avatar-ctn"
                hideDelete={type === bookcarsTypes.RecordType.Supplier}
              />

              {supplier && (
                <div className="info">
                  <InfoIcon />
                  <span>{csStrings.RECOMMENDED_IMAGE_SIZE}</span>
                </div>
              )}

              {admin && (
                <FormControl fullWidth margin="dense" style={{ marginTop: supplier ? 0 : 39 }}>
                  <InputLabel className="required">{commonStrings.TYPE}</InputLabel>
                  <Select
                    label={commonStrings.TYPE}
                    value={type}
                    onChange={(e) => {
                      clearErrors('fullName')
                      setValue('type', e.target.value)
                    }}
                    variant="standard"
                    required
                    fullWidth
                  >
                    <MenuItem value={bookcarsTypes.UserType.Admin}>{helper.getUserType(bookcarsTypes.UserType.Admin)}</MenuItem>
                    <MenuItem value={bookcarsTypes.UserType.Supplier}>{helper.getUserType(bookcarsTypes.UserType.Supplier)}</MenuItem>
                    <MenuItem value={bookcarsTypes.UserType.User}>{helper.getUserType(bookcarsTypes.UserType.User)}</MenuItem>
                  </Select>
                </FormControl>
              )}

              <FormControl fullWidth margin="dense">
                <InputLabel className="required">{commonStrings.FULL_NAME}</InputLabel>
                <Input
                  // {...register('fullName')}
                  value={fullName}
                  type="text"
                  error={!!errors.fullName}
                  required
                  autoComplete="off"
                  onChange={(e) => {
                    clearErrors('fullName')
                    setValue('fullName', e.target.value)
                  }}
                  onBlur={async (e) => {
                    await validateFullName(e.target.value)
                  }}
                />
                <FormHelperText error={!!errors.fullName}>
                  {errors.fullName?.message || ''}
                </FormHelperText>
              </FormControl>

              <FormControl fullWidth margin="dense">
                <InputLabel className="required">{commonStrings.EMAIL}</InputLabel>
                <Input
                  {...register('email')}
                  type="text"
                  disabled
                />
              </FormControl>

              <FormControl fullWidth margin="dense">
                <FormControlLabel
                  control={(
                    <Switch
                      {...register('blacklisted')}
                      checked={blacklisted}
                      onChange={(e) => {
                        setValue('blacklisted', e.target.checked)
                      }}
                      color="primary"
                    />
                  )}
                  label={commonStrings.BLACKLISTED}
                  title={commonStrings.BLACKLISTED_TOOLTIP}
                />
              </FormControl>

              {driver && (
                <>
                  <FormControl fullWidth margin="dense">
                    <DatePicker
                      label={commonStrings.BIRTH_DATE}
                      variant="standard"
                      required
                      onChange={(birthDate) => {
                        if (birthDate) {
                          clearErrors('birthDate')
                          setValue('birthDate', birthDate, { shouldValidate: true })
                        }
                      }}
                      language={(user && user.language) || env.DEFAULT_LANGUAGE}
                    />
                    <FormHelperText error={!!errors.birthDate}>{errors.birthDate?.message || ''}</FormHelperText>
                  </FormControl>

                  <DriverLicense user={user} className="driver-license-field" />
                </>
              )}

              {supplier && (
                <>
                  <FormControl fullWidth margin="dense">
                    <FormControlLabel
                      control={(
                        <Switch
                          {...register('payLater')}
                          checked={payLater}
                          onChange={(e) => {
                            setValue('payLater', e.target.checked)
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
                          {...register('licenseRequired')}
                          checked={licenseRequired}
                          onChange={(e) => {
                            setValue('licenseRequired', e.target.checked)
                          }}
                          color="primary"
                        />
                      )}
                      label={commonStrings.LICENSE_REQUIRED}
                    />
                  </FormControl>

                  <FormControl fullWidth margin="dense">
                    <FormControlLabel
                      control={(
                        <Switch
                          {...register('notifyAdminOnNewCar')}
                          checked={notifyAdminOnNewCar}
                          disabled={loggedUser?.type === bookcarsTypes.UserType.Supplier}
                          onChange={(e) => {
                            setValue('notifyAdminOnNewCar', e.target.checked)
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
                      {...register('supplierCarLimit')}
                      type="text"
                      autoComplete="off"
                      error={!!errors.supplierCarLimit}
                      onChange={() => clearErrors('supplierCarLimit')}
                    />
                    <FormHelperText error={!!errors.supplierCarLimit}>
                      {errors.supplierCarLimit?.message || ''}
                    </FormHelperText>
                  </FormControl>

                  <FormControl fullWidth margin="dense">
                    <InputLabel>{commonStrings.MIN_RENTAL_DAYS}</InputLabel>
                    <Input
                      {...register('minimumRentalDays')}
                      type="text"
                      autoComplete="off"
                      error={!!errors.minimumRentalDays}
                      onChange={() => clearErrors('minimumRentalDays')}
                    />
                    <FormHelperText error={!!errors.minimumRentalDays}>
                      {errors.minimumRentalDays?.message || ''}
                    </FormHelperText>
                  </FormControl>

                  <FormControl fullWidth margin="dense">
                    <InputLabel>{commonStrings.PRICE_CHANGE_RATE}</InputLabel>
                    <Input
                      {...register('priceChangeRate')}
                      type="text"
                      autoComplete="off"
                      error={!!errors.priceChangeRate}
                      onChange={() => clearErrors('priceChangeRate')}
                    />
                    <FormHelperText error={!!errors.priceChangeRate}>
                      {errors.priceChangeRate?.message || ''}
                    </FormHelperText>
                  </FormControl>
                </>
              )}

              <div className="info">
                <InfoIcon />
                <span>{commonStrings.OPTIONAL}</span>
              </div>

              <FormControl fullWidth margin="dense">
                <InputLabel>{commonStrings.PHONE}</InputLabel>
                <Input
                  {...register('phone', {
                    onBlur: () => trigger('phone'),
                  })}
                  type="text"
                  autoComplete="off"
                  error={!!errors.phone}
                  onChange={() => clearErrors('phone')}
                />
                <FormHelperText error={!!errors.phone}>
                  {errors.phone?.message || ''}
                </FormHelperText>
              </FormControl>

              <FormControl fullWidth margin="dense">
                <InputLabel>{commonStrings.LOCATION}</InputLabel>
                <Input
                  {...register('location')}
                  type="text"
                  autoComplete="off"
                />
              </FormControl>

              <FormControl fullWidth margin="dense">
                <InputLabel>{commonStrings.BIO}</InputLabel>
                <Input
                  {...register('bio')}
                  type="text"
                  autoComplete="off"
                />
              </FormControl>

              {activate && (
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
                <Button variant="contained" className="btn-primary btn-margin btn-margin-bottom" size="small" onClick={() => navigate(`/change-password?u=${user._id}`)}>
                  {commonStrings.RESET_PASSWORD}
                </Button>

                <Button type="submit" variant="contained" className="btn-primary btn-margin-bottom" size="small" disabled={isSubmitting}>
                  {commonStrings.SAVE}
                </Button>

                <Button variant="contained" className="btn-secondary btn-margin-bottom" size="small" onClick={handleCancel}>
                  {commonStrings.CANCEL}
                </Button>
              </div>

              <div className="form-error">
                {formError && <Error message={commonStrings.GENERIC_ERROR} />}
                {avatarError && <Error message={commonStrings.IMAGE_REQUIRED} />}
              </div>
            </form>
          </Paper>
        </div>
      )}
      {(loading || isSubmitting) && <Backdrop text={commonStrings.PLEASE_WAIT} disableMargin />}
      {noMatch && <NoMatch hideHeader />}
    </Layout>
  )
}

export default UpdateUser
