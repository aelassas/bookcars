import React, { useState, useCallback } from 'react'
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
import validator from 'validator'
import { intervalToDuration } from 'date-fns'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings as blStrings } from '@/lang/booking-list'
import { strings as bfStrings } from '@/lang/booking-filter'
import { strings as csStrings } from '@/lang/cars'
import { strings } from '@/lang/booking'
import * as helper from '@/common/helper'
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

import '@/assets/css/booking.css'

const UpdateBooking = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState<bookcarsTypes.User>()
  const [loading, setLoading] = useState(false)
  const [noMatch, setNoMatch] = useState(false)
  const [error, setError] = useState(false)
  const [booking, setBooking] = useState<bookcarsTypes.Booking>()
  const [visible, setVisible] = useState(false)
  const [isSupplier, setIsSupplier] = useState(false)
  const [supplier, setSupplier] = useState<bookcarsTypes.Option>()
  const [car, setCar] = useState<bookcarsTypes.Car>()
  const [price, setPrice] = useState<number>()
  const [driver, setDriver] = useState<bookcarsTypes.Option>()
  const [pickupLocation, setPickupLocation] = useState<bookcarsTypes.Option>()
  const [dropOffLocation, setDropOffLocation] = useState<bookcarsTypes.Option>()
  const [from, setFrom] = useState<Date>()
  const [to, setTo] = useState<Date>()
  const [minDate, setMinDate] = useState<Date>()
  const [maxDate, setMaxDate] = useState<Date>()
  const [status, setStatus] = useState<bookcarsTypes.BookingStatus>()
  const [cancellation, setCancellation] = useState(false)
  const [amendments, setAmendments] = useState(false)
  const [theftProtection, setTheftProtection] = useState(false)
  const [collisionDamageWaiver, setCollisionDamageWaiver] = useState(false)
  const [fullInsurance, setFullInsurance] = useState(false)
  const [additionalDriver, setAdditionalDriver] = useState(false)
  const [additionalDriverfullName, setAdditionalDriverFullName] = useState('')
  const [addtionalDriverEmail, setAdditionalDriverEmail] = useState('')
  const [additionalDriverPhone, setAdditionalDriverPhone] = useState('')
  const [addtionalDriverBirthDate, setAdditionalDriverBirthDate] = useState<Date>()
  const [additionalDriverEmailValid, setAdditionalDriverEmailValid] = useState(true)
  const [additionalDriverPhoneValid, setAdditionalDriverPhoneValid] = useState(true)
  const [additionalDriverBirthDateValid, setAdditionalDriverBirthDateValid] = useState(true)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [language, setLanguage] = useState(env.DEFAULT_LANGUAGE)
  const [fromError, setFromError] = useState(false)
  const [toError, setToError] = useState(false)

  const handleSupplierChange = (values: bookcarsTypes.Option[]) => {
    setSupplier(values.length > 0 ? values[0] : undefined)
  }

  const handleDriverChange = (values: bookcarsTypes.Option[]) => {
    setDriver(values.length > 0 ? values[0] : undefined)
  }

  const handlePickupLocationChange = (values: bookcarsTypes.Option[]) => {
    setPickupLocation(values.length > 0 ? values[0] : undefined)
  }

  const handleDropOffLocationChange = (values: bookcarsTypes.Option[]) => {
    setDropOffLocation(values.length > 0 ? values[0] : undefined)
  }

  const handleCarSelectListChange = useCallback(
    async (values: bookcarsTypes.Car[]) => {
      try {
        const newCar = values.length > 0 ? values[0] : undefined

        if ((!car && newCar) || (car && newCar && car._id !== newCar._id)) {
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
            setCar(newCar)
          } else {
            helper.error()
          }
        } else if (!newCar) {
          setPrice(0)
          setCar(newCar)
        } else {
          setCar(newCar)
        }
      } catch (err) {
        helper.error(err)
      }
    },
    [car, from, to, booking, cancellation, amendments, theftProtection, collisionDamageWaiver, fullInsurance, additionalDriver],
  )

  const handleStatusChange = (value: bookcarsTypes.BookingStatus) => {
    setStatus(value)
  }

  const handleCancellationChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (booking && car && from && to) {
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

      const _price = await bookcarsHelper.calculateTotalPrice(car, from, to, car.supplier.priceChangeRate || 0, options)
      setBooking(_booking)
      setPrice(_price)
      setCancellation(_booking.cancellation || false)
    }
  }

  const handleAmendmentsChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (booking && car && from && to) {
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

      const _price = await bookcarsHelper.calculateTotalPrice(car, from, to, car.supplier.priceChangeRate || 0, options)
      setBooking(_booking)
      setPrice(_price)
      setAmendments(_booking.amendments || false)
    }
  }

  const handleCollisionDamageWaiverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (booking && car && from && to) {
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

      const _price = await bookcarsHelper.calculateTotalPrice(car, from, to, car.supplier.priceChangeRate || 0, options)
      setBooking(_booking)
      setPrice(_price)
      setCollisionDamageWaiver(_booking.collisionDamageWaiver || false)
    }
  }

  const handleTheftProtectionChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (booking && car && from && to) {
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

      const _price = await bookcarsHelper.calculateTotalPrice(car, from, to, car.supplier.priceChangeRate || 0, options)
      setBooking(_booking)
      setPrice(_price)
      setTheftProtection(_booking.theftProtection || false)
    }
  }

  const handleFullInsuranceChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (booking && car && from && to) {
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

      const _price = await bookcarsHelper.calculateTotalPrice(car, from, to, car.supplier.priceChangeRate || 0, options)
      setBooking(_booking)
      setPrice(_price)
      setFullInsurance(_booking.fullInsurance || false)
    }
  }

  const handleAdditionalDriverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (booking && car && from && to) {
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

      const _price = await bookcarsHelper.calculateTotalPrice(car, from, to, car.supplier.priceChangeRate || 0, options)
      setBooking(_booking)
      setPrice(_price)
      setAdditionalDriver(_booking.additionalDriver || false)
    }
  }

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

  const _validateEmail = (email: string) => {
    if (email) {
      if (validator.isEmail(email)) {
        setAdditionalDriverEmailValid(true)
        return true
      }
      setAdditionalDriverEmailValid(false)
      return false
    }
    setAdditionalDriverEmailValid(true)
    return false
  }

  const _validatePhone = (phone?: string) => {
    if (phone) {
      const _phoneValid = validator.isMobilePhone(phone)
      setAdditionalDriverPhoneValid(_phoneValid)

      return _phoneValid
    }
    setAdditionalDriverPhoneValid(true)

    return true
  }

  const _validateBirthDate = (date?: Date) => {
    if (date) {
      const now = new Date()
      const sub = intervalToDuration({ start: date, end: now }).years ?? 0
      const _birthDateValid = sub >= env.MINIMUM_AGE

      setAdditionalDriverBirthDateValid(_birthDateValid)
      return _birthDateValid
    }
    setAdditionalDriverBirthDateValid(true)
    return true
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    try {
      e.preventDefault()

      const additionalDriverSet = helper.carOptionAvailable(car, 'additionalDriver') && additionalDriver

      if (additionalDriverSet) {
        const emailValid = _validateEmail(addtionalDriverEmail)
        if (!emailValid) {
          return
        }

        const phoneValid = _validatePhone(additionalDriverPhone)
        if (!phoneValid) {
          return
        }

        const birthDateValid = _validateBirthDate(addtionalDriverBirthDate)
        if (!birthDateValid) {
          return
        }
      }

      if (!booking || !supplier || !car || !driver || !pickupLocation || !dropOffLocation || !from || !to || !status) {
        helper.error()
        return
      }

      if (fromError || toError) {
        return
      }

      const _booking: bookcarsTypes.Booking = {
        _id: booking._id,
        supplier: supplier._id,
        car: car._id,
        driver: driver._id,
        pickupLocation: pickupLocation._id,
        dropOffLocation: dropOffLocation._id,
        from,
        to,
        status,
        cancellation,
        amendments,
        theftProtection,
        collisionDamageWaiver,
        fullInsurance,
        additionalDriver: additionalDriverSet,
        price,
      }

      let payload: bookcarsTypes.UpsertBookingPayload
      let _additionalDriver: bookcarsTypes.AdditionalDriver
      if (additionalDriverSet) {
        if (!addtionalDriverBirthDate) {
          helper.error()
          return
        }
        _additionalDriver = {
          fullName: additionalDriverfullName,
          email: addtionalDriverEmail,
          phone: additionalDriverPhone,
          birthDate: addtionalDriverBirthDate,
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
          setAdditionalDriverFullName('')
          setAdditionalDriverEmail('')
          setAdditionalDriverPhone('')
          setAdditionalDriverBirthDate(undefined)
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
              setSupplier({
                _id: cmp._id as string,
                name: cmp.fullName,
                image: cmp.avatar,
              })
              setCar(_booking.car as bookcarsTypes.Car)
              const drv = _booking.driver as bookcarsTypes.User
              setDriver({
                _id: drv._id as string,
                name: drv.fullName,
                image: drv.avatar,
              })
              const pul = _booking.pickupLocation as bookcarsTypes.Location
              setPickupLocation({
                _id: pul._id,
                name: pul.name || '',
              })
              const dol = _booking.dropOffLocation as bookcarsTypes.Location
              setDropOffLocation({
                _id: dol._id,
                name: dol.name || '',
              })
              setFrom(new Date(_booking.from))
              const _minDate = new Date(_booking.from)
              _minDate.setDate(_minDate.getDate() + 1)
              setMinDate(_minDate)
              setTo(new Date(_booking.to))
              const _maxDate = new Date(_booking.to)
              _maxDate.setDate(_maxDate.getDate() - 1)
              setMaxDate(_maxDate)
              setStatus(_booking.status)
              setCancellation(_booking.cancellation || false)
              setAmendments(_booking.amendments || false)
              setTheftProtection(_booking.theftProtection || false)
              setCollisionDamageWaiver(_booking.collisionDamageWaiver || false)
              setFullInsurance(_booking.fullInsurance || false)
              setAdditionalDriver((_booking.additionalDriver && !!_booking._additionalDriver) || false)
              if (_booking.additionalDriver && _booking._additionalDriver) {
                const _additionalDriver = _booking._additionalDriver as bookcarsTypes.AdditionalDriver
                setAdditionalDriverFullName(_additionalDriver.fullName)
                setAdditionalDriverEmail(_additionalDriver.email)
                setAdditionalDriverPhone(_additionalDriver.phone)
                setAdditionalDriverBirthDate(new Date(_additionalDriver.birthDate))
              }
            } else {
              setLoading(false)
              setNoMatch(true)
            }
          } catch {
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

  const days = bookcarsHelper.days(from, to)

  return (
    <Layout onLoad={onLoad} strict>
      {visible && booking && (
        <div className="booking">
          <div className="col-1">
            <form onSubmit={handleSubmit}>
              {!isSupplier && (
                <FormControl fullWidth margin="dense">
                  <SupplierSelectList
                    label={blStrings.SUPPLIER}
                    required
                    variant="standard"
                    onChange={handleSupplierChange}
                    value={supplier}
                  />
                </FormControl>
              )}

              <UserSelectList
                label={blStrings.DRIVER}
                required
                variant="standard"
                onChange={handleDriverChange}
                value={driver}
              />

              <FormControl fullWidth margin="dense">
                <LocationSelectList
                  label={bfStrings.PICK_UP_LOCATION}
                  required
                  variant="standard"
                  onChange={handlePickupLocationChange}
                  value={pickupLocation}
                />
              </FormControl>

              <FormControl fullWidth margin="dense">
                <LocationSelectList
                  label={bfStrings.DROP_OFF_LOCATION}
                  required
                  variant="standard"
                  onChange={handleDropOffLocationChange}
                  value={dropOffLocation}
                />
              </FormControl>

              <CarSelectList
                label={blStrings.CAR}
                supplier={(supplier && supplier._id) || ''}
                pickupLocation={(pickupLocation && pickupLocation._id) || ''}
                onChange={handleCarSelectListChange}
                required
                value={car}
              />

              <FormControl fullWidth margin="dense">
                <DateTimePicker
                  label={commonStrings.FROM}
                  value={from}
                  maxDate={maxDate}
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

                      const _price = await bookcarsHelper.calculateTotalPrice(car!, date, to!, car!.supplier.priceChangeRate || 0, options)
                      setBooking(_booking)
                      setPrice(_price)
                      setFrom(date)

                      const _minDate = new Date(date)
                      _minDate.setDate(_minDate.getDate() + 1)
                      setMinDate(_minDate)
                      setFromError(false)
                    } else {
                      setFrom(undefined)
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

                      const _price = await bookcarsHelper.calculateTotalPrice(car!, from!, date, car!.supplier.priceChangeRate || 0, options)
                      setBooking(_booking)
                      setPrice(_price)
                      setTo(date)

                      const _maxDate = new Date(date)
                      _maxDate.setDate(_maxDate.getDate() - 1)
                      setMaxDate(_maxDate)
                      setToError(false)
                    } else {
                      setTo(undefined)
                      setMaxDate(undefined)
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
                <StatusList label={blStrings.STATUS} onChange={handleStatusChange} required value={status} />
              </FormControl>

              <div className="info">
                <InfoIcon />
                <span>{commonStrings.OPTIONAL}</span>
              </div>

              <FormControl fullWidth margin="dense" className="checkbox-fc">
                <FormControlLabel
                  control={<Switch checked={cancellation} onChange={handleCancellationChange} color="primary" />}
                  label={csStrings.CANCELLATION}
                  className="checkbox-fcl"
                  disabled={!helper.carOptionAvailable(car, 'cancellation')}
                />
              </FormControl>

              <FormControl fullWidth margin="dense" className="checkbox-fc">
                <FormControlLabel
                  control={<Switch checked={amendments} onChange={handleAmendmentsChange} color="primary" />}
                  label={csStrings.AMENDMENTS}
                  className="checkbox-fcl"
                  disabled={!helper.carOptionAvailable(car, 'amendments')}
                />
              </FormControl>

              <FormControl fullWidth margin="dense" className="checkbox-fc">
                <FormControlLabel
                  control={<Switch checked={theftProtection} onChange={handleTheftProtectionChange} color="primary" />}
                  label={csStrings.THEFT_PROTECTION}
                  className="checkbox-fcl"
                  disabled={!helper.carOptionAvailable(car, 'theftProtection')}
                />
              </FormControl>

              <FormControl fullWidth margin="dense" className="checkbox-fc">
                <FormControlLabel
                  control={<Switch checked={collisionDamageWaiver} onChange={handleCollisionDamageWaiverChange} color="primary" />}
                  label={csStrings.COLLISION_DAMAGE_WAVER}
                  className="checkbox-fcl"
                  disabled={!helper.carOptionAvailable(car, 'collisionDamageWaiver')}
                />
              </FormControl>

              <FormControl fullWidth margin="dense" className="checkbox-fc">
                <FormControlLabel
                  control={<Switch checked={fullInsurance} onChange={handleFullInsuranceChange} color="primary" />}
                  label={csStrings.FULL_INSURANCE}
                  className="checkbox-fcl"
                  disabled={!helper.carOptionAvailable(car, 'fullInsurance')}
                />
              </FormControl>

              <FormControl fullWidth margin="dense" className="checkbox-fc">
                <FormControlLabel
                  control={<Switch checked={additionalDriver} onChange={handleAdditionalDriverChange} color="primary" />}
                  label={csStrings.ADDITIONAL_DRIVER}
                  className="checkbox-fcl"
                  disabled={!helper.carOptionAvailable(car, 'additionalDriver')}
                />
              </FormControl>

              {helper.carOptionAvailable(car, 'additionalDriver') && additionalDriver && (
                <>
                  <div className="info">
                    <DriverIcon />
                    <span>{csStrings.ADDITIONAL_DRIVER}</span>
                  </div>
                  <FormControl fullWidth margin="dense">
                    <InputLabel className="required">{commonStrings.FULL_NAME}</InputLabel>
                    <Input
                      type="text"
                      value={additionalDriverfullName}
                      required
                      onChange={(e) => {
                        setAdditionalDriverFullName(e.target.value)
                      }}
                      autoComplete="off"
                    />
                  </FormControl>
                  <FormControl fullWidth margin="dense">
                    <InputLabel className="required">{commonStrings.EMAIL}</InputLabel>
                    <Input
                      type="text"
                      value={addtionalDriverEmail}
                      error={!additionalDriverEmailValid}
                      onBlur={(e) => {
                        _validateEmail(e.target.value)
                      }}
                      onChange={(e) => {
                        setAdditionalDriverEmail(e.target.value)

                        if (!e.target.value) {
                          setAdditionalDriverEmailValid(true)
                        }
                      }}
                      required
                      autoComplete="off"
                    />
                    <FormHelperText error={!additionalDriverEmailValid}>{(!additionalDriverEmailValid && commonStrings.EMAIL_NOT_VALID) || ''}</FormHelperText>
                  </FormControl>
                  <FormControl fullWidth margin="dense">
                    <InputLabel className="required">{commonStrings.PHONE}</InputLabel>
                    <Input
                      type="text"
                      value={additionalDriverPhone}
                      error={!additionalDriverPhoneValid}
                      onBlur={(e) => {
                        _validatePhone(e.target.value)
                      }}
                      onChange={(e) => {
                        setAdditionalDriverPhone(e.target.value)

                        if (!e.target.value) {
                          setAdditionalDriverPhoneValid(true)
                        }
                      }}
                      required
                      autoComplete="off"
                    />
                    <FormHelperText error={!additionalDriverPhoneValid}>{(!additionalDriverPhoneValid && commonStrings.PHONE_NOT_VALID) || ''}</FormHelperText>
                  </FormControl>
                  <FormControl fullWidth margin="dense">
                    <DatePicker
                      label={commonStrings.BIRTH_DATE}
                      value={addtionalDriverBirthDate}
                      required
                      onChange={(_birthDate) => {
                        if (_birthDate) {
                          const _birthDateValid = _validateBirthDate(_birthDate)
                          setAdditionalDriverBirthDate(_birthDate)
                          setAdditionalDriverBirthDateValid(_birthDateValid)
                        }
                      }}
                      language={UserService.getLanguage()}
                    />
                    <FormHelperText error={!additionalDriverBirthDateValid}>{(!additionalDriverBirthDateValid && helper.getBirthDateError(env.MINIMUM_AGE)) || ''}</FormHelperText>
                  </FormControl>
                </>
              )}

              <div>
                <div className="buttons">
                  <Button variant="contained" className="btn-primary btn-margin-bottom" size="small" type="submit">
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
            <div className="col-2-header">
              <div className="price">
                <span className="price-days">{helper.getDays(days)}</span>
                <span className="price-main">{bookcarsHelper.formatPrice(price as number, commonStrings.CURRENCY, language)}</span>
                <span className="price-day">{`${csStrings.PRICE_PER_DAY} ${bookcarsHelper.formatPrice((price as number) / days, commonStrings.CURRENCY, language)}`}</span>
              </div>
            </div>
            <CarList
              className="car"
              user={user}
              booking={booking}
              cars={((car && [booking.car]) as bookcarsTypes.Car[]) || []}
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
      {error && <Error />}
    </Layout>
  )
}

export default UpdateBooking
