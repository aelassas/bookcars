import React, { useEffect, useState } from 'react'
import Env from '../config/env.config'
import * as BookingService from '../services/BookingService'
import { strings as commonStrings } from '../lang/common'
import { strings as csStrings } from '../lang/cars'
import { strings } from '../lang/checkout'
import * as Helper from '../common/Helper'
import * as UserService from '../services/UserService'
import * as CarService from '../services/CarService'
import * as LocationService from '../services/LocationService'
import Master from '../components/Master'
import Error from '../components/Error'
import DatePicker from '../components/DatePicker'
import Backdrop from '../components/SimpleBackdrop'
import NoMatch from './NoMatch'
import Info from './Info'
import {
  OutlinedInput, InputLabel,
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
  const [language, setLanguage] = useState(Env.DEFAULT_LANGUAGE)
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
  const [_fullName, set_FullName] = useState('')
  const [_email, set_Email] = useState('')
  const [_phone, set_Phone] = useState('')
  const [_birthDate, set_BirthDate] = useState<Date>()
  const [_emailValid, set_EmailValid] = useState(true)
  const [_phoneValid, set_PhoneValid] = useState(true)
  const [_birthDateValid, set_BirthDateValid] = useState(true)
  const [payLater, setPayLater] = useState(false)

  const [adManuallyChecked, setAdManuallyChecked] = useState(false)
  const [adFullName, setAdFullName] = useState(false)
  const [adEmail, setAdEmail] = useState(false)
  const [adPhone, setAdPhone] = useState(false)
  const [adBirthDate, setAdBirthDate] = useState(false)
  const adRequired = adManuallyChecked || adFullName || adEmail || adPhone || adBirthDate

  const adValidate = (val?: string | Date | null) => !!val

  useEffect(() => {
    setAdFullName(adValidate(_fullName))
  }, [_fullName])

  useEffect(() => {
    setAdEmail(adValidate(_email))
  }, [_email])

  useEffect(() => {
    setAdPhone(adValidate(_phone))
  }, [_phone])

  useEffect(() => {
    setAdBirthDate(adValidate(_birthDate))
  }, [_birthDate])

  const handleCancellationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (car && from && to) {
      const cancellation = e.target.checked
      const options: bookcarsTypes.CarOptions = {
        cancellation,
        amendments,
        theftProtection,
        collisionDamageWaiver,
        fullInsurance,
        additionalDriver,
      }
      const price = Helper.price(car, from, to, options)

      setCancellation(cancellation)
      setPrice(price)
    }
  }

  const handleAmendmentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (car && from && to) {
      const amendments = e.target.checked
      const options: bookcarsTypes.CarOptions = {
        cancellation,
        amendments,
        theftProtection,
        collisionDamageWaiver,
        fullInsurance,
        additionalDriver,
      }
      const price = Helper.price(car, from, to, options)

      setAmendments(amendments)
      setPrice(price)
    }
  }

  const handleTheftProtectionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (car && from && to) {
      const theftProtection = e.target.checked
      const options: bookcarsTypes.CarOptions = {
        cancellation,
        amendments,
        theftProtection,
        collisionDamageWaiver,
        fullInsurance,
        additionalDriver,
      }
      const price = Helper.price(car, from, to, options)

      setTheftProtection(theftProtection)
      setPrice(price)
    }
  }

  const handleCollisionDamageWaiverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (car && from && to) {
      const collisionDamageWaiver = e.target.checked
      const options: bookcarsTypes.CarOptions = {
        cancellation,
        amendments,
        theftProtection,
        collisionDamageWaiver,
        fullInsurance,
        additionalDriver,
      }
      const price = Helper.price(car, from, to, options)

      setCollisionDamageWaiver(collisionDamageWaiver)
      setPrice(price)
    }
  }

  const handleFullInsuranceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (car && from && to) {
      const fullInsurance = e.target.checked
      const options: bookcarsTypes.CarOptions = {
        cancellation,
        amendments,
        theftProtection,
        collisionDamageWaiver,
        fullInsurance,
        additionalDriver,
      }
      const price = Helper.price(car, from, to, options)

      setFullInsurance(fullInsurance)
      setPrice(price)
    }
  }

  const handleAdditionalDriverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (car && from && to) {
      const additionalDriver = e.target.checked
      const options: bookcarsTypes.CarOptions = {
        cancellation,
        amendments,
        theftProtection,
        collisionDamageWaiver,
        fullInsurance,
        additionalDriver,
      }
      const price = Helper.price(car, from, to, options)

      setAdditionalDriver(additionalDriver)
      setPrice(price)
      setAdManuallyChecked(additionalDriver)
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

  const validateEmail = async (email?: string) => {
    if (email) {
      if (validator.isEmail(email)) {
        try {
          const status = await UserService.validateEmail({ email })
          if (status === 200) {
            setEmailRegitered(false)
            setEmailValid(true)
            setEmailInfo(true)
            return true
          } else {
            setEmailRegitered(true)
            setEmailValid(true)
            setError(false)
            setEmailInfo(false)
            return false
          }
        } catch (err) {
          Helper.error(err)
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
  const _validateEmail = (email?: string) => {
    if (email) {
      if (validator.isEmail(email)) {
        set_EmailValid(true)
        return true
      } else {
        set_EmailValid(false)
        return false
      }
    } else {
      set_EmailValid(true)
      return false
    }
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

  const validatePhone = (phone?: string) => {
    if (phone) {
      const phoneValid = validator.isMobilePhone(phone)
      setPhoneValid(phoneValid)
      setPhoneInfo(phoneValid)

      return phoneValid
    } else {
      setPhoneValid(true)
      setPhoneInfo(true)

      return true
    }
  }

  // additionalDriver
  const _validatePhone = (phone?: string) => {
    if (phone) {
      const _phoneValid = validator.isMobilePhone(phone)
      set_PhoneValid(_phoneValid)

      return _phoneValid
    } else {
      set_PhoneValid(true)

      return true
    }
  }

  const handlePhoneBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    validatePhone(e.target.value)
  }

  const validateBirthDate = (date?: Date) => {
    if (car && date && bookcarsHelper.isDate(date)) {
      const now = new Date()
      const sub = intervalToDuration({ start: date, end: now }).years ?? 0
      const birthDateValid = sub >= car.minimumAge

      setBirthDateValid(birthDateValid)
      return birthDateValid
    } else {
      setBirthDateValid(true)
      return true
    }
  }

  // additionalDriver
  const _validateBirthDate = (date?: Date) => {
    if (car && date && bookcarsHelper.isDate(date)) {
      const now = new Date()
      const sub = intervalToDuration({ start: date, end: now }).years ?? 0
      const _birthDateValid = sub >= car.minimumAge

      set_BirthDateValid(_birthDateValid)
      return _birthDateValid
    } else {
      set_BirthDateValid(true)
      return true
    }
  }

  const handleTosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTosChecked(e.target.checked)

    if (e.target.checked) {
      setTosError(false)
    }
  }

  const validateCardNumber = (cardNumber?: string) => {
    if (cardNumber) {
      const cardNumberValid = validator.isCreditCard(cardNumber)
      setCardNumberValid(cardNumberValid)

      return cardNumberValid
    } else {
      setCardNumberValid(true)

      return true
    }
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

  const validateCardMonth = (cardMonth?: string) => {
    if (cardMonth) {
      if (bookcarsHelper.isInteger(cardMonth)) {
        const month = Number.parseInt(cardMonth)
        const cardMonthValid = month >= 1 && month <= 12

        setCardMonthValid(cardMonthValid)
        setCardDateError(false)

        return cardMonthValid
      } else {
        setCardMonthValid(false)
        setCardDateError(false)

        return false
      }
    } else {
      setCardMonthValid(true)
      setCardDateError(false)

      return true
    }
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

  const validateCardYear = (cardYear?: string) => {
    if (cardYear) {
      if (bookcarsHelper.isYear(cardYear)) {
        const year = Number.parseInt(cardYear)
        const currentYear = Number.parseInt(String(new Date().getFullYear()).slice(2))
        const cardYearValid = year >= currentYear

        setCardYearValid(cardYearValid)
        setCardDateError(false)

        return cardYearValid
      } else {
        setCardYearValid(false)
        setCardDateError(false)

        return false
      }
    } else {
      setCardYearValid(true)
      setCardDateError(false)

      return true
    }
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

  const validateCvv = (cvv?: string) => {
    if (cvv) {
      const cvvValid = bookcarsHelper.isCvv(cvv)
      setCvvValid(cvvValid)

      return cvvValid
    } else {
      setCvvValid(true)

      return true
    }
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

  const validateCardDate = (cardMonth: string, cardYear: string) => {
    const today = new Date(),
      cardDate = new Date()
    const y = Number.parseInt(String(today.getFullYear()).slice(0, 2)) * 100
    const year = y + Number.parseInt(cardYear)
    const month = Number.parseInt(cardMonth)
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
        Helper.error()
        return
      }

      if (!authenticated) {
        const emailValid = await validateEmail(email)
        if (!emailValid) {
          return
        }

        const phoneValid = validatePhone(phone)
        if (!phoneValid) {
          return
        }

        const birthDateValid = validateBirthDate(birthDate)
        if (!birthDateValid) {
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

        const cardNumberValid = validateCardNumber(cardNumber)
        if (!cardNumberValid) {
          return
        }

        const cardMonthValid = validateCardMonth(cardMonth)
        if (!cardMonthValid) {
          return
        }

        const cardYearValid = validateCardYear(cardYear)
        if (!cardYearValid) {
          return
        }

        const cvvValid = validateCvv(cvv)
        if (!cvvValid) {
          return
        }

        const cardDateValid = validateCardDate(cardMonth, cardYear)
        if (!cardDateValid) {
          setCardDateError(true)
          return
        }
      }

      if (adRequired && additionalDriver) {
        const emailValid = _validateEmail(_email)
        if (!emailValid) {
          return
        }

        const phoneValid = _validatePhone(_phone)
        if (!phoneValid) {
          return
        }

        const birthDateValid = _validateBirthDate(_birthDate)
        if (!birthDateValid) {
          return
        }
      }

      setLoading(true)

      let driver: bookcarsTypes.User | undefined = undefined
      let _additionalDriver: bookcarsTypes.AdditionalDriver | undefined = undefined

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
        from: from,
        to: to,
        status: payLater ? bookcarsTypes.BookingStatus.Pending : bookcarsTypes.BookingStatus.Paid,
        cancellation,
        amendments,
        theftProtection,
        collisionDamageWaiver,
        fullInsurance,
        additionalDriver,
        price,
      }

      if (adRequired && additionalDriver && _birthDate) {
        _additionalDriver = {
          fullName: _fullName,
          email: _email,
          phone: _phone,
          birthDate: _birthDate,
        }
      }

      const payload: bookcarsTypes.BookPayload = {
        driver,
        booking,
        additionalDriver: _additionalDriver,
        payLater,
      }

      const status = await BookingService.book(payload)

      if (status === 200) {
        window.history.replaceState({}, window.document.title, '/checkout')

        setLoading(false)
        setVisible(false)
        setSuccess(true)
      } else {
        setLoading(false)
        Helper.error()
      }
    } catch (err) {
      Helper.error(err)
    }
  }

  const onLoad = async (user?: bookcarsTypes.User) => {
    setUser(user)
    setAuthenticated(user !== undefined)
    setLanguage(UserService.getLanguage())

    let carId, car, pickupLocationId, pickupLocation, dropOffLocationId, dropOffLocation, from, to
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
      from = val && bookcarsHelper.isInteger(val) && new Date(Number.parseInt(val))
    }
    if (params.has('t')) {
      const val = params.get('t')
      to = val && bookcarsHelper.isInteger(val) && new Date(Number.parseInt(val))
    }

    if (!carId || !pickupLocationId || !dropOffLocationId || !from || !to) {
      setNoMatch(true)
      return
    }

    try {
      car = await CarService.getCar(carId)
      if (!car) {
        setNoMatch(true)
        return
      }

      pickupLocation = await LocationService.getLocation(pickupLocationId)

      if (!pickupLocation) {
        setNoMatch(true)
        return
      }

      if (dropOffLocationId !== pickupLocationId) {
        dropOffLocation = await LocationService.getLocation(dropOffLocationId)
      } else {
        dropOffLocation = pickupLocation
      }

      if (!dropOffLocation) {
        setNoMatch(true)
        return
      }

      const price = Helper.price(car, from, to)

      const included = (val: number) => val === 0

      setCar(car)
      setPrice(price)
      setPickupLocation(pickupLocation)
      setDropOffLocation(dropOffLocation)
      setFrom(from)
      setTo(to)
      setCancellation(included(car.cancellation))
      setAmendments(included(car.amendments))
      setTheftProtection(included(car.theftProtection))
      setCollisionDamageWaiver(included(car.collisionDamageWaiver))
      setFullInsurance(included(car.fullInsurance))
      setAdditionalDriver(included(car.additionalDriver))
      setVisible(true)
    } catch (err) {
      Helper.error(err)
    }
  }

  const _fr = language === 'fr'
  const _locale = _fr ? fr : enUS
  const _format = _fr ? 'eee d LLL kk:mm' : 'eee, d LLL, kk:mm'
  const bookingDetailHeight = Env.COMPANY_IMAGE_HEIGHT + 10
  const days = bookcarsHelper.days(from, to)

  return (
    <Master onLoad={onLoad} strict={false}>
      {visible && car && from && to && pickupLocation && dropOffLocation && (
        <div className="booking">
          <Paper className="booking-form" elevation={10}>
            <h1 className="booking-form-title"> {strings.BOOKING_HEADING} </h1>
            <form onSubmit={handleSubmit}>
              <div>
                <div className="booking-options-container">
                  <div className="booking-info">
                    <BookingIcon />
                    <label>{strings.BOOKING_OPTIONS}</label>
                  </div>
                  <div className="booking-options">
                    <FormControl fullWidth margin="dense">
                      <FormControlLabel
                        disabled={car.cancellation === -1 || car.cancellation === 0}
                        control={<Switch checked={cancellation} onChange={handleCancellationChange} color="primary" />}
                        label={
                          <span>
                            <span className="booking-option-label">{csStrings.CANCELLATION}</span>
                            <span className="booking-option-value">{Helper.getCancellationOption(car.cancellation, _fr)}</span>
                          </span>
                        }
                      />
                    </FormControl>

                    <FormControl fullWidth margin="dense">
                      <FormControlLabel
                        disabled={car.amendments === -1 || car.amendments === 0}
                        control={<Switch checked={amendments} onChange={handleAmendmentsChange} color="primary" />}
                        label={
                          <span>
                            <span className="booking-option-label">{csStrings.AMENDMENTS}</span>
                            <span className="booking-option-value">{Helper.getAmendmentsOption(car.amendments, _fr)}</span>
                          </span>
                        }
                      />
                    </FormControl>

                    <FormControl fullWidth margin="dense">
                      <FormControlLabel
                        disabled={car.collisionDamageWaiver === -1 || car.collisionDamageWaiver === 0}
                        control={<Switch checked={collisionDamageWaiver} onChange={handleCollisionDamageWaiverChange} color="primary" />}
                        label={
                          <span>
                            <span className="booking-option-label">{csStrings.COLLISION_DAMAGE_WAVER}</span>
                            <span className="booking-option-value">{Helper.getCollisionDamageWaiverOption(car.collisionDamageWaiver, days, _fr)}</span>
                          </span>
                        }
                      />
                    </FormControl>

                    <FormControl fullWidth margin="dense">
                      <FormControlLabel
                        disabled={car.theftProtection === -1 || car.theftProtection === 0}
                        control={<Switch checked={theftProtection} onChange={handleTheftProtectionChange} color="primary" />}
                        label={
                          <span>
                            <span className="booking-option-label">{csStrings.THEFT_PROTECTION}</span>
                            <span className="booking-option-value">{Helper.getTheftProtectionOption(car.theftProtection, days, _fr)}</span>
                          </span>
                        }
                      />
                    </FormControl>

                    <FormControl fullWidth margin="dense">
                      <FormControlLabel
                        disabled={car.fullInsurance === -1 || car.fullInsurance === 0}
                        control={<Switch checked={fullInsurance} onChange={handleFullInsuranceChange} color="primary" />}
                        label={
                          <span>
                            <span className="booking-option-label">{csStrings.FULL_INSURANCE}</span>
                            <span className="booking-option-value">{Helper.getFullInsuranceOption(car.fullInsurance, days, _fr)}</span>
                          </span>
                        }
                      />
                    </FormControl>

                    <FormControl fullWidth margin="dense">
                      <FormControlLabel
                        disabled={car.additionalDriver === -1 || car.additionalDriver === 0}
                        control={<Switch checked={additionalDriver} onChange={handleAdditionalDriverChange} color="primary" />}
                        label={
                          <span>
                            <span className="booking-option-label">{csStrings.ADDITIONAL_DRIVER}</span>
                            <span className="booking-option-value">{Helper.getAdditionalDriverOption(car.additionalDriver, days)}</span>
                          </span>
                        }
                      />
                    </FormControl>
                  </div>
                </div>

                <div className="booking-details-container">
                  <div className="booking-info">
                    <CarIcon />
                    <label>{strings.BOOKING_DETAILS}</label>
                  </div>
                  <div className="booking-details">
                    <div className="booking-detail" style={{ height: bookingDetailHeight }}>
                      <label className="booking-detail-title">{strings.DAYS}</label>
                      <div className="booking-detail-value">{`${Helper.getDaysShort(bookcarsHelper.days(from, to))} (${bookcarsHelper.capitalize(
                        format(from, _format, { locale: _locale }),
                      )} - ${bookcarsHelper.capitalize(format(to, _format, { locale: _locale }))})`}</div>
                    </div>
                    <div className="booking-detail" style={{ height: bookingDetailHeight }}>
                      <label className="booking-detail-title">{commonStrings.PICKUP_LOCATION}</label>
                      <div className="booking-detail-value">{pickupLocation.name}</div>
                    </div>
                    <div className="booking-detail" style={{ height: bookingDetailHeight }}>
                      <label className="booking-detail-title">{commonStrings.DROP_OFF_LOCATION}</label>
                      <div className="booking-detail-value">{dropOffLocation.name}</div>
                    </div>
                    <div className="booking-detail" style={{ height: bookingDetailHeight }}>
                      <label className="booking-detail-title">{strings.CAR}</label>
                      <div className="booking-detail-value">{`${car.name} (${car.price} ${csStrings.CAR_CURRENCY})`}</div>
                    </div>
                    <div className="booking-detail" style={{ height: bookingDetailHeight }}>
                      <label className="booking-detail-title">{commonStrings.SUPPLIER}</label>
                      <div className="booking-detail-value">
                        <div className="car-company">
                          <img src={bookcarsHelper.joinURL(Env.CDN_USERS, car.company.avatar)} alt={car.company.fullName} style={{ height: Env.COMPANY_IMAGE_HEIGHT }} />
                          <label className="car-company-name">{car.company.fullName}</label>
                        </div>
                      </div>
                    </div>
                    <div className="booking-detail" style={{ height: bookingDetailHeight }}>
                      <label className="booking-detail-title">{strings.COST}</label>
                      <div className="booking-detail-value booking-price">{`${bookcarsHelper.formatNumber(price)} ${commonStrings.CURRENCY}`}</div>
                    </div>
                  </div>
                </div>
                {!authenticated && (
                  <div className="driver-details">
                    <div className="booking-info">
                      <DriverIcon />
                      <label>{strings.DRIVER_DETAILS}</label>
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
                          )) ||
                            ''}
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
                          onChange={(birthDate) => {
                            const birthDateValid = validateBirthDate(birthDate)

                            setBirthDate(birthDate)
                            setBirthDateValid(birthDateValid)
                          }}
                          language={language}
                        />
                        <FormHelperText error={!birthDateValid}>{(!birthDateValid && Helper.getBirthDateError(car.minimumAge)) || ''}</FormHelperText>
                      </FormControl>
                      <div className="booking-tos">
                        <table>
                          <tbody>
                            <tr>
                              <td>
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
                      <label>{csStrings.ADDITIONAL_DRIVER}</label>
                    </div>
                    <div className="driver-details-form">
                      <FormControl fullWidth margin="dense">
                        <InputLabel className="required">{commonStrings.FULL_NAME}</InputLabel>
                        <OutlinedInput
                          type="text"
                          label={commonStrings.FULL_NAME}
                          required={adRequired}
                          onChange={(e) => {
                            set_FullName(e.target.value)
                          }}
                          autoComplete="off"
                        />
                      </FormControl>
                      <FormControl fullWidth margin="dense">
                        <InputLabel className="required">{commonStrings.EMAIL}</InputLabel>
                        <OutlinedInput
                          type="text"
                          label={commonStrings.EMAIL}
                          error={!_emailValid}
                          onBlur={(e) => {
                            _validateEmail(e.target.value)
                          }}
                          onChange={(e) => {
                            set_Email(e.target.value)

                            if (!e.target.value) {
                              set_EmailValid(true)
                            }
                          }}
                          required={adRequired}
                          autoComplete="off"
                        />
                        <FormHelperText error={!_emailValid}>{(!_emailValid && commonStrings.EMAIL_NOT_VALID) || ''}</FormHelperText>
                      </FormControl>
                      <FormControl fullWidth margin="dense">
                        <InputLabel className="required">{commonStrings.PHONE}</InputLabel>
                        <OutlinedInput
                          type="text"
                          label={commonStrings.PHONE}
                          error={!_phoneValid}
                          onBlur={(e) => {
                            _validatePhone(e.target.value)
                          }}
                          onChange={(e) => {
                            set_Phone(e.target.value)

                            if (!e.target.value) {
                              set_PhoneValid(true)
                            }
                          }}
                          required={adRequired}
                          autoComplete="off"
                        />
                        <FormHelperText error={!_phoneValid}>{(!_phoneValid && commonStrings.PHONE_NOT_VALID) || ''}</FormHelperText>
                      </FormControl>
                      <FormControl fullWidth margin="dense">
                        <DatePicker
                          label={commonStrings.BIRTH_DATE}
                          variant="outlined"
                          required={adRequired}
                          onChange={(_birthDate) => {
                            const _birthDateValid = _validateBirthDate(_birthDate)

                            set_BirthDate(_birthDate)
                            set_BirthDateValid(_birthDateValid)
                          }}
                          language={language}
                        />
                        <FormHelperText error={!_birthDateValid}>{(!_birthDateValid && Helper.getBirthDateError(car.minimumAge)) || ''}</FormHelperText>
                      </FormControl>
                    </div>
                  </div>
                )}

                {car.company.payLater && (
                  <div className="payment-options-container">
                    <div className="booking-info">
                      <PaymentOptionsIcon />
                      <label>{strings.PAYMENT_OPTIONS}</label>
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
                            label={
                              <span className="payment-button">
                                <span>{strings.PAY_LATER}</span>
                                <span className="payment-info">{`(${strings.PAY_LATER_INFO})`}</span>
                              </span>
                            }
                          />
                          <FormControlLabel
                            value="payOnline"
                            control={<Radio />}
                            label={
                              <span className="payment-button">
                                <span>{strings.PAY_ONLINE}</span>
                                <span className="payment-info">{`(${strings.PAY_ONLINE_INFO})`}</span>
                              </span>
                            }
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
                        <label>{strings.PAYMENT}</label>
                      </div>
                      <div className="secure-payment-cost">
                        <label className="cost-title">{strings.COST}</label>
                        <label className="cost-value">{`${bookcarsHelper.formatNumber(price)} ${commonStrings.CURRENCY}`}</label>
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
                      <label>{strings.SECURE_PAYMENT_INFO}</label>
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
