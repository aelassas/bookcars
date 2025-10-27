import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FormControl,
  FormControlLabel,
  Switch,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormHelperText,
  InputLabel,
  Input
} from '@mui/material'
import {
  Info as InfoIcon,
  Person as DriverIcon
} from '@mui/icons-material'
import { DateTimeValidationError } from '@mui/x-date-pickers'
import { Control, FieldErrors, useForm, UseFormClearErrors, UseFormRegister, UseFormSetValue, UseFormTrigger, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings as blStrings } from '@/lang/booking-list'
import { strings as bfStrings } from '@/lang/booking-filter'
import { strings as csStrings } from '@/lang/cars'
import { strings } from '@/lang/booking'
import * as helper from '@/utils/helper'
import Layout from '@/components/Layout'
import * as UserService from '@/services/UserService'
import * as BookingService from '@/services/BookingService'
import * as CarService from '@/services/CarService'
import Backdrop from '@/components/SimpleBackdrop'
import NoMatch from './NoMatch'
import Error from './Error'
import CarList from '@/components/CarList'
import SupplierSelectList from '@/components/SupplierSelectList'
import UserSelectList from '@/components/UserSelectList'
import LocationSelectList from '@/components/LocationSelectList'
import CarSelectList from '@/components/CarSelectList'
import StatusList from '@/components/StatusList'
import DateTimePicker from '@/components/DateTimePicker'
import DatePicker from '@/components/DatePicker'
import { Option } from '@/models/common'
import { schema, FormFields } from '@/models/BookingForm'

import '@/assets/css/booking.css'

// Create a separate component to avoid re-renders
interface AdditionalDriverFormProps {
  control: Control<FormFields>
  register: UseFormRegister<FormFields>
  errors: FieldErrors<FormFields>
  clearErrors: UseFormClearErrors<FormFields>
  trigger: UseFormTrigger<FormFields>
  setValue: UseFormSetValue<FormFields>
  language: string
}

const AdditionalDriverForm = ({ control, register, errors, clearErrors, trigger, setValue, language }: AdditionalDriverFormProps) => {
  // Only watch the fields needed in this component
  const additionalDriverBirthDate = useWatch({ control, name: 'additionalDriverBirthDate' })
  const additionalEmail = useWatch({ control, name: 'additionalDriverEmail' })
  const additionalDriverPhone = useWatch({ control, name: 'additionalDriverPhone' })

  return (
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
          value={additionalEmail || ''}
          onChange={(e) => {
            if (errors.additionalDriverEmail) {
              clearErrors('additionalDriverEmail')
            }

            setValue('additionalDriverEmail', e.target.value)
          }}
          onBlur={() => {
            trigger('additionalDriverEmail')
          }}
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
          value={additionalDriverPhone || ''}
          type="text"
          error={!!errors.additionalDriverPhone}
          required
          autoComplete="off"
          onChange={(e) => {
            if (errors.additionalDriverPhone) {
              clearErrors('additionalDriverPhone')
            }

            setValue('additionalDriverPhone', e.target.value)
          }}
          onBlur={() => {
            trigger('additionalDriverPhone')
          }}
        />
        {errors.additionalDriverPhone && <FormHelperText error>{errors.additionalDriverPhone.message}</FormHelperText>}
      </FormControl>
      <FormControl fullWidth margin="dense">
        <DatePicker
          label={commonStrings.BIRTH_DATE}
          value={additionalDriverBirthDate}
          required
          onChange={(birthDate) => {
            if (birthDate) {
              if (errors.additionalDriverBirthDate) {
                clearErrors('additionalDriverBirthDate')
              }
              setValue('additionalDriverBirthDate', birthDate)
              trigger('additionalDriverBirthDate')
            }
          }}
          language={language}
        />
        {errors.additionalDriverBirthDate && (
          <FormHelperText error>
            {helper.getBirthDateError(env.MINIMUM_AGE)}
          </FormHelperText>
        )}
      </FormControl>
    </>
  )
}

const UpdateBooking = () => {
  const navigate = useNavigate()

  const [user, setUser] = useState<bookcarsTypes.User>()
  const [loading, setLoading] = useState(false)
  const [noMatch, setNoMatch] = useState(false)
  const [formError, setFormError] = useState(false)
  const [booking, setBooking] = useState<bookcarsTypes.Booking>()
  const [visible, setVisible] = useState(false)
  const [carObj, setCarObj] = useState<bookcarsTypes.Car>()
  const [isSupplier, setIsSupplier] = useState(false)
  const [minDate, setMinDate] = useState<Date>()
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [language, setLanguage] = useState(env.DEFAULT_LANGUAGE)
  const [fromError, setFromError] = useState(false)
  const [toError, setToError] = useState(false)
  const [price, setPrice] = useState<number>()

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    clearErrors,
    trigger,
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
  const dropOffLocation = useWatch({ control, name: 'dropOffLocation' })
  const driver = useWatch({ control, name: 'driver' })
  const from = useWatch({ control, name: 'from' })
  const to = useWatch({ control, name: 'to' })
  const status = useWatch({ control, name: 'status' })
  const cancellation = useWatch({ control, name: 'cancellation' })
  const amendments = useWatch({ control, name: 'amendments' })
  const theftProtection = useWatch({ control, name: 'theftProtection' })
  const collisionDamageWaiver = useWatch({ control, name: 'collisionDamageWaiver' })
  const fullInsurance = useWatch({ control, name: 'fullInsurance' })
  const additionalDriver = useWatch({ control, name: 'additionalDriver' })

  const toastErr = (err?: unknown, hideLoading?: boolean): void => {
    helper.error(err)
    if (hideLoading) {
      setLoading(false)
    }
  }

  const handleDelete = () => {
    setOpenDeleteDialog(true)
  }

  const handleCancelDelete = () => {
    setOpenDeleteDialog(false)
  }

  const handleConfirmDelete = async () => {
    if (booking && booking._id) {
      try {
        setOpenDeleteDialog(false)

        const _status = await BookingService.deleteBookings([booking._id])

        if (_status === 200) {
          navigate('/')
        } else {
          toastErr(true)
        }
      } catch (err) {
        helper.error(err)
      }
    } else {
      helper.error()
    }
  }

  const onSubmit = async (data: FormFields) => {
    try {
      const additionalDriverSet = helper.carOptionAvailable(carObj, 'additionalDriver') && data.additionalDriver

      if (!booking) {
        helper.error()
        return
      }

      if (fromError || toError) {
        return
      }

      const _booking: bookcarsTypes.Booking = {
        _id: booking._id,
        supplier: data.supplier?._id!,
        car: data.car?._id!,
        driver: data.driver?._id,
        pickupLocation: data.pickupLocation?._id!,
        dropOffLocation: data.dropOffLocation?._id!,
        from: data.from!,
        to: data.to!,
        status: data.status as bookcarsTypes.BookingStatus,
        cancellation: data.cancellation,
        amendments: data.amendments,
        theftProtection: data.theftProtection,
        collisionDamageWaiver: data.collisionDamageWaiver,
        fullInsurance: data.fullInsurance,
        additionalDriver: additionalDriverSet,
        price,
        isDeposit: booking.isDeposit,
        isPayedInFull: booking.isPayedInFull,
      }

      let payload: bookcarsTypes.UpsertBookingPayload
      let _additionalDriver: bookcarsTypes.AdditionalDriver
      if (additionalDriverSet) {
        _additionalDriver = {
          fullName: data.additionalDriverFullName!,
          email: data.additionalDriverEmail!,
          phone: data.additionalDriverPhone!,
          birthDate: data.additionalDriverBirthDate!,
        }

        payload = {
          booking: _booking,
          additionalDriver: _additionalDriver,
        }
      } else {
        payload = { booking: _booking }
      }

      const _status = await BookingService.update(payload)

      if (_status === 200) {
        if (!additionalDriverSet) {
          setValue('additionalDriverFullName', '')
          setValue('additionalDriverEmail', '')
          setValue('additionalDriverPhone', '')
          setValue('additionalDriverBirthDate', undefined)
        }
        helper.info(commonStrings.UPDATED)
      } else {
        toastErr()
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const onLoad = async (_user?: bookcarsTypes.User) => {
    if (_user) {
      setUser(_user)
      setLanguage(UserService.getLanguage())
      setLoading(true)

      const params = new URLSearchParams(window.location.search)
      if (params.has('b')) {
        const id = params.get('b')
        if (id && id !== '') {
          try {
            const _booking = await BookingService.getBooking(id)

            if (_booking) {
              if (!helper.admin(_user) && (_booking.supplier as bookcarsTypes.User)._id !== _user._id) {
                setLoading(false)
                setNoMatch(true)
                return
              }

              if (!_booking.driver) {
                setLoading(false)
                setNoMatch(true)
                return
              }

              setBooking(_booking)
              setPrice(_booking.price)
              setLoading(false)
              setVisible(true)
              setIsSupplier(_user.type === bookcarsTypes.RecordType.Supplier)
              const cmp = _booking.supplier as bookcarsTypes.User
              setValue('supplier', {
                _id: cmp._id as string,
                name: cmp.fullName,
                image: cmp.avatar,
              })
              setValue('car', _booking.car as bookcarsTypes.Car)
              setCarObj(_booking.car as bookcarsTypes.Car)
              const drv = _booking.driver as bookcarsTypes.User
              setValue('driver', {
                _id: drv._id as string,
                name: drv.fullName,
                image: drv.avatar,
              })
              const pul = _booking.pickupLocation as bookcarsTypes.Location
              setValue('pickupLocation', {
                _id: pul._id,
                name: pul.name || '',
              })
              const dol = _booking.dropOffLocation as bookcarsTypes.Location
              setValue('dropOffLocation', {
                _id: dol._id,
                name: dol.name || '',
              })
              setValue('from', new Date(_booking.from))
              const _minDate = new Date(_booking.from)
              _minDate.setDate(_minDate.getDate() + 1)
              setMinDate(_minDate)
              setValue('to', new Date(_booking.to))

              setValue('status', _booking.status)
              setValue('cancellation', _booking.cancellation || false)
              setValue('amendments', _booking.amendments || false)
              setValue('theftProtection', _booking.theftProtection || false)
              setValue('collisionDamageWaiver', _booking.collisionDamageWaiver || false)
              setValue('fullInsurance', _booking.fullInsurance || false)
              setValue('additionalDriver', (_booking.additionalDriver && !!_booking._additionalDriver) || false)
              if (_booking.additionalDriver && _booking._additionalDriver) {
                const _additionalDriver = _booking._additionalDriver as bookcarsTypes.AdditionalDriver
                setValue('additionalDriverFullName', _additionalDriver.fullName)
                setValue('additionalDriverEmail', _additionalDriver.email)
                setValue('additionalDriverPhone', _additionalDriver.phone)
                setValue('additionalDriverBirthDate', new Date(_additionalDriver.birthDate))
              }
            } else {
              setLoading(false)
              setNoMatch(true)
            }
          } catch {
            setLoading(false)
            setFormError(true)
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

  const days = bookcarsHelper.days(from, to)

  return (
    <Layout onLoad={onLoad} strict>
      {visible && booking && (
        <div className="booking">
          <div className="col-1">
            <form onSubmit={handleSubmit(onSubmit)}>
              {!isSupplier && (
                <FormControl fullWidth margin="dense">
                  <SupplierSelectList
                    label={blStrings.SUPPLIER}
                    required
                    variant="standard"
                    onChange={(values) => {
                      const supplier = values.length > 0 ? values[0] as Option : undefined
                      setValue('supplier', supplier)
                      setValue('car', undefined)
                      setCarObj(undefined)
                    }}
                    value={supplier}
                  />
                </FormControl>
              )}

              <UserSelectList
                label={blStrings.DRIVER}
                required
                variant="standard"
                onChange={(values) => setValue('driver', values.length > 0 ? values[0] as Option : undefined)}
                value={driver}
              />

              <FormControl fullWidth margin="dense">
                <LocationSelectList
                  label={bfStrings.PICK_UP_LOCATION}
                  required
                  variant="standard"
                  onChange={(values) => setValue('pickupLocation', values.length > 0 ? values[0] as Option : undefined)}
                  value={pickupLocation}
                />
              </FormControl>

              <FormControl fullWidth margin="dense">
                <LocationSelectList
                  label={bfStrings.DROP_OFF_LOCATION}
                  required
                  variant="standard"
                  onChange={(values) => setValue('dropOffLocation', values.length > 0 ? values[0] as Option : undefined)}
                  value={dropOffLocation}
                />
              </FormControl>

              <CarSelectList
                label={blStrings.CAR}
                supplier={supplier?._id!}
                pickupLocation={pickupLocation?._id!}
                value={carObj}
                onChange={async (values) => {
                  try {
                    const newCar = values.length > 0 ? values[0] : undefined

                    if ((!carObj && newCar) || (carObj && newCar && carObj._id !== newCar._id)) {
                      // car changed
                      const _car = await CarService.getCar(newCar._id)

                      if (_car && from && to) {
                        const _booking = bookcarsHelper.clone(booking)
                        _booking.car = _car

                        const options: bookcarsTypes.CarOptions = {
                          cancellation,
                          amendments,
                          theftProtection,
                          collisionDamageWaiver,
                          fullInsurance,
                          additionalDriver,
                        }

                        const _price = await bookcarsHelper.calculateTotalPrice(_car, from, to, _car.supplier.priceChangeRate || 0, options)
                        setPrice(_price)

                        setBooking(_booking)
                        setCarObj(newCar)
                        setValue('car', newCar)
                      } else {
                        helper.error()
                      }
                    } else if (!newCar) {
                      setPrice(0)
                      setCarObj(newCar)
                      setValue('car', newCar)
                    } else {
                      setCarObj(newCar)
                      setValue('car', newCar)
                    }
                  } catch (err) {
                    helper.error(err)
                  }
                }}
                required
              />

              <FormControl fullWidth margin="dense">
                <DateTimePicker
                  label={commonStrings.FROM}
                  value={from}
                  showClear
                  required
                  onChange={async (date) => {
                    if (date) {
                      const _booking = bookcarsHelper.clone(booking) as bookcarsTypes.Booking
                      _booking.from = date

                      const options: bookcarsTypes.CarOptions = {
                        cancellation,
                        amendments,
                        theftProtection,
                        collisionDamageWaiver,
                        fullInsurance,
                        additionalDriver,
                      }

                      const _price = await bookcarsHelper.calculateTotalPrice(carObj!, date, to!, carObj!.supplier.priceChangeRate || 0, options)
                      setBooking(_booking)
                      setPrice(_price)
                      setValue('from', date)

                      const _minDate = new Date(date)
                      _minDate.setDate(_minDate.getDate() + 1)
                      setMinDate(_minDate)
                      setFromError(false)

                      if (to && date > to) {
                        setValue('to', undefined)
                      }
                    } else {
                      setValue('from', undefined)
                      setMinDate(undefined)
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
                  onChange={async (date) => {
                    if (date) {
                      const _booking = bookcarsHelper.clone(booking) as bookcarsTypes.Booking
                      _booking.to = date

                      const options: bookcarsTypes.CarOptions = {
                        cancellation,
                        amendments,
                        theftProtection,
                        collisionDamageWaiver,
                        fullInsurance,
                        additionalDriver,
                      }

                      const _price = await bookcarsHelper.calculateTotalPrice(carObj!, from!, date, carObj!.supplier.priceChangeRate || 0, options)
                      setBooking(_booking)
                      setPrice(_price)
                      setValue('to', date)

                      const _maxDate = new Date(date)
                      _maxDate.setDate(_maxDate.getDate() - 1)
                      setToError(false)
                    } else {
                      setValue('to', undefined)
                    }
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
                  value={status}
                  onChange={(value) => {
                    if (status !== value) {
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
                      // {...register('cancellation')}
                      checked={cancellation}
                      color="primary"
                      disabled={!carObj || !helper.carOptionAvailable(carObj, 'cancellation')}
                      onChange={async (e) => {
                        if (booking && carObj && from && to) {
                          const _booking = bookcarsHelper.clone(booking) as bookcarsTypes.Booking
                          _booking.cancellation = e.target.checked

                          const options: bookcarsTypes.CarOptions = {
                            cancellation: _booking.cancellation,
                            amendments,
                            theftProtection,
                            collisionDamageWaiver,
                            fullInsurance,
                            additionalDriver,
                          }

                          const _price = await bookcarsHelper.calculateTotalPrice(carObj, from, to, carObj.supplier.priceChangeRate || 0, options)
                          setBooking(_booking)
                          setPrice(_price)
                          setValue('cancellation', _booking.cancellation || false)
                        }
                      }}
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
                      // {...register('amendments')}
                      checked={amendments}
                      color="primary"
                      disabled={!carObj || !helper.carOptionAvailable(carObj, 'amendments')}
                      onChange={async (e) => {
                        if (booking && carObj && from && to) {
                          const _booking = bookcarsHelper.clone(booking) as bookcarsTypes.Booking
                          _booking.amendments = e.target.checked

                          const options: bookcarsTypes.CarOptions = {
                            cancellation,
                            amendments: _booking.amendments,
                            theftProtection,
                            collisionDamageWaiver,
                            fullInsurance,
                            additionalDriver,
                          }

                          const _price = await bookcarsHelper.calculateTotalPrice(carObj, from, to, carObj.supplier.priceChangeRate || 0, options)
                          setBooking(_booking)
                          setPrice(_price)
                          setValue('amendments', _booking.amendments || false)
                        }
                      }}
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
                      // {...register('theftProtection')}
                      checked={theftProtection}
                      color="primary"
                      disabled={!carObj || !helper.carOptionAvailable(carObj, 'theftProtection')}
                      onChange={async (e) => {
                        if (booking && carObj && from && to) {
                          const _booking = bookcarsHelper.clone(booking) as bookcarsTypes.Booking
                          _booking.theftProtection = e.target.checked

                          const options: bookcarsTypes.CarOptions = {
                            cancellation,
                            amendments,
                            theftProtection: _booking.theftProtection,
                            collisionDamageWaiver,
                            fullInsurance,
                            additionalDriver,
                          }

                          const _price = await bookcarsHelper.calculateTotalPrice(carObj, from, to, carObj.supplier.priceChangeRate || 0, options)
                          setBooking(_booking)
                          setPrice(_price)
                          setValue('theftProtection', _booking.theftProtection || false)
                        }
                      }}
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
                      // {...register('collisionDamageWaiver')}
                      checked={collisionDamageWaiver}
                      color="primary"
                      disabled={!carObj || !helper.carOptionAvailable(carObj, 'collisionDamageWaiver')}
                      onChange={async (e) => {
                        if (booking && carObj && from && to) {
                          const _booking = bookcarsHelper.clone(booking) as bookcarsTypes.Booking
                          _booking.collisionDamageWaiver = e.target.checked

                          const options: bookcarsTypes.CarOptions = {
                            cancellation,
                            amendments,
                            theftProtection,
                            collisionDamageWaiver: _booking.collisionDamageWaiver,
                            fullInsurance,
                            additionalDriver,
                          }

                          const _price = await bookcarsHelper.calculateTotalPrice(carObj, from, to, carObj.supplier.priceChangeRate || 0, options)
                          setBooking(_booking)
                          setPrice(_price)
                          setValue('collisionDamageWaiver', _booking.collisionDamageWaiver || false)
                        }
                      }}
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
                      // {...register('fullInsurance')}
                      checked={fullInsurance}
                      color="primary"
                      disabled={!carObj || !helper.carOptionAvailable(carObj, 'fullInsurance')}
                      onChange={async (e) => {
                        if (booking && carObj && from && to) {
                          const _booking = bookcarsHelper.clone(booking) as bookcarsTypes.Booking
                          _booking.fullInsurance = e.target.checked

                          const options: bookcarsTypes.CarOptions = {
                            cancellation,
                            amendments,
                            theftProtection,
                            collisionDamageWaiver,
                            fullInsurance: _booking.fullInsurance,
                            additionalDriver,
                          }

                          const _price = await bookcarsHelper.calculateTotalPrice(carObj, from, to, carObj.supplier.priceChangeRate || 0, options)
                          setBooking(_booking)
                          setPrice(_price)
                          setValue('fullInsurance', _booking.fullInsurance || false)
                        }
                      }}
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
                      // {...register('additionalDriver')}
                      checked={additionalDriver}
                      color="primary"
                      disabled={!carObj || !helper.carOptionAvailable(carObj, 'additionalDriver')}
                      onChange={async (e) => {
                        if (booking && carObj && from && to) {
                          const _booking = bookcarsHelper.clone(booking) as bookcarsTypes.Booking
                          _booking.additionalDriver = e.target.checked

                          const options: bookcarsTypes.CarOptions = {
                            cancellation,
                            amendments,
                            theftProtection,
                            collisionDamageWaiver,
                            fullInsurance,
                            additionalDriver: _booking.additionalDriver,
                          }

                          const _price = await bookcarsHelper.calculateTotalPrice(carObj, from, to, carObj.supplier.priceChangeRate || 0, options)
                          setBooking(_booking)
                          setPrice(_price)
                          setValue('additionalDriver', _booking.additionalDriver || false)
                        }
                      }}
                    />
                  }
                  label={csStrings.ADDITIONAL_DRIVER}
                  className="checkbox-fcl"
                />
              </FormControl>

              {carObj && helper.carOptionAvailable(carObj, 'additionalDriver') && additionalDriver && (
                <AdditionalDriverForm
                  control={control}
                  register={register}
                  errors={errors}
                  clearErrors={clearErrors}
                  trigger={trigger}
                  setValue={setValue}
                  language={language}
                />
              )}

              <div>
                <div className="buttons">
                  <Button variant="contained" className="btn-primary btn-margin-bottom" size="small" type="submit" disabled={isSubmitting}>
                    {commonStrings.SAVE}
                  </Button>
                  {/* <Button variant="contained" className="btn-margin-bottom" color="error" size="small" onClick={handleDelete}>
                    {commonStrings.DELETE}
                  </Button> */}
                  <Button variant="contained" className="btn-secondary btn-margin-bottom" size="small" onClick={() => navigate('/')}>
                    {commonStrings.CANCEL}
                  </Button>
                </div>
              </div>
            </form>
          </div>
          <div className="col-2">
            {
              days > 0 && (
                <div className="col-2-header">
                  <div className="price">
                    <span className="price-days">{helper.getDays(days)}</span>
                    <span className="price-main">{bookcarsHelper.formatPrice(price as number, commonStrings.CURRENCY, language)}</span>
                    <span className="price-day">{`${csStrings.PRICE_PER_DAY} ${bookcarsHelper.formatPrice((price as number) / days, commonStrings.CURRENCY, language)}`}</span>
                  </div>
                </div>
              )
            }
            <CarList
              className="car"
              user={user}
              booking={booking}
              cars={((carObj && [booking.car]) as bookcarsTypes.Car[]) || []}
              language={language}
              hidePrice
            />
          </div>

          <Dialog disableEscapeKeyDown maxWidth="xs" open={openDeleteDialog}>
            <DialogTitle className="dialog-header">{commonStrings.CONFIRM_TITLE}</DialogTitle>
            <DialogContent>{strings.DELETE_BOOKING}</DialogContent>
            <DialogActions className="dialog-actions">
              <Button onClick={handleCancelDelete} variant="contained" className="btn-secondary">
                {commonStrings.CANCEL}
              </Button>
              <Button onClick={handleConfirmDelete} variant="contained" color="error">
                {commonStrings.DELETE}
              </Button>
            </DialogActions>
          </Dialog>
        </div>
      )}

      {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
      {noMatch && <NoMatch hideHeader />}
      {formError && <Error />}
    </Layout>
  )
}

export default UpdateBooking
