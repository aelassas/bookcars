import React, { useEffect, useState } from 'react'
import {
  OutlinedInput,
  InputLabel,
  FormControl,
  FormHelperText,
  Button,
  Paper,
  Checkbox,
  Link,
  FormControlLabel,
  Switch,
  RadioGroup,
  Radio
} from '@mui/material'
import {
  DirectionsCar as CarIcon,
  Lock as LockIcon,
  Person as DriverIcon,
  EventSeat as BookingIcon,
  Settings as PaymentOptionsIcon
} from '@mui/icons-material'
import validator from 'validator'
import { format, intervalToDuration } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import * as bookcarsTypes from 'bookcars-types'
import * as bookcarsHelper from 'bookcars-helper'
import env from '../config/env.config'
import * as BookingService from '../services/BookingService'
import { strings as commonStrings } from '../lang/common'
import { strings as csStrings } from '../lang/cars'
import { strings } from '../lang/checkout'
import * as helper from '../common/helper'
import * as UserService from '../services/UserService'
import * as CarService from '../services/CarService'
import * as LocationService from '../services/LocationService'
import Master from '../components/Master'
import Error from '../components/Error'
import DatePicker from '../components/DatePicker'
import Backdrop from '../components/SimpleBackdrop'
import NoMatch from './NoMatch'
import Info from './Info'

import SecurePayment from '../assets/img/secure-payment.png'
import '../assets/css/checkout.css'

const Checkout = () => {
  const [user, setUser] = useState<bookcarsTypes.User>()
  const [car, setCar] = useState<bookcarsTypes.Car>()
  const [pickupLocation, setPickupLocation] = useState<bookcarsTypes.Location>()
  const [dropOffLocation, setDropOffLocation] = useState<bookcarsTypes.Location>()
  const [from, setFrom] = useState<Date>()
  const [to, setTo] = useState<Date>()
  const [visible, setVisible] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [language, setLanguage] = useState(env.DEFAULT_LANGUAGE)
  const [noMatch, setNoMatch] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [birthDate, setBirthDate] = useState<Date>()
  const [birthDateValid, setBirthDateValid] = useState(true)
  const [emailValid, setEmailValid] = useState(true)
  const [emailRegitered, setEmailRegitered] = useState(false)
  const [phoneValid, setPhoneValid] = useState(true)
  const [tosChecked, setTosChecked] = useState(false)
  const [tosError, setTosError] = useState(false)
  const [error, setError] = useState(false)
  const [cardName, setCardName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardNumberValid, setCardNumberValid] = useState(true)
  const [cardMonth, setCardMonth] = useState('')
  const [cardMonthValid, setCardMonthValid] = useState(true)
  const [cardYear, setcardYear] = useState('')
  const [cardYearValid, setCardYearValid] = useState(true)
  const [cvv, setCvv] = useState('')
  const [cvvValid, setCvvValid] = useState(true)
  const [price, setPrice] = useState(0)
  const [emailInfo, setEmailInfo] = useState(true)
  const [phoneInfo, setPhoneInfo] = useState(true)
  const [cancellation, setCancellation] = useState(false)
  const [amendments, setAmendments] = useState(false)
  const [theftProtection, setTheftProtection] = useState(false)
  const [collisionDamageWaiver, setCollisionDamageWaiver] = useState(false)
  const [fullInsurance, setFullInsurance] = useState(false)
  const [additionalDriver, setAdditionalDriver] = useState(false)
  const [cardDateError, setCardDateError] = useState(false)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [addiontalDriverFullName, setAddiontalDriverFullName] = useState('')
  const [addiontalDriverEmail, setAddiontalDriverEmail] = useState('')
  const [addiontalDriverPhone, setAddiontalDriverPhone] = useState('')
  const [addiontalDriverBirthDate, setAddiontalDriverBirthDate] = useState<Date>()
  const [addiontalDriverEmailValid, setAddiontalDriverEmailValid] = useState(true)
  const [addiontalDriverPhoneValid, setAddiontalDriverPhoneValid] = useState(true)
  const [addiontalDriverBirthDateValid, setAddiontalDriverBirthDateValid] = useState(true)
  const [payLater, setPayLater] = useState(false)

  const [adManuallyChecked, setAdManuallyChecked] = useState(false)
  const [adFullName, setAdFullName] = useState(false)
  const [adEmail, setAdEmail] = useState(false)
  const [adPhone, setAdPhone] = useState(false)
  const [adBirthDate, setAdBirthDate] = useState(false)
  const adRequired = adManuallyChecked || adFullName || adEmail || adPhone || adBirthDate

  const adValidate = (val?: string | Date | null) => !!val

  useEffect(() => {
    setAdFullName(adValidate(addiontalDriverFullName))
  }, [addiontalDriverFullName])

  useEffect(() => {
    setAdEmail(adValidate(addiontalDriverEmail))
  }, [addiontalDriverEmail])

  useEffect(() => {
    setAdPhone(adValidate(addiontalDriverPhone))
  }, [addiontalDriverPhone])

  useEffect(() => {
    setAdBirthDate(adValidate(addiontalDriverBirthDate))
  }, [addiontalDriverBirthDate])

  const handleCancellationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (car && from && to) {
      const _cancellation = e.target.checked
      const options: bookcarsTypes.CarOptions = {
        cancellation: _cancellation,
        amendments,
        theftProtection,
        collisionDamageWaiver,
        fullInsurance,
        additionalDriver,
      }
      const _price = helper.price(car, from, to, options)

      setCancellation(_cancellation)
      setPrice(_price)
    }
  }

  const handleAmendmentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (car && from && to) {
      const _amendments = e.target.checked
      const options: bookcarsTypes.CarOptions = {
        cancellation,
        amendments: _amendments,
        theftProtection,
        collisionDamageWaiver,
        fullInsurance,
        additionalDriver,
      }
      const _price = helper.price(car, from, to, options)

      setAmendments(_amendments)
      setPrice(_price)
    }
  }

  const handleTheftProtectionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (car && from && to) {
      const _theftProtection = e.target.checked
      const options: bookcarsTypes.CarOptions = {
        cancellation,
        amendments,
        theftProtection: _theftProtection,
        collisionDamageWaiver,
        fullInsurance,
        additionalDriver,
      }
      const _price = helper.price(car, from, to, options)

      setTheftProtection(_theftProtection)
      setPrice(_price)
    }
  }

  const handleCollisionDamageWaiverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (car && from && to) {
      const _collisionDamageWaiver = e.target.checked
      const options: bookcarsTypes.CarOptions = {
        cancellation,
        amendments,
        theftProtection,
        collisionDamageWaiver: _collisionDamageWaiver,
        fullInsurance,
        additionalDriver,
      }
      const _price = helper.price(car, from, to, options)

      setCollisionDamageWaiver(_collisionDamageWaiver)
      setPrice(_price)
    }
  }

  const handleFullInsuranceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (car && from && to) {
      const _fullInsurance = e.target.checked
      const options: bookcarsTypes.CarOptions = {
        cancellation,
        amendments,
        theftProtection,
        collisionDamageWaiver,
        fullInsurance: _fullInsurance,
        additionalDriver,
      }
      const _price = helper.price(car, from, to, options)

      setFullInsurance(_fullInsurance)
      setPrice(_price)
    }
  }

  const handleAdditionalDriverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (car && from && to) {
      const _additionalDriver = e.target.checked
      const options: bookcarsTypes.CarOptions = {
        cancellation,
        amendments,
        theftProtection,
        collisionDamageWaiver,
        fullInsurance,
        additionalDriver: _additionalDriver,
      }
      const _price = helper.price(car, from, to, options)

      setAdditionalDriver(_additionalDriver)
      setPrice(_price)
      setAdManuallyChecked(_additionalDriver)
    }
  }

  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFullName(e.target.value)
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)

    if (!e.target.value) {
      setEmailRegitered(false)
      setEmailValid(true)
    }
  }

  const validateEmail = async (_email?: string) => {
    if (_email) {
      if (validator.isEmail(_email)) {
        try {
          const status = await UserService.validateEmail({ email: _email })
          if (status === 200) {
            setEmailRegitered(false)
            setEmailValid(true)
            setEmailInfo(true)
            return true
          }
          setEmailRegitered(true)
          setEmailValid(true)
          setError(false)
          setEmailInfo(false)
          return false
        } catch (err) {
          helper.error(err)
          setEmailRegitered(false)
          setEmailValid(true)
          setEmailInfo(true)
          return false
        }
      } else {
        setEmailRegitered(false)
        setEmailValid(false)
        setEmailInfo(true)
        return false
      }
    } else {
      setEmailRegitered(false)
      setEmailValid(true)
      setEmailInfo(true)
      return false
    }
  }

  // additionalDriver
  const _validateEmail = (_email?: string) => {
    if (_email) {
      if (validator.isEmail(_email)) {
        setAddiontalDriverEmailValid(true)
        return true
      }
      setAddiontalDriverEmailValid(false)
      return false
    }
    setAddiontalDriverEmailValid(true)
    return false
  }

  const handleEmailBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    await validateEmail(e.target.value)
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
      setPhoneInfo(_phoneValid)

      return _phoneValid
    }
    setPhoneValid(true)
    setPhoneInfo(true)

    return true
  }

  // additionalDriver
  const _validatePhone = (_phone?: string) => {
    if (_phone) {
      const _phoneValid = validator.isMobilePhone(_phone)
      setAddiontalDriverPhoneValid(_phoneValid)

      return _phoneValid
    }
    setAddiontalDriverPhoneValid(true)

    return true
  }

  const handlePhoneBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    validatePhone(e.target.value)
  }

  const validateBirthDate = (date?: Date) => {
    if (car && date && bookcarsHelper.isDate(date)) {
      const now = new Date()
      const sub = intervalToDuration({ start: date, end: now }).years ?? 0
      const _birthDateValid = sub >= car.minimumAge

      setBirthDateValid(_birthDateValid)
      return _birthDateValid
    }
    setBirthDateValid(true)
    return true
  }

  // additionalDriver
  const _validateBirthDate = (date?: Date) => {
    if (car && date && bookcarsHelper.isDate(date)) {
      const now = new Date()
      const sub = intervalToDuration({ start: date, end: now }).years ?? 0
      const _birthDateValid = sub >= car.minimumAge

      setAddiontalDriverBirthDateValid(_birthDateValid)
      return _birthDateValid
    }
    setAddiontalDriverBirthDateValid(true)
    return true
  }

  const handleTosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTosChecked(e.target.checked)

    if (e.target.checked) {
      setTosError(false)
    }
  }

  const validateCardNumber = (_cardNumber?: string) => {
    if (_cardNumber) {
      const _cardNumberValid = validator.isCreditCard(_cardNumber)
      setCardNumberValid(_cardNumberValid)

      return _cardNumberValid
    }
    setCardNumberValid(true)

    return true
  }

  const handleCardNumberBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    validateCardNumber(e.target.value)
  }

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCardNumber(e.target.value)

    if (!e.target.value) {
      setCardNumberValid(true)
    }
  }

  const validateCardMonth = (_cardMonth?: string) => {
    if (_cardMonth) {
      if (bookcarsHelper.isInteger(_cardMonth)) {
        const month = Number.parseInt(_cardMonth, 10)
        const _cardMonthValid = month >= 1 && month <= 12

        setCardMonthValid(_cardMonthValid)
        setCardDateError(false)

        return _cardMonthValid
      }
      setCardMonthValid(false)
      setCardDateError(false)

      return false
    }
    setCardMonthValid(true)
    setCardDateError(false)

    return true
  }

  const handleCardMonthBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    validateCardMonth(e.target.value)
  }

  const handleCardMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCardMonth(e.target.value)

    if (!e.target.value) {
      setCardMonthValid(true)
      setCardDateError(false)
    }
  }

  const validateCardYear = (_cardYear?: string) => {
    if (_cardYear) {
      if (bookcarsHelper.isYear(_cardYear)) {
        const year = Number.parseInt(_cardYear, 10)
        const currentYear = Number.parseInt(String(new Date().getFullYear()).slice(2), 10)
        const _cardYearValid = year >= currentYear

        setCardYearValid(_cardYearValid)
        setCardDateError(false)

        return _cardYearValid
      }
      setCardYearValid(false)
      setCardDateError(false)

      return false
    }
    setCardYearValid(true)
    setCardDateError(false)

    return true
  }

  const handleCardYearBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    validateCardYear(e.target.value)
  }

  const handleCardYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setcardYear(e.target.value)

    if (!e.target.value) {
      setCardYearValid(true)
      setCardDateError(false)
    }
  }

  const validateCvv = (_cvv?: string) => {
    if (_cvv) {
      const _cvvValid = bookcarsHelper.isCvv(_cvv)
      setCvvValid(_cvvValid)

      return _cvvValid
    }
    setCvvValid(true)

    return true
  }

  const handleCvvBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    validateCvv(e.target.value)
  }

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCvv(e.target.value)

    if (!e.target.value) {
      setCvvValid(true)
    }
  }

  const validateCardDate = (_cardMonth: string, _cardYear: string) => {
    const today = new Date()
    const cardDate = new Date()
    const y = Number.parseInt(String(today.getFullYear()).slice(0, 2), 10) * 100
    const year = y + Number.parseInt(_cardYear, 10)
    const month = Number.parseInt(_cardMonth, 10)
    cardDate.setFullYear(year, month - 1, 1)

    if (cardDate < today) {
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    try {
      e.preventDefault()

      if (!car || !pickupLocation || !dropOffLocation || !from || !to) {
        helper.error()
        return
      }

      if (!authenticated) {
        const _emailValid = await validateEmail(email)
        if (!_emailValid) {
          return
        }

        const _phoneValid = validatePhone(phone)
        if (!_phoneValid) {
          return
        }

        const _birthDateValid = validateBirthDate(birthDate)
        if (!_birthDateValid) {
          return
        }

        if (!tosChecked) {
          setTosError(true)
          return
        }
      }

      if (!payLater) {
        if (cardName && cardName.length < 1) {
          return
        }

        const _cardNumberValid = validateCardNumber(cardNumber)
        if (!_cardNumberValid) {
          return
        }

        const _cardMonthValid = validateCardMonth(cardMonth)
        if (!_cardMonthValid) {
          return
        }

        const _cardYearValid = validateCardYear(cardYear)
        if (!_cardYearValid) {
          return
        }

        const _cvvValid = validateCvv(cvv)
        if (!_cvvValid) {
          return
        }

        const cardDateValid = validateCardDate(cardMonth, cardYear)
        if (!cardDateValid) {
          setCardDateError(true)
          return
        }
      }

      if (adRequired && additionalDriver) {
        const _emailValid = _validateEmail(addiontalDriverEmail)
        if (!_emailValid) {
          return
        }

        const _phoneValid = _validatePhone(addiontalDriverPhone)
        if (!_phoneValid) {
          return
        }

        const _birthDateValid = _validateBirthDate(addiontalDriverBirthDate)
        if (!_birthDateValid) {
          return
        }
      }

      setLoading(true)

      let driver: bookcarsTypes.User | undefined
      let _additionalDriver: bookcarsTypes.AdditionalDriver | undefined

      if (!authenticated) {
        driver = {
          email,
          phone,
          fullName,
          birthDate,
          language: UserService.getLanguage(),
        }
      }

      const booking: bookcarsTypes.Booking = {
        company: car.company._id as string,
        car: car._id,
        driver: authenticated ? user?._id : undefined,
        pickupLocation: pickupLocation._id,
        dropOffLocation: dropOffLocation._id,
        from,
        to,
        status: payLater ? bookcarsTypes.BookingStatus.Pending : bookcarsTypes.BookingStatus.Paid,
        cancellation,
        amendments,
        theftProtection,
        collisionDamageWaiver,
        fullInsurance,
        additionalDriver,
        price,
      }

      if (adRequired && additionalDriver && addiontalDriverBirthDate) {
        _additionalDriver = {
          fullName: addiontalDriverFullName,
          email: addiontalDriverEmail,
          phone: addiontalDriverPhone,
          birthDate: addiontalDriverBirthDate,
        }
      }

      const payload: bookcarsTypes.CheckoutPayload = {
        driver,
        booking,
        additionalDriver: _additionalDriver,
        payLater,
      }

      const status = await BookingService.checkout(payload)

      if (status === 200) {
        window.history.replaceState({}, window.document.title, '/checkout')

        setLoading(false)
        setVisible(false)
        setSuccess(true)
      } else {
        setLoading(false)
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const onLoad = async (_user?: bookcarsTypes.User) => {
    setUser(_user)
    setAuthenticated(_user !== undefined)
    setLanguage(UserService.getLanguage())

    let carId
    let _car
    let pickupLocationId
    let _pickupLocation
    let dropOffLocationId
    let _dropOffLocation
    let _from
    let _to

    const params = new URLSearchParams(window.location.search)
    if (params.has('c')) {
      carId = params.get('c')
    }
    if (params.has('p')) {
      pickupLocationId = params.get('p')
    }
    if (params.has('d')) {
      dropOffLocationId = params.get('d')
    }
    if (params.has('f')) {
      const val = params.get('f')
      _from = val && bookcarsHelper.isInteger(val) && new Date(Number.parseInt(val, 10))
    }
    if (params.has('t')) {
      const val = params.get('t')
      _to = val && bookcarsHelper.isInteger(val) && new Date(Number.parseInt(val, 10))
    }

    if (!carId || !pickupLocationId || !dropOffLocationId || !_from || !_to) {
      setNoMatch(true)
      return
    }

    try {
      _car = await CarService.getCar(carId)
      if (!_car) {
        setNoMatch(true)
        return
      }

      _pickupLocation = await LocationService.getLocation(pickupLocationId)

      if (!_pickupLocation) {
        setNoMatch(true)
        return
      }

      if (dropOffLocationId !== pickupLocationId) {
        _dropOffLocation = await LocationService.getLocation(dropOffLocationId)
      } else {
        _dropOffLocation = _pickupLocation
      }

      if (!_dropOffLocation) {
        setNoMatch(true)
        return
      }

      const _price = helper.price(_car, _from, _to)

      const included = (val: number) => val === 0

      setCar(_car)
      setPrice(_price)
      setPickupLocation(_pickupLocation)
      setDropOffLocation(_dropOffLocation)
      setFrom(_from)
      setTo(_to)
      setCancellation(included(_car.cancellation))
      setAmendments(included(_car.amendments))
      setTheftProtection(included(_car.theftProtection))
      setCollisionDamageWaiver(included(_car.collisionDamageWaiver))
      setFullInsurance(included(_car.fullInsurance))
      setAdditionalDriver(included(_car.additionalDriver))
      setVisible(true)
    } catch (err) {
      helper.error(err)
    }
  }

  const _fr = language === 'fr'
  const _locale = _fr ? fr : enUS
  const _format = _fr ? 'eee d LLL kk:mm' : 'eee, d LLL, kk:mm'
  const bookingDetailHeight = env.COMPANY_IMAGE_HEIGHT + 10
  const days = bookcarsHelper.days(from, to)

  return (
    <Master onLoad={onLoad} strict={false}>
      {visible && car && from && to && pickupLocation && dropOffLocation && (
        <div className="booking">
          <Paper className="booking-form" elevation={10}>
            <h1 className="booking-form-title">
              {' '}
              {strings.BOOKING_HEADING}
              {' '}
            </h1>
            <form onSubmit={handleSubmit}>
              <div>
                <div className="booking-options-container">
                  <div className="booking-info">
                    <BookingIcon />
                    <span>{strings.BOOKING_OPTIONS}</span>
                  </div>
                  <div className="booking-options">
                    <FormControl fullWidth margin="dense">
                      <FormControlLabel
                        disabled={car.cancellation === -1 || car.cancellation === 0}
                        control={<Switch checked={cancellation} onChange={handleCancellationChange} color="primary" />}
                        label={(
                          <span>
                            <span className="booking-option-label">{csStrings.CANCELLATION}</span>
                            <span className="booking-option-value">{helper.getCancellationOption(car.cancellation, _fr)}</span>
                          </span>
                        )}
                      />
                    </FormControl>

                    <FormControl fullWidth margin="dense">
                      <FormControlLabel
                        disabled={car.amendments === -1 || car.amendments === 0}
                        control={<Switch checked={amendments} onChange={handleAmendmentsChange} color="primary" />}
                        label={(
                          <span>
                            <span className="booking-option-label">{csStrings.AMENDMENTS}</span>
                            <span className="booking-option-value">{helper.getAmendmentsOption(car.amendments, _fr)}</span>
                          </span>
                        )}
                      />
                    </FormControl>

                    <FormControl fullWidth margin="dense">
                      <FormControlLabel
                        disabled={car.collisionDamageWaiver === -1 || car.collisionDamageWaiver === 0}
                        control={<Switch checked={collisionDamageWaiver} onChange={handleCollisionDamageWaiverChange} color="primary" />}
                        label={(
                          <span>
                            <span className="booking-option-label">{csStrings.COLLISION_DAMAGE_WAVER}</span>
                            <span className="booking-option-value">{helper.getCollisionDamageWaiverOption(car.collisionDamageWaiver, days, _fr)}</span>
                          </span>
                        )}
                      />
                    </FormControl>

                    <FormControl fullWidth margin="dense">
                      <FormControlLabel
                        disabled={car.theftProtection === -1 || car.theftProtection === 0}
                        control={<Switch checked={theftProtection} onChange={handleTheftProtectionChange} color="primary" />}
                        label={(
                          <span>
                            <span className="booking-option-label">{csStrings.THEFT_PROTECTION}</span>
                            <span className="booking-option-value">{helper.getTheftProtectionOption(car.theftProtection, days, _fr)}</span>
                          </span>
                        )}
                      />
                    </FormControl>

                    <FormControl fullWidth margin="dense">
                      <FormControlLabel
                        disabled={car.fullInsurance === -1 || car.fullInsurance === 0}
                        control={<Switch checked={fullInsurance} onChange={handleFullInsuranceChange} color="primary" />}
                        label={(
                          <span>
                            <span className="booking-option-label">{csStrings.FULL_INSURANCE}</span>
                            <span className="booking-option-value">{helper.getFullInsuranceOption(car.fullInsurance, days, _fr)}</span>
                          </span>
                        )}
                      />
                    </FormControl>

                    <FormControl fullWidth margin="dense">
                      <FormControlLabel
                        disabled={car.additionalDriver === -1 || car.additionalDriver === 0}
                        control={<Switch checked={additionalDriver} onChange={handleAdditionalDriverChange} color="primary" />}
                        label={(
                          <span>
                            <span className="booking-option-label">{csStrings.ADDITIONAL_DRIVER}</span>
                            <span className="booking-option-value">{helper.getAdditionalDriverOption(car.additionalDriver, days)}</span>
                          </span>
                        )}
                      />
                    </FormControl>
                  </div>
                </div>

                <div className="booking-details-container">
                  <div className="booking-info">
                    <CarIcon />
                    <span>{strings.BOOKING_DETAILS}</span>
                  </div>
                  <div className="booking-details">
                    <div className="booking-detail" style={{ height: bookingDetailHeight }}>
                      <span className="booking-detail-title">{strings.DAYS}</span>
                      <div className="booking-detail-value">
                        {`${helper.getDaysShort(bookcarsHelper.days(from, to))} (${bookcarsHelper.capitalize(
                          format(from, _format, { locale: _locale }),
                        )} - ${bookcarsHelper.capitalize(format(to, _format, { locale: _locale }))})`}
                      </div>
                    </div>
                    <div className="booking-detail" style={{ height: bookingDetailHeight }}>
                      <span className="booking-detail-title">{commonStrings.PICKUP_LOCATION}</span>
                      <div className="booking-detail-value">{pickupLocation.name}</div>
                    </div>
                    <div className="booking-detail" style={{ height: bookingDetailHeight }}>
                      <span className="booking-detail-title">{commonStrings.DROP_OFF_LOCATION}</span>
                      <div className="booking-detail-value">{dropOffLocation.name}</div>
                    </div>
                    <div className="booking-detail" style={{ height: bookingDetailHeight }}>
                      <span className="booking-detail-title">{strings.CAR}</span>
                      <div className="booking-detail-value">{`${car.name} (${car.price} ${csStrings.CAR_CURRENCY})`}</div>
                    </div>
                    <div className="booking-detail" style={{ height: bookingDetailHeight }}>
                      <span className="booking-detail-title">{commonStrings.SUPPLIER}</span>
                      <div className="booking-detail-value">
                        <div className="car-company">
                          <img src={bookcarsHelper.joinURL(env.CDN_USERS, car.company.avatar)} alt={car.company.fullName} style={{ height: env.COMPANY_IMAGE_HEIGHT }} />
                          <span className="car-company-name">{car.company.fullName}</span>
                        </div>
                      </div>
                    </div>
                    <div className="booking-detail" style={{ height: bookingDetailHeight }}>
                      <span className="booking-detail-title">{strings.COST}</span>
                      <div className="booking-detail-value booking-price">{`${bookcarsHelper.formatNumber(price)} ${commonStrings.CURRENCY}`}</div>
                    </div>
                  </div>
                </div>
                {!authenticated && (
                  <div className="driver-details">
                    <div className="booking-info">
                      <DriverIcon />
                      <span>{strings.DRIVER_DETAILS}</span>
                    </div>
                    <div className="driver-details-form">
                      <FormControl fullWidth margin="dense">
                        <InputLabel className="required">{commonStrings.FULL_NAME}</InputLabel>
                        <OutlinedInput type="text" label={commonStrings.FULL_NAME} required onChange={handleFullNameChange} autoComplete="off" />
                      </FormControl>
                      <FormControl fullWidth margin="dense">
                        <InputLabel className="required">{commonStrings.EMAIL}</InputLabel>
                        <OutlinedInput
                          type="text"
                          label={commonStrings.EMAIL}
                          error={!emailValid || emailRegitered}
                          onBlur={handleEmailBlur}
                          onChange={handleEmailChange}
                          required
                          autoComplete="off"
                        />
                        <FormHelperText error={!emailValid || emailRegitered}>
                          {(!emailValid && commonStrings.EMAIL_NOT_VALID) || ''}
                          {(emailRegitered && (
                            <span>
                              <span>{commonStrings.EMAIL_ALREADY_REGISTERED}</span>
                              <span> </span>
                              <a href={`/sign-in?c=${car._id}&p=${pickupLocation._id}&d=${dropOffLocation._id}&f=${from.getTime()}&t=${to.getTime()}&from=checkout`}>{strings.SIGN_IN}</a>
                            </span>
                          ))
                            || ''}
                          {(emailInfo && strings.EMAIL_INFO) || ''}
                        </FormHelperText>
                      </FormControl>
                      <FormControl fullWidth margin="dense">
                        <InputLabel className="required">{commonStrings.PHONE}</InputLabel>
                        <OutlinedInput type="text" label={commonStrings.PHONE} error={!phoneValid} onBlur={handlePhoneBlur} onChange={handlePhoneChange} required autoComplete="off" />
                        <FormHelperText error={!phoneValid}>
                          {(!phoneValid && commonStrings.PHONE_NOT_VALID) || ''}
                          {(phoneInfo && strings.PHONE_INFO) || ''}
                        </FormHelperText>
                      </FormControl>
                      <FormControl fullWidth margin="dense">
                        <DatePicker
                          label={commonStrings.BIRTH_DATE}
                          variant="outlined"
                          required
                          onChange={(_birthDate) => {
                            if (_birthDate) {
                              const _birthDateValid = validateBirthDate(_birthDate)

                              setBirthDate(_birthDate)
                              setBirthDateValid(_birthDateValid)
                            }
                          }}
                          language={language}
                        />
                        <FormHelperText error={!birthDateValid}>{(!birthDateValid && helper.getBirthDateError(car.minimumAge)) || ''}</FormHelperText>
                      </FormControl>
                      <div className="booking-tos">
                        <table>
                          <tbody>
                            <tr>
                              <td aria-label="tos">
                                <Checkbox checked={tosChecked} onChange={handleTosChange} color="primary" />
                              </td>
                              <td>
                                <Link href="/tos" target="_blank" rel="noreferrer">
                                  {commonStrings.TOS}
                                </Link>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
                {additionalDriver && (
                  <div className="driver-details">
                    <div className="booking-info">
                      <DriverIcon />
                      <span>{csStrings.ADDITIONAL_DRIVER}</span>
                    </div>
                    <div className="driver-details-form">
                      <FormControl fullWidth margin="dense">
                        <InputLabel className="required">{commonStrings.FULL_NAME}</InputLabel>
                        <OutlinedInput
                          type="text"
                          label={commonStrings.FULL_NAME}
                          required={adRequired}
                          onChange={(e) => {
                            setAddiontalDriverFullName(e.target.value)
                          }}
                          autoComplete="off"
                        />
                      </FormControl>
                      <FormControl fullWidth margin="dense">
                        <InputLabel className="required">{commonStrings.EMAIL}</InputLabel>
                        <OutlinedInput
                          type="text"
                          label={commonStrings.EMAIL}
                          error={!addiontalDriverEmailValid}
                          onBlur={(e) => {
                            _validateEmail(e.target.value)
                          }}
                          onChange={(e) => {
                            setAddiontalDriverEmail(e.target.value)

                            if (!e.target.value) {
                              setAddiontalDriverEmailValid(true)
                            }
                          }}
                          required={adRequired}
                          autoComplete="off"
                        />
                        <FormHelperText error={!addiontalDriverEmailValid}>{(!addiontalDriverEmailValid && commonStrings.EMAIL_NOT_VALID) || ''}</FormHelperText>
                      </FormControl>
                      <FormControl fullWidth margin="dense">
                        <InputLabel className="required">{commonStrings.PHONE}</InputLabel>
                        <OutlinedInput
                          type="text"
                          label={commonStrings.PHONE}
                          error={!addiontalDriverPhoneValid}
                          onBlur={(e) => {
                            _validatePhone(e.target.value)
                          }}
                          onChange={(e) => {
                            setAddiontalDriverPhone(e.target.value)

                            if (!e.target.value) {
                              setAddiontalDriverPhoneValid(true)
                            }
                          }}
                          required={adRequired}
                          autoComplete="off"
                        />
                        <FormHelperText error={!addiontalDriverPhoneValid}>{(!addiontalDriverPhoneValid && commonStrings.PHONE_NOT_VALID) || ''}</FormHelperText>
                      </FormControl>
                      <FormControl fullWidth margin="dense">
                        <DatePicker
                          label={commonStrings.BIRTH_DATE}
                          variant="outlined"
                          required={adRequired}
                          onChange={(_birthDate) => {
                            if (_birthDate) {
                              const _birthDateValid = _validateBirthDate(_birthDate)

                              setAddiontalDriverBirthDate(_birthDate)
                              setAddiontalDriverBirthDateValid(_birthDateValid)
                            }
                          }}
                          language={language}
                        />
                        <FormHelperText error={!addiontalDriverBirthDateValid}>{(!addiontalDriverBirthDateValid && helper.getBirthDateError(car.minimumAge)) || ''}</FormHelperText>
                      </FormControl>
                    </div>
                  </div>
                )}

                {car.company.payLater && (
                  <div className="payment-options-container">
                    <div className="booking-info">
                      <PaymentOptionsIcon />
                      <span>{strings.PAYMENT_OPTIONS}</span>
                    </div>
                    <div className="payment-options">
                      <FormControl>
                        <RadioGroup
                          defaultValue="payOnline"
                          onChange={(event) => {
                            setPayLater(event.target.value === 'payLater')
                          }}
                        >
                          <FormControlLabel
                            value="payLater"
                            control={<Radio />}
                            label={(
                              <span className="payment-button">
                                <span>{strings.PAY_LATER}</span>
                                <span className="payment-info">{`(${strings.PAY_LATER_INFO})`}</span>
                              </span>
                            )}
                          />
                          <FormControlLabel
                            value="payOnline"
                            control={<Radio />}
                            label={(
                              <span className="payment-button">
                                <span>{strings.PAY_ONLINE}</span>
                                <span className="payment-info">{`(${strings.PAY_ONLINE_INFO})`}</span>
                              </span>
                            )}
                          />
                        </RadioGroup>
                      </FormControl>
                    </div>
                  </div>
                )}

                {(!car.company.payLater || !payLater) && (
                  <div className="payment">
                    <div className="cost">
                      <div className="secure-payment-label">
                        <LockIcon className="secure-payment-lock" />
                        <span>{strings.PAYMENT}</span>
                      </div>
                      <div className="secure-payment-cost">
                        <span className="cost-title">{strings.COST}</span>
                        <span className="cost-value">{`${bookcarsHelper.formatNumber(price)} ${commonStrings.CURRENCY}`}</span>
                      </div>
                    </div>

                    <div className="secure-payment-logo">
                      <img src={SecurePayment} alt="" />
                    </div>

                    <div className="card">
                      <FormControl margin="dense" className="card-number" fullWidth>
                        <InputLabel className="required">{strings.CARD_NAME}</InputLabel>
                        <OutlinedInput
                          type="text"
                          label={strings.CARD_NAME}
                          onChange={(e) => {
                            setCardName(e.target.value)
                          }}
                          required
                          autoComplete="off"
                        />
                      </FormControl>
                      <FormControl margin="dense" className="card-number" fullWidth>
                        <InputLabel className="required">{strings.CARD_NUMBER}</InputLabel>
                        <OutlinedInput
                          type="text"
                          label={strings.CARD_NUMBER}
                          error={!cardNumberValid}
                          onBlur={handleCardNumberBlur}
                          onChange={handleCardNumberChange}
                          required
                          autoComplete="off"
                        />
                        <FormHelperText error={!cardNumberValid}>{(!cardNumberValid && strings.CARD_NUMBER_NOT_VALID) || ''}</FormHelperText>
                      </FormControl>
                      <div className="card-date">
                        <FormControl margin="dense" className="card-month" fullWidth>
                          <InputLabel className="required">{strings.CARD_MONTH}</InputLabel>
                          <OutlinedInput
                            type="text"
                            label={strings.CARD_MONTH}
                            error={!cardMonthValid}
                            onBlur={handleCardMonthBlur}
                            onChange={handleCardMonthChange}
                            required
                            autoComplete="off"
                          // inputProps={{ inputMode: 'numeric', pattern: '^(\\s*|\\d{1,2})$' }}
                          />
                          <FormHelperText error={!cardMonthValid}>{(!cardMonthValid && strings.CARD_MONTH_NOT_VALID) || ''}</FormHelperText>
                        </FormControl>
                        <FormControl margin="dense" className="card-year" fullWidth>
                          <InputLabel className="required">{strings.CARD_YEAR}</InputLabel>
                          <OutlinedInput
                            type="text"
                            label={strings.CARD_YEAR}
                            error={!cardYearValid}
                            onBlur={handleCardYearBlur}
                            onChange={handleCardYearChange}
                            required
                            autoComplete="off"
                          // inputProps={{ inputMode: 'numeric', pattern: '^(\\s*|\\d{2})$' }}
                          />
                          <FormHelperText error={!cardYearValid}>{(!cardYearValid && strings.CARD_YEAR_NOT_VALID) || ''}</FormHelperText>
                        </FormControl>
                      </div>
                      <FormControl margin="dense" className="cvv" fullWidth>
                        <InputLabel className="required">{strings.CVV}</InputLabel>
                        <OutlinedInput
                          type="text"
                          label={strings.CVV}
                          error={!cvvValid}
                          onBlur={handleCvvBlur}
                          onChange={handleCvvChange}
                          required
                          autoComplete="off"
                        // inputProps={{ inputMode: 'numeric', pattern: '^(\\s*|\\d{3,4})$' }}
                        />
                        <FormHelperText error={!cvvValid}>{(!cvvValid && strings.CVV_NOT_VALID) || ''}</FormHelperText>
                      </FormControl>
                    </div>

                    <div className="secure-payment-info">
                      <LockIcon className="secure-payment-lock" />
                      <span>{strings.SECURE_PAYMENT_INFO}</span>
                    </div>
                  </div>
                )}
                <div className="booking-buttons">
                  <Button type="submit" variant="contained" className="btn-book btn-margin-bottom" size="small">
                    {strings.BOOK}
                  </Button>
                  <Button variant="contained" className="btn-cancel btn-margin-bottom" size="small" href="/">
                    {commonStrings.CANCEL}
                  </Button>
                </div>
              </div>
              <div className="form-error">
                {cardDateError && <Error message={strings.CARD_DATE_ERROR} />}
                {tosError && <Error message={commonStrings.TOS_ERROR} />}
                {error && <Error message={commonStrings.GENERIC_ERROR} />}
              </div>
            </form>
          </Paper>
        </div>
      )}
      {noMatch && <NoMatch hideHeader />}
      {success && <Info message={payLater ? strings.PAY_LATER_SUCCESS : strings.SUCCESS} />}
      {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
    </Master>
  )
}

export default Checkout
