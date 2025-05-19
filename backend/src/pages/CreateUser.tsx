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
import validator from 'validator'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings as csStrings } from '@/lang/create-supplier'
import { strings } from '@/lang/create-user'
import * as helper from '@/common/helper'
import * as UserService from '@/services/UserService'
import * as SupplierService from '@/services/SupplierService'
import Error from '@/components/Error'
import Backdrop from '@/components/SimpleBackdrop'
import Avatar from '@/components/Avatar'
import DatePicker from '@/components/DatePicker'
import DriverLicense from '@/components/DriverLicense'
import { schema, FormFields } from '@/models/UserForm'

import '@/assets/css/create-user.css'

const CreateUser = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState<bookcarsTypes.User>()
  const [admin, setAdmin] = useState(false)
  const [formError, setFormError] = useState(false)
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [avatar, setAvatar] = useState('')
  const [avatarError, setAvatarError] = useState(false)
  const [license, setLicense] = useState<string | undefined>()

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
  const payLater = useWatch({ control, name: 'payLater' })
  const licenseRequired = useWatch({ control, name: 'licenseRequired' })
  const notifyAdminOnNewCar = useWatch({ control, name: 'notifyAdminOnNewCar' })

  const onBeforeUpload = () => {
    setLoading(true)
  }

  const onAvatarChange = (_avatar: string) => {
    setLoading(false)
    setAvatar(_avatar)

    if (_avatar !== null && type === bookcarsTypes.UserType.Supplier) {
      setAvatarError(false)
    }
  }

  const handleCancel = async () => {
    try {
      if (avatar) {
        await UserService.deleteTempAvatar(avatar)
      }

      if (license) {
        await UserService.deleteTempLicense(license)
      }

      navigate('/users')
    } catch {
      navigate('/users')
    }
  }

  const onLoad = (_user?: bookcarsTypes.User) => {
    if (_user && _user.verified) {
      const _admin = helper.admin(_user)
      setUser(_user)
      setAdmin(_admin)
      setValue('type', _admin ? '' : bookcarsTypes.UserType.User)
      setVisible(true)
    }
  }

  const validateFullName = async (value?: string) => {
    if (!!value && type === bookcarsTypes.UserType.Supplier) {
      const status = await SupplierService.validate({ fullName: value })
      if (status !== 200) {
        setError('fullName', { message: csStrings.INVALID_SUPPLIER_NAME })
        setFocus('fullName')
        return false
      }
    }
    return true
  }

  const validateEmail = async (value?: string) => {
    if (value) {
      trigger('email')

      if (validator.isEmail(value)) {
        const status = await UserService.validateEmail({ email: value })
        if (status != 200) {
          setError('email', { message: commonStrings.EMAIL_ALREADY_REGISTERED })
          return false
        }
      }
      return false
    }
    return true
  }

  const onSubmit = async (data: FormFields) => {
    try {
      if (!user) {
        helper.error()
        return
      }

      if (type === bookcarsTypes.UserType.Supplier && !avatar) {
        setAvatarError(true)
        setFormError(false)
        return
      }

      const language = UserService.getLanguage()
      const supplier = admin ? undefined : user._id

      const payload: bookcarsTypes.CreateUserPayload = {
        email: data.email,
        phone: data.phone || '',
        location: data.location || '',
        bio: data.bio || '',
        fullName: data.fullName,
        type: data.type,
        avatar,
        birthDate: data.birthDate,
        language,
        supplier,
        license,
        minimumRentalDays: data.minimumRentalDays ? Number(data.minimumRentalDays) : undefined,
        priceChangeRate: data.priceChangeRate ? Number(data.priceChangeRate) : undefined,
        supplierCarLimit: data.supplierCarLimit ? Number(data.supplierCarLimit) : undefined,
        notifyAdminOnNewCar: type === bookcarsTypes.UserType.Supplier ? data.notifyAdminOnNewCar : undefined,
      }

      if (type === bookcarsTypes.UserType.Supplier) {
        payload.payLater = data.payLater
        payload.licenseRequired = data.licenseRequired
      }

      const formStatus = await UserService.create(payload)

      if (formStatus === 200) {
        navigate('/users')
      } else {
        setFormError(true)
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const supplier = type === bookcarsTypes.UserType.Supplier
  const driver = type === bookcarsTypes.UserType.User

  return (
    <Layout onLoad={onLoad} strict>
      {user && (
        <div className="create-user">
          <Paper className="user-form user-form-wrapper" elevation={10} style={visible ? {} : { display: 'none' }}>
            <h1 className="user-form-title">{strings.CREATE_USER_HEADING}</h1>
            <form onSubmit={handleSubmit(onSubmit)}>
              <Avatar
                type={type}
                mode="create"
                record={null}
                size="large"
                readonly={false}
                onBeforeUpload={onBeforeUpload}
                onChange={onAvatarChange}
                color="disabled"
                className="avatar-ctn"
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
                  // {...register('email')}
                  onChange={(e) => {
                    clearErrors('email')
                    setValue('email', e.target.value)
                  }}
                  onBlur={async (e) => {
                    await validateEmail(e.target.value)
                  }}
                  type="text"
                  autoComplete="off"
                  required
                  error={!!errors.email}
                />
                <FormHelperText error={!!errors.email}>
                  {errors.email?.message || ''}
                </FormHelperText>
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

                  <DriverLicense
                    className="driver-license-field"
                    onUpload={(filename: string) => {
                      setLicense(filename)
                    }}
                  />
                </>
              )}

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
                          disabled={user?.type === bookcarsTypes.UserType.Supplier}
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

              <div className="buttons">
                <Button type="submit" variant="contained" className="btn-primary btn-margin-bottom" size="small" disabled={isSubmitting}>
                  {commonStrings.CREATE}
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
    </Layout>
  )
}

export default CreateUser
