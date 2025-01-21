import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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
  RadioGroup,
  Radio,
  CircularProgress,
} from '@mui/material'
import {
  DirectionsCar as CarIcon,
  Person as DriverIcon,
  Settings as PaymentOptionsIcon,
  Payment as LicenseIcon,
  AssignmentTurnedIn as ChecklistIcon,
} from '@mui/icons-material'
import validator from 'validator'
import { format, intervalToDuration } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import CarList from '@/components/CarList'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import * as BookingService from '@/services/BookingService'
import { strings as commonStrings } from '@/lang/common'
import { strings as csStrings } from '@/lang/cars'
import { strings } from '@/lang/checkout'
import * as helper from '@/common/helper'
import * as UserService from '@/services/UserService'
import * as CarService from '@/services/CarService'
import * as LocationService from '@/services/LocationService'
import * as StripeService from '@/services/StripeService'
import { useRecaptchaContext, RecaptchaContextType } from '@/context/RecaptchaContext'
import Layout from '@/components/Layout'
import Error from '@/components/Error'
import DatePicker from '@/components/DatePicker'
import SocialLogin from '@/components/SocialLogin'
import Map from '@/components/Map'
import DriverLicense from '@/components/DriverLicense'
import Progress from '@/components/Progress'
import CheckoutStatus from '@/components/CheckoutStatus'
import NoMatch from './NoMatch'
import CheckoutOptions from '@/components/CheckoutOptions'
import Footer from '@/components/Footer'
import ViewOnMapButton from '@/components/ViewOnMapButton'
import MapDialog from '@/components/MapDialog'

import '@/assets/css/checkout.css'

//
// Make sure to call `loadStripe` outside of a component’s render to avoid
// recreating the `Stripe` object on every render.
//
const stripePromise = loadStripe(env.STRIPE_PUBLISHABLE_KEY)

const Checkout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { reCaptchaLoaded, generateReCaptchaToken } = useRecaptchaContext() as RecaptchaContextType

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
  const [price, setPrice] = useState(0)
  const [depositPrice, setDepositPrice] = useState(0)
  const [emailInfo, setEmailInfo] = useState(true)
  const [phoneInfo, setPhoneInfo] = useState(true)

  const [cancellation, setCancellation] = useState(false)
  const [amendments, setAmendments] = useState(false)
  const [theftProtection, setTheftProtection] = useState(false)
  const [collisionDamageWaiver, setCollisionDamageWaiver] = useState(false)
  const [fullInsurance, setFullInsurance] = useState(false)
  const [additionalDriver, setAdditionalDriver] = useState(false)

  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingPage, setLoadingPage] = useState(true)
  const [addiontalDriverFullName, setAddiontalDriverFullName] = useState('')
  const [addiontalDriverEmail, setAddiontalDriverEmail] = useState('')
  const [addiontalDriverPhone, setAddiontalDriverPhone] = useState('')
  const [addiontalDriverBirthDate, setAddiontalDriverBirthDate] = useState<Date>()
  const [addiontalDriverEmailValid, setAddiontalDriverEmailValid] = useState(true)
  const [addiontalDriverPhoneValid, setAddiontalDriverPhoneValid] = useState(true)
  const [addiontalDriverBirthDateValid, setAddiontalDriverBirthDateValid] = useState(true)
  const [payLater, setPayLater] = useState(false)
  const [payDeposit, setPayDeposit] = useState(false)
  const [recaptchaError, setRecaptchaError] = useState(false)

  const [adManuallyChecked, setAdManuallyChecked] = useState(false)
  const adRequired = true

  const [paymentFailed, setPaymentFailed] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [bookingId, setBookingId] = useState<string>()
  const [sessionId, setSessionId] = useState<string>()
  // const [distance, setDistance] = useState('')
  const [licenseRequired, setLicenseRequired] = useState(false)
  const [license, setLicense] = useState<string | null>(null)
  const [openMapDialog, setOpenMapDialog] = useState(false)

  const _fr = language === 'fr'
  const _locale = _fr ? fr : enUS
  const _format = _fr ? 'eee d LLL yyyy kk:mm' : 'eee, d LLL yyyy, p'
  const bookingDetailHeight = env.SUPPLIER_IMAGE_HEIGHT + 10
  const days = bookcarsHelper.days(from, to)
  const daysLabel = from && to && `
  ${helper.getDaysShort(days)} (${bookcarsHelper.capitalize(
    format(from, _format, { locale: _locale }),
  )} 
  - ${bookcarsHelper.capitalize(format(to, _format, { locale: _locale }))})`

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    try {
      e.preventDefault()

      if (!car || !pickupLocation || !dropOffLocation || !from || !to) {
        helper.error()
        return
      }

      let recaptchaToken = ''
      if (reCaptchaLoaded) {
        recaptchaToken = await generateReCaptchaToken()
        if (!(await helper.verifyReCaptcha(recaptchaToken))) {
          recaptchaToken = ''
        }
      }

      if (reCaptchaLoaded && !recaptchaToken) {
        setRecaptchaError(true)
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

      if (adManuallyChecked && additionalDriver) {
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

      if (car.supplier.licenseRequired && !license) {
        setLicenseRequired(true)
        return
      }

      setLoading(true)
      setPaymentFailed(false)

      let driver: bookcarsTypes.User | undefined
      let _additionalDriver: bookcarsTypes.AdditionalDriver | undefined

      if (!authenticated) {
        driver = {
          email,
          phone,
          fullName,
          birthDate,
          language: UserService.getLanguage(),
          license: license || undefined,
        }
      }

      const basePrice = await bookcarsHelper.convertPrice(price, StripeService.getCurrency(), env.BASE_CURRENCY)

      const booking: bookcarsTypes.Booking = {
        supplier: car.supplier._id as string,
        car: car._id,
        driver: authenticated ? user?._id : undefined,
        pickupLocation: pickupLocation._id,
        dropOffLocation: dropOffLocation._id,
        from,
        to,
        status: bookcarsTypes.BookingStatus.Pending,
        cancellation,
        amendments,
        theftProtection,
        collisionDamageWaiver,
        fullInsurance,
        additionalDriver,
        price: basePrice,
      }

      if (adRequired && additionalDriver && addiontalDriverBirthDate) {
        _additionalDriver = {
          fullName: addiontalDriverFullName,
          email: addiontalDriverEmail,
          phone: addiontalDriverPhone,
          birthDate: addiontalDriverBirthDate,
        }
      }

      //
      // Stripe Payment Gateway
      //
      let _customerId: string | undefined
      let _sessionId: string | undefined
      if (!payLater) {
        const payload: bookcarsTypes.CreatePaymentPayload = {
          amount: payDeposit ? depositPrice : price,
          currency: StripeService.getCurrency(),
          locale: language,
          receiptEmail: (!authenticated ? driver?.email : user?.email) as string,
          name: `${car.name} 
          - ${daysLabel} 
          - ${pickupLocation._id === dropOffLocation._id ? pickupLocation.name : `${pickupLocation.name} - ${dropOffLocation.name}`}`,
          description: `${env.WEBSITE_NAME} Web Service`,
          customerName: (!authenticated ? driver?.fullName : user?.fullName) as string,
        }
        const res = await StripeService.createCheckoutSession(payload)
        setClientSecret(res.clientSecret)
        _sessionId = res.sessionId
        _customerId = res.customerId
      }

      const payload: bookcarsTypes.CheckoutPayload = {
        driver,
        booking,
        additionalDriver: _additionalDriver,
        payLater,
        sessionId: _sessionId,
        customerId: _customerId
      }

      const { status, bookingId: _bookingId } = await BookingService.checkout(payload)
      setLoading(false)

      if (status === 200) {
        if (payLater) {
          setVisible(false)
          setSuccess(true)
        }
        setBookingId(_bookingId)
        setSessionId(_sessionId)
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  const onLoad = async (_user?: bookcarsTypes.User) => {
    setUser(_user)
    setAuthenticated(_user !== undefined)
    setLanguage(UserService.getLanguage())

    const { state } = location
    if (!state) {
      setNoMatch(true)
      return
    }

    const { carId } = state
    const { pickupLocationId } = state
    const { dropOffLocationId } = state
    const { from: _from } = state
    const { to: _to } = state

    if (!carId || !pickupLocationId || !dropOffLocationId || !_from || !_to) {
      setNoMatch(true)
      return
    }

    let _car
    let _pickupLocation
    let _dropOffLocation

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

      // if (_pickupLocation.latitude && _pickupLocation.longitude) {
      //   const l = await helper.getLocation()
      //   if (l) {
      //     const d = bookcarsHelper.distance(_pickupLocation.latitude, _pickupLocation.longitude, l[0], l[1], 'K')
      //     setDistance(bookcarsHelper.formatDistance(d, UserService.getLanguage()))
      //   }
      // }

      if (dropOffLocationId !== pickupLocationId) {
        _dropOffLocation = await LocationService.getLocation(dropOffLocationId)
      } else {
        _dropOffLocation = _pickupLocation
      }

      if (!_dropOffLocation) {
        setNoMatch(true)
        return
      }

      const _price = await StripeService.convertPrice(bookcarsHelper.calculateTotalPrice(_car, _from, _to))
      const _depositPrice = _car.deposit > 0 ? await StripeService.convertPrice(_car.deposit) : 0

      const included = (val: number) => val === 0

      setCar(_car)
      setPrice(_price)
      setDepositPrice(_depositPrice)
      setPickupLocation(_pickupLocation)
      setDropOffLocation(_dropOffLocation)
      setFrom(_from)
      setTo(_to)
      setCancellation(included(_car.cancellation))
      setAmendments(included(_car.amendments))
      setTheftProtection(included(_car.theftProtection))
      setCollisionDamageWaiver(included(_car.collisionDamageWaiver))
      setFullInsurance(included(_car.fullInsurance))
      setLicense(_user?.license || null)
      setVisible(true)
    } catch (err) {
      helper.error(err)
    }
  }

  return (
    <>
      <Layout onLoad={onLoad} strict={false}>
        {visible && car && from && to && pickupLocation && dropOffLocation && (
          <>
            <div className="checkout">
              <Paper className="checkout-form" elevation={10}>
                <h1 className="checkout-form-title">
                  {' '}
                  {strings.BOOKING_HEADING}
                  {' '}
                </h1>
                <form onSubmit={handleSubmit}>
                  <div>

                    {((pickupLocation.latitude && pickupLocation.longitude)
                      || (pickupLocation.parkingSpots && pickupLocation.parkingSpots.length > 0)) && (
                        <Map
                          position={[pickupLocation.latitude || -37.840935, pickupLocation.longitude || 144.946457]}
                          initialZoom={pickupLocation.latitude && pickupLocation.longitude ? 10 : 2.5}
                          parkingSpots={pickupLocation.parkingSpots}
                          locations={[pickupLocation]}
                          className="map"
                        >
                          <ViewOnMapButton onClick={() => setOpenMapDialog(true)} />
                        </Map>
                      )}

                    <CarList
                      cars={[car]}
                      // pickupLocationName={pickupLocation.name}
                      // distance={distance}
                      hidePrice
                      sizeAuto
                      onLoad={() => setLoadingPage(false)}
                      hideSupplier
                    />

                    <CheckoutOptions
                      car={car}
                      from={from}
                      to={to}
                      language={language}
                      clientSecret={clientSecret}
                      onPriceChange={(value) => setPrice(value)}
                      onAdManuallyCheckedChange={(value) => setAdManuallyChecked(value)}
                      onCancellationChange={(value) => setCancellation(value)}
                      onAmendmentsChange={(value) => setAmendments(value)}
                      onTheftProtectionChange={(value) => setTheftProtection(value)}
                      onCollisionDamageWaiverChange={(value) => setCollisionDamageWaiver(value)}
                      onFullInsuranceChange={(value) => setFullInsurance(value)}
                      onAdditionalDriverChange={(value) => setAdditionalDriver(value)}
                    />

                    <div className="checkout-details-container">
                      <div className="checkout-info">
                        <CarIcon />
                        <span>{strings.BOOKING_DETAILS}</span>
                      </div>
                      <div className="checkout-details">
                        <div className="checkout-detail" style={{ height: bookingDetailHeight }}>
                          <span className="checkout-detail-title">{strings.DAYS}</span>
                          <div className="checkout-detail-value">
                            {daysLabel}
                          </div>
                        </div>
                        <div className="checkout-detail" style={{ height: bookingDetailHeight }}>
                          <span className="checkout-detail-title">{commonStrings.PICK_UP_LOCATION}</span>
                          <div className="checkout-detail-value">{pickupLocation.name}</div>
                        </div>
                        <div className="checkout-detail" style={{ height: bookingDetailHeight }}>
                          <span className="checkout-detail-title">{commonStrings.DROP_OFF_LOCATION}</span>
                          <div className="checkout-detail-value">{dropOffLocation.name}</div>
                        </div>
                        <div className="checkout-detail" style={{ height: bookingDetailHeight }}>
                          <span className="checkout-detail-title">{strings.CAR}</span>
                          <div className="checkout-detail-value">{`${car.name} (${bookcarsHelper.formatPrice(price / days, commonStrings.CURRENCY, language)}${commonStrings.DAILY})`}</div>
                        </div>
                        <div className="checkout-detail" style={{ height: bookingDetailHeight }}>
                          <span className="checkout-detail-title">{commonStrings.SUPPLIER}</span>
                          <div className="checkout-detail-value">
                            <div className="car-supplier">
                              <img src={bookcarsHelper.joinURL(env.CDN_USERS, car.supplier.avatar)} alt={car.supplier.fullName} style={{ height: env.SUPPLIER_IMAGE_HEIGHT }} />
                              <span className="car-supplier-name">{car.supplier.fullName}</span>
                            </div>
                          </div>
                        </div>
                        <div className="checkout-detail" style={{ height: bookingDetailHeight }}>
                          <span className="checkout-detail-title">{strings.COST}</span>
                          <div className="checkout-detail-value booking-price">{bookcarsHelper.formatPrice(price, commonStrings.CURRENCY, language)}</div>
                        </div>
                      </div>
                    </div>

                    {!authenticated && (
                      <div className="driver-details">
                        <div className="checkout-info">
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
                              {(emailInfo && emailValid && strings.EMAIL_INFO) || ''}
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

                          <div className="checkout-tos">
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

                          <SocialLogin reloadPage />
                        </div>
                      </div>
                    )}

                    {car.supplier.licenseRequired && (
                      <div className="driver-details">
                        <div className="checkout-info">
                          <LicenseIcon />
                          <span>{commonStrings.DRIVER_LICENSE}</span>
                        </div>
                        <div className="driver-details-form">
                          <DriverLicense
                            user={user}
                            variant="outlined"
                            onUpload={(filename) => {
                              if (filename) {
                                setLicenseRequired(false)
                              } else {
                                setLicenseRequired(true)
                              }
                              setLicense(filename)
                            }}
                            onDelete={() => {
                              setLicenseRequired(false)
                              setLicense(null)
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {(adManuallyChecked && additionalDriver) && (
                      <div className="driver-details">
                        <div className="checkout-info">
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

                    {car.supplier.payLater && (
                      <div className="payment-options-container">
                        <div className="checkout-info">
                          <PaymentOptionsIcon />
                          <span>{strings.PAYMENT_OPTIONS}</span>
                        </div>
                        <div className="payment-options">
                          <FormControl>
                            <RadioGroup
                              defaultValue="payOnline"
                              onChange={(event) => {
                                setPayLater(event.target.value === 'payLater')
                                setPayDeposit(event.target.value === 'payDeposit')
                              }}
                            >
                              <FormControlLabel
                                value="payLater"
                                control={<Radio />}
                                disabled={!!clientSecret}
                                className={clientSecret ? 'payment-radio-disabled' : ''}
                                label={(
                                  <span className="payment-button">
                                    <span>{strings.PAY_LATER}</span>
                                    <span className="payment-info">{`(${strings.PAY_LATER_INFO})`}</span>
                                  </span>
                                )}
                              />
                              {
                                car.deposit > 0 && (
                                  <FormControlLabel
                                    value="payDeposit"
                                    control={<Radio />}
                                    disabled={!!clientSecret}
                                    className={clientSecret ? 'payment-radio-disabled' : ''}
                                    label={(
                                      <span className="payment-button">
                                        <span>{strings.PAY_DEPOSIT}</span>
                                        <span className="payment-info">{`(${strings.PAY_ONLINE_INFO})`}</span>
                                      </span>
                                    )}
                                  />
                                )
                              }
                              <FormControlLabel
                                value="payOnline"
                                control={<Radio />}
                                disabled={!!clientSecret}
                                className={clientSecret ? 'payment-radio-disabled' : ''}
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

                    <div className="checkout-details-container">
                      <div className="checkout-info">
                        <ChecklistIcon />
                        <span>{strings.PICK_UP_CHECKLIST_TITLE}</span>
                      </div>
                      <div className="checkout-details">
                        <div className="checkout-detail" style={{ height: bookingDetailHeight }}>
                          <span className="checkout-detail-title">{strings.PICK_UP_CHECKLIST_ARRIVE_ON_TIME_TITLE}</span>
                          <div className="checkout-detail-value checklist-content">
                            {strings.PICK_UP_CHECKLIST_ARRIVE_ON_TIME_CONTENT}
                          </div>
                        </div>
                        <div className="checkout-detail" style={{ height: bookingDetailHeight }}>
                          <span className="checkout-detail-title">{strings.PICK_UP_CHECKLIST_DOCUMENTS_TITLE}</span>
                          <div className="checkout-detail-value checklist-content">
                            {strings.PICK_UP_CHECKLIST_DOCUMENTS_CONTENT}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="payment-info">
                      <div className="payment-info-title">
                        {
                          payDeposit ? strings.DEPOSIT : `${strings.PRICE_FOR} ${days} ${days > 1 ? strings.DAYS : strings.DAY}`
                        }
                      </div>
                      <div className="payment-info-price">
                        {
                          bookcarsHelper.formatPrice(payDeposit ? depositPrice : price, commonStrings.CURRENCY, language)
                        }
                      </div>
                    </div>

                    {(!car.supplier.payLater || !payLater) && (
                      clientSecret && (
                        <div className="payment-options-container">
                          <EmbeddedCheckoutProvider
                            stripe={stripePromise}
                            options={{ clientSecret }}
                          >
                            <EmbeddedCheckout />
                          </EmbeddedCheckoutProvider>
                        </div>
                      )
                    )}
                    <div className="checkout-buttons">
                      {(!clientSecret || payLater) && (
                        <Button
                          type="submit"
                          variant="contained"
                          className="btn-checkout btn-margin-bottom"
                          aria-label="Checkout"
                          disabled={loading}
                        >
                          {
                            loading
                              ? <CircularProgress color="inherit" size={24} />
                              : strings.BOOK
                          }
                        </Button>
                      )}
                      <Button
                        variant="outlined"
                        color="primary"
                        className="btn-cancel btn-margin-bottom"
                        aria-label="Cancel"
                        onClick={async () => {
                          try {
                            if (bookingId && sessionId) {
                              //
                              // Delete temporary booking on cancel.
                              // Otherwise, temporary bookings are
                              // automatically deleted through a TTL index.
                              //
                              await BookingService.deleteTempBooking(bookingId, sessionId)
                            }
                            if (!authenticated && license) {
                              await UserService.deleteTempLicense(license)
                            }
                          } catch (err) {
                            helper.error(err)
                          } finally {
                            navigate('/')
                          }
                        }}
                      >
                        {commonStrings.CANCEL}
                      </Button>
                    </div>
                  </div>
                  <div className="form-error">
                    {tosError && <Error message={commonStrings.TOS_ERROR} />}
                    {error && <Error message={commonStrings.GENERIC_ERROR} />}
                    {paymentFailed && <Error message={strings.PAYMENT_FAILED} />}
                    {recaptchaError && <Error message={commonStrings.RECAPTCHA_ERROR} />}
                    {licenseRequired && <Error message={strings.LICENSE_REQUIRED} />}
                  </div>
                </form>
              </Paper>
            </div>

            <Footer />
          </>
        )}
        {noMatch && <NoMatch hideHeader />}

        {success && bookingId && (
          <CheckoutStatus
            bookingId={bookingId}
            language={language}
            payLater={payLater}
            status="success"
            className="status"
          />
        )}

        <MapDialog
          pickupLocation={pickupLocation}
          openMapDialog={openMapDialog}
          onClose={() => setOpenMapDialog(false)}
        />
      </Layout>

      {loadingPage && !noMatch && <Progress />}
    </>
  )
}

export default Checkout
