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
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import Layout from '@/components/Layout'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings as csStrings } from '@/lang/create-supplier'
import * as SupplierService from '@/services/SupplierService'
import * as UserService from '@/services/UserService'
import * as helper from '@/utils/helper'
import Error from '@/components/Error'
import Backdrop from '@/components/SimpleBackdrop'
import NoMatch from './NoMatch'
import Avatar from '@/components/Avatar'
import ContractList from '@/components/ContractList'
import { schema, FormFields } from '@/models/SupplierForm'

import '@/assets/css/update-supplier.css'

const UpdateSupplier = () => {
  const navigate = useNavigate()

  const [user, setUser] = useState<bookcarsTypes.User>()
  const [supplier, setSupplier] = useState<bookcarsTypes.User>()
  const [submitError, setSubmitError] = useState(false)
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [noMatch, setNoMatch] = useState(false)
  const [avatar, setAvatar] = useState('')
  const [avatarError, setAvatarError] = useState(false)

  const {
    control,
    register,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    setFocus,
    formState: { errors, isSubmitting },
    trigger,
  } = useForm<FormFields>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      location: '',
      bio: '',
      blacklisted: false,
      payLater: false,
      licenseRequired: false,
      minimumRentalDays: '',
      priceChangeRate: '',
      supplierCarLimit: '',
      notifyAdminOnNewCar: false
    },
  })

  const payLater = useWatch({ control, name: 'payLater' })
  const licenseRequired = useWatch({ control, name: 'licenseRequired' })
  const notifyAdminOnNewCar = useWatch({ control, name: 'notifyAdminOnNewCar' })
  const blacklisted = useWatch({ control, name: 'blacklisted' })

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
              if (!(_user.type === bookcarsTypes.UserType.Admin || _user._id === _supplier._id)) {
                setLoading(false)
                setNoMatch(true)
                return
              }

              setSupplier(_supplier)
              setValue('email', _supplier.email || '')
              setAvatar(_supplier.avatar || '')
              setValue('fullName', _supplier.fullName || '')
              setValue('phone', _supplier.phone || '')
              setValue('location', _supplier.location || '')
              setValue('bio', _supplier.bio || '')
              setValue('payLater', !!_supplier.payLater)
              setValue('licenseRequired', !!_supplier.licenseRequired)
              setValue('minimumRentalDays', _supplier.minimumRentalDays?.toString() || '')
              setValue('priceChangeRate', _supplier.priceChangeRate?.toString() || '')
              setValue('supplierCarLimit', _supplier.supplierCarLimit?.toString() || '')
              setValue('notifyAdminOnNewCar', !!_supplier.notifyAdminOnNewCar)
              setValue('blacklisted', !!_supplier.blacklisted)
              setVisible(true)
              setLoading(false)
            } else {
              setLoading(false)
              setNoMatch(true)
            }
          } catch (err) {
            helper.error(err)
            setLoading(false)
            setSubmitError(true)
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

  const onSubmit = async (data: FormFields) => {
    try {
      if (!supplier) {
        helper.error()
        return
      }

      if (supplier.fullName !== data.fullName) {
        const status = await SupplierService.validate({ fullName: data.fullName })

        if (status !== 200) {
          setError('fullName', { message: csStrings.INVALID_SUPPLIER_NAME })
          setFocus('fullName')
          return
        }
      }

      if (!avatar) {
        setAvatarError(true)
        setSubmitError(false)
        return
      }

      const payload: bookcarsTypes.UpdateSupplierPayload = {
        _id: supplier._id as string,
        fullName: data.fullName,
        phone: data.phone!,
        location: data.location!,
        bio: data.bio!,
        payLater: !!data.payLater,
        licenseRequired: !!data.licenseRequired,
        minimumRentalDays: data.minimumRentalDays ? Number(data.minimumRentalDays) : undefined,
        priceChangeRate: data.priceChangeRate ? Number(data.priceChangeRate) : undefined,
        supplierCarLimit: data.supplierCarLimit ? Number(data.supplierCarLimit) : undefined,
        notifyAdminOnNewCar: data.notifyAdminOnNewCar,
        blacklisted: !!data.blacklisted,
      }

      const res = await SupplierService.update(payload)

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

  const onError = () => {
    const firstErrorField = Object.keys(errors)[0] as keyof FormFields
    if (firstErrorField) {
      setFocus(firstErrorField)
    }
  }

  const admin = helper.admin(user)

  return (
    <Layout onLoad={onLoad} strict>
      {visible && (
        <div className="update-supplier">
          <Paper className="supplier-form-update" elevation={10}>
            <form onSubmit={handleSubmit(onSubmit, onError)}>
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
                <span>{csStrings.RECOMMENDED_IMAGE_SIZE}</span>
              </div>

              <FormControl fullWidth margin="dense">
                <InputLabel className="required">{commonStrings.FULL_NAME}</InputLabel>
                <Input
                  {...register('fullName')}
                  type="text"
                  error={!!errors.fullName}
                  required
                  autoComplete="off"
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
                  autoComplete="off"
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

              <div className="info">
                <InfoIcon />
                <span>{commonStrings.OPTIONAL}</span>
              </div>

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
                  onChange={() => {
                    if (errors.supplierCarLimit) {
                      clearErrors('supplierCarLimit')
                    }
                  }}
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
                  onChange={() => {
                    if (errors.minimumRentalDays) {
                      clearErrors('minimumRentalDays')
                    }
                  }}
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
                  onChange={() => {
                    if (errors.priceChangeRate) {
                      clearErrors('priceChangeRate')
                    }
                  }}
                />
                <FormHelperText error={!!errors.priceChangeRate}>
                  {errors.priceChangeRate?.message || ''}
                </FormHelperText>
              </FormControl>

              <FormControl fullWidth margin="dense">
                <InputLabel>{commonStrings.PHONE}</InputLabel>
                <Input
                  {...register('phone', {
                    onBlur: () => trigger('phone'),
                  })}
                  type="text"
                  autoComplete="off"
                  error={!!errors.phone}
                  onChange={() => {
                    if (errors.phone) {
                      clearErrors('phone')
                    }
                  }}
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
                  autoComplete="off" />
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
                <Button type="submit" variant="contained" className="btn-primary btn-margin-bottom" size="small" disabled={isSubmitting}>
                  {commonStrings.SAVE}
                </Button>
                <Button variant="contained" className="btn-secondary btn-margin-bottom" size="small" onClick={() => navigate('/suppliers')}>
                  {commonStrings.CANCEL}
                </Button>
              </div>

              <div className="form-error">
                {submitError && <Error message={commonStrings.GENERIC_ERROR} />}
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
