import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FormControl,
  Button,
  Paper,
  FormControlLabel,
  Switch,
  FormHelperText,
  InputLabel,
  Input
} from '@mui/material'
import {
  Info as InfoIcon,
  Person as DriverIcon
} from '@mui/icons-material'
import { DateTimeValidationError } from '@mui/x-date-pickers'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import Layout from '@/components/Layout'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings as blStrings } from '@/lang/booking-list'
import { strings as bfStrings } from '@/lang/booking-filter'
import { strings as csStrings } from '@/lang/cars'
import { strings } from '@/lang/create-booking'
import * as UserService from '@/services/UserService'
import * as BookingService from '@/services/BookingService'
import * as helper from '@/utils/helper'
import SupplierSelectList from '@/components/SupplierSelectList'
import UserSelectList from '@/components/UserSelectList'
import LocationSelectList from '@/components/LocationSelectList'
import CarSelectList from '@/components/CarSelectList'
import StatusList from '@/components/StatusList'
import DateTimePicker from '@/components/DateTimePicker'
import DatePicker from '@/components/DatePicker'
import { Option, Supplier } from '@/models/common'
import { schema, FormFields } from '@/models/BookingForm'

import '@/assets/css/create-booking.css'

const CreateBooking = () => {
  const navigate = useNavigate()

  const [isSupplier, setIsSupplier] = useState(false)
  const [visible, setVisible] = useState(false)
  const [carObj, setCarObj] = useState<bookcarsTypes.Car>()
  const [minDate, setMinDate] = useState<Date>()
  const [fromError, setFromError] = useState(false)
  const [toError, setToError] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
    clearErrors,
    getValues,
  } = useForm<FormFields>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    defaultValues: {
      supplier: undefined,
      driver: undefined,
      pickupLocation: undefined,
      dropOffLocation: undefined,
      car: undefined,
      status: undefined,
      cancellation: false,
      amendments: false,
      theftProtection: false,
      collisionDamageWaiver: false,
      fullInsurance: false,
      additionalDriver: false,
      additionalDriverFullName: '',
      additionalDriverEmail: '',
      additionalDriverPhone: '',
    }
  })

  const supplier = useWatch({ control, name: 'supplier' })
  const pickupLocation = useWatch({ control, name: 'pickupLocation' })
  const from = useWatch({ control, name: 'from' })
  const to = useWatch({ control, name: 'to' })
  const additionalDriverEnabled = useWatch({ control, name: 'additionalDriver' })

  useEffect(() => {
    if (from) {
      const _minDate = new Date(from)
      _minDate.setDate(_minDate.getDate() + 1)
      setMinDate(_minDate)
    } else {
      setMinDate(undefined)
    }
  }, [from])

  const onSubmit = async (data: FormFields) => {
    if (!carObj || fromError || toError) {
      helper.error()
      return
    }

    const additionalDriverSet = helper.carOptionAvailable(carObj, 'additionalDriver') && data.additionalDriver

    const booking: bookcarsTypes.Booking = {
      supplier: data.supplier?._id!,
      car: carObj._id,
      driver: data.driver?._id,
      pickupLocation: data.pickupLocation!._id,
      dropOffLocation: data.dropOffLocation!._id,
      from: data.from!,
      to: data.to!,
      status: data.status as bookcarsTypes.BookingStatus,
      cancellation: data.cancellation,
      amendments: data.amendments,
      theftProtection: data.theftProtection,
      collisionDamageWaiver: data.collisionDamageWaiver,
      fullInsurance: data.fullInsurance,
      additionalDriver: additionalDriverSet,
    }

    let _additionalDriver: bookcarsTypes.AdditionalDriver | undefined = undefined
    if (additionalDriverSet) {
      _additionalDriver = {
        fullName: data.additionalDriverFullName!,
        email: data.additionalDriverEmail!,
        phone: data.additionalDriverPhone!,
        birthDate: data.additionalDriverBirthDate!,
      }
    }

    const options: bookcarsTypes.CarOptions = {
      cancellation: data.cancellation,
      amendments: data.amendments,
      theftProtection: data.theftProtection,
      collisionDamageWaiver: data.collisionDamageWaiver,
      fullInsurance: data.fullInsurance,
      additionalDriver: additionalDriverSet,
    }

    try {
      // use bookcarsHelper.calculatePrice
      const price = await bookcarsHelper.calculateTotalPrice(carObj, from!, to!, carObj.supplier.priceChangeRate || 0, options)
      booking.price = price

      const _booking = await BookingService.create({
        booking,
        additionalDriver: _additionalDriver,
      })
      console.log(_booking)
      if (_booking && _booking._id) {
        navigate('/')
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const onLoad = (user?: bookcarsTypes.User) => {
    if (user) {
      setVisible(true)

      if (user.type === bookcarsTypes.RecordType.Supplier) {
        setValue('supplier', { _id: user._id, name: user.fullName, image: user.avatar } as Supplier)
        setIsSupplier(true)
      }
    }
  }

  return (
    <Layout onLoad={onLoad} strict>
      <div className="create-booking">
        <Paper className="booking-form booking-form-wrapper" elevation={10} style={visible ? {} : { display: 'none' }}>
          <h1 className="booking-form-title">{strings.NEW_BOOKING_HEADING}</h1>
          <form onSubmit={handleSubmit(onSubmit)}>
            {!isSupplier && (
              <FormControl fullWidth margin="dense">
                <SupplierSelectList
                  label={blStrings.SUPPLIER}
                  required
                  variant="standard"
                  onChange={(values) => setValue('supplier', values.length > 0 ? values[0] as Option : undefined)}
                />
              </FormControl>
            )}

            <UserSelectList
              label={blStrings.DRIVER}
              required
              variant="standard"
              onChange={(values) => setValue('driver', values.length > 0 ? values[0] as Option : undefined)}
            />

            <FormControl fullWidth margin="dense">
              <LocationSelectList
                label={bfStrings.PICK_UP_LOCATION}
                required
                variant="standard"
                onChange={(values) => setValue('pickupLocation', values.length > 0 ? values[0] as Option : undefined)}
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <LocationSelectList
                label={bfStrings.DROP_OFF_LOCATION}
                required
                variant="standard"
                onChange={(values) => setValue('dropOffLocation', values.length > 0 ? values[0] as Option : undefined)}
              />
            </FormControl>

            <CarSelectList
              label={blStrings.CAR}
              supplier={supplier?._id!}
              pickupLocation={pickupLocation?._id!}
              onChange={(values) => {
                const _car = values.length > 0 ? values[0] as bookcarsTypes.Car : undefined
                setValue('car', _car)
                setCarObj(_car)
              }}
              required
            />

            <FormControl fullWidth margin="dense">
              <DateTimePicker
                label={commonStrings.FROM}
                value={from}
                showClear
                required
                onChange={(date) => {
                  setValue('from', date || undefined)

                  if (date && to && date > to) {
                    setValue('to', undefined)
                  }
                }}
                onError={(err: DateTimeValidationError) => {
                  if (err) {
                    setFromError(true)
                  } else {
                    setFromError(false)
                  }
                }}
                language={UserService.getLanguage()}
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <DateTimePicker
                label={commonStrings.TO}
                value={to}
                minDate={minDate}
                showClear
                required
                onChange={(date) => {
                  setValue('to', date || undefined)
                }}
                onError={(err: DateTimeValidationError) => {
                  if (err) {
                    setToError(true)
                  } else {
                    setToError(false)
                  }
                }}
                language={UserService.getLanguage()}
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <StatusList
                label={blStrings.STATUS}
                onChange={(value) => {
                  const currentValue = getValues('status')
                  if (currentValue !== value) {
                    setValue('status', value)
                  }
                }}
                required
              />
            </FormControl>

            <div className="info">
              <InfoIcon />
              <span>{commonStrings.OPTIONAL}</span>
            </div>

            <FormControl fullWidth margin="dense" className="checkbox-fc">
              <FormControlLabel
                control={
                  <Switch
                    {...register('cancellation')}
                    color="primary"
                    disabled={!carObj || !helper.carOptionAvailable(carObj, 'cancellation')}
                  />
                }
                label={csStrings.CANCELLATION}
                className="checkbox-fcl"
              />
            </FormControl>

            <FormControl fullWidth margin="dense" className="checkbox-fc">
              <FormControlLabel
                control={
                  <Switch
                    {...register('amendments')}
                    color="primary"
                    disabled={!carObj || !helper.carOptionAvailable(carObj, 'amendments')}
                  />
                }
                label={csStrings.AMENDMENTS}
                className="checkbox-fcl"
              />
            </FormControl>

            <FormControl fullWidth margin="dense" className="checkbox-fc">
              <FormControlLabel
                control={
                  <Switch
                    {...register('theftProtection')}
                    color="primary"
                    disabled={!carObj || !helper.carOptionAvailable(carObj, 'theftProtection')}
                  />
                }
                label={csStrings.THEFT_PROTECTION}
                className="checkbox-fcl"
              />
            </FormControl>

            <FormControl fullWidth margin="dense" className="checkbox-fc">
              <FormControlLabel
                control={
                  <Switch
                    {...register('collisionDamageWaiver')}
                    color="primary"
                    disabled={!carObj || !helper.carOptionAvailable(carObj, 'collisionDamageWaiver')}
                  />
                }
                label={csStrings.COLLISION_DAMAGE_WAVER}
                className="checkbox-fcl"
              />
            </FormControl>

            <FormControl fullWidth margin="dense" className="checkbox-fc">
              <FormControlLabel
                control={
                  <Switch
                    {...register('fullInsurance')}
                    color="primary"
                    disabled={!carObj || !helper.carOptionAvailable(carObj, 'fullInsurance')}
                  />
                }
                label={csStrings.FULL_INSURANCE}
                className="checkbox-fcl"
              />
            </FormControl>

            <FormControl fullWidth margin="dense" className="checkbox-fc">
              <FormControlLabel
                control={
                  <Switch
                    {...register('additionalDriver')}
                    color="primary"
                    disabled={!carObj || !helper.carOptionAvailable(carObj, 'additionalDriver')}
                  />
                }
                label={csStrings.ADDITIONAL_DRIVER}
                className="checkbox-fcl"
              />
            </FormControl>

            {carObj && helper.carOptionAvailable(carObj, 'additionalDriver') && additionalDriverEnabled && (
              <>
                <div className="info">
                  <DriverIcon />
                  <span>{csStrings.ADDITIONAL_DRIVER}</span>
                </div>
                <FormControl fullWidth margin="dense">
                  <InputLabel className="required">{commonStrings.FULL_NAME}</InputLabel>
                  <Input
                    {...register('additionalDriverFullName')}
                    type="text"
                    required
                    autoComplete="off"
                  />
                  {errors.additionalDriverFullName && <FormHelperText error>{commonStrings.REQUIRED}</FormHelperText>}
                </FormControl>

                <FormControl fullWidth margin="dense">
                  <InputLabel className="required">{commonStrings.EMAIL}</InputLabel>
                  <Input
                    {...register('additionalDriverEmail')}
                    type="text"
                    error={!!errors.additionalDriverEmail}
                    required
                    autoComplete="off"
                  />
                  {errors.additionalDriverEmail && <FormHelperText error>{errors.additionalDriverEmail.message}</FormHelperText>}
                </FormControl>

                <FormControl fullWidth margin="dense">
                  <InputLabel className="required">{commonStrings.PHONE}</InputLabel>
                  <Input
                    {...register('additionalDriverPhone')}
                    type="text"
                    error={!!errors.additionalDriverPhone}
                    required
                    autoComplete="off"
                  />
                  {errors.additionalDriverPhone && <FormHelperText error>{errors.additionalDriverPhone.message}</FormHelperText>}
                </FormControl>
                <FormControl fullWidth margin="dense">
                  <DatePicker
                    label={commonStrings.BIRTH_DATE}
                    required
                    onChange={(birthDate) => {
                      if (birthDate) {
                        if (errors.additionalDriverBirthDate) {
                          clearErrors('additionalDriverBirthDate')
                        }
                        setValue('additionalDriverBirthDate', birthDate, { shouldValidate: true })
                      }
                    }}
                    language={UserService.getLanguage()}
                  />
                  {errors.additionalDriverBirthDate && (
                    <FormHelperText error>
                      {helper.getBirthDateError(env.MINIMUM_AGE)}
                    </FormHelperText>
                  )}
                </FormControl>
              </>
            )}

            <div>
              <div className="buttons">
                <Button type="submit" variant="contained" className="btn-primary btn-margin-bottom" size="small" disabled={isSubmitting}>
                  {commonStrings.CREATE}
                </Button>
                <Button variant="contained" className="btn-secondary btn-margin-bottom" size="small" onClick={() => navigate('/')}>
                  {commonStrings.CANCEL}
                </Button>
              </div>
            </div>
          </form>
        </Paper>
      </div>
    </Layout>
  )
}

export default CreateBooking
