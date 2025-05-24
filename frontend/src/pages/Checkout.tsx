import React, { useRef, useState } from 'react'
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
import { format } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { PayPalButtons } from '@paypal/react-paypal-js'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import validator from 'validator'
import { createSchema, FormFields } from '@/models/CheckoutForm'
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
import * as PaymentService from '@/services/PaymentService'
import * as StripeService from '@/services/StripeService'
import * as PayPalService from '@/services/PayPalService'
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
import Backdrop from '@/components/SimpleBackdrop'
import Unauthorized from '@/components/Unauthorized'

import '@/assets/css/checkout.css'

//
// Make sure to call `loadStripe` outside of a component’s render to avoid
// recreating the `Stripe` object on every render.
//
const stripePromise = env.PAYMENT_GATEWAY === bookcarsTypes.PaymentGateway.Stripe ? loadStripe(env.STRIPE_PUBLISHABLE_KEY) : null

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
  const [emailRegistered, setEmailRegistered] = useState(false)
  const [emailInfo, setEmailInfo] = useState(true)
  const [phoneInfo, setPhoneInfo] = useState(true)
  const [price, setPrice] = useState(0)
  const [depositPrice, setDepositPrice] = useState(0)
  const [success, setSuccess] = useState(false)
  const [loadingPage, setLoadingPage] = useState(true)
  const [recaptchaError, setRecaptchaError] = useState(false)
  const adRequired = true
  const [adManuallyChecked, setAdManuallyChecked] = useState(false)
  const [paymentFailed, setPaymentFailed] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [bookingId, setBookingId] = useState<string>()
  const [sessionId, setSessionId] = useState<string>()
  // const [distance, setDistance] = useState('')
  const [licenseRequired, setLicenseRequired] = useState(false)
  const [license, setLicense] = useState<string | null>(null)
  const [openMapDialog, setOpenMapDialog] = useState(false)
  const [payPalLoaded, setPayPalLoaded] = useState(false)
  const [payPalInit, setPayPalInit] = useState(false)
  const [payPalProcessing, setPayPalProcessing] = useState(false)

  const birthDateRef = useRef<HTMLInputElement | null>(null)
  const additionalDriverBirthDateRef = useRef<HTMLInputElement | null>(null)
  const additionalDriverEmailRef = useRef<HTMLInputElement | null>(null)
  const additionalDriverPhoneRef = useRef<HTMLInputElement | null>(null)

  const _fr = language === 'fr'
  const _locale = _fr ? fr : enUS
  const _format = _fr ? 'eee d LLL yyyy kk:mm' : 'eee, d LLL yyyy, p'
  const bookingDetailHeight = env.SUPPLIER_IMAGE_HEIGHT + 10
  const days = bookcarsHelper.days(from, to)
  const daysLabel = from && to && `${helper.getDaysShort(days)} (${bookcarsHelper.capitalize(format(from, _format, { locale: _locale }))} - ${bookcarsHelper.capitalize(format(to, _format, { locale: _locale }))})`

  const schema = createSchema(car)

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    clearErrors,
    setFocus,
    trigger,
  } = useForm<FormFields>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    shouldUnregister: false,
    defaultValues: {
      additionalDriverEmail: '',
      additionalDriverPhone: '',
    }
  })

  const additionalDriverEmail= useWatch({ control, name: 'additionalDriverEmail' })
  const additionalDriverPhone = useWatch({ control, name: 'additionalDriverPhone' })

  const additionalDriver = useWatch({ control, name: 'additionalDriver' })
  const payLater = useWatch({ control, name: 'payLater' })
  const payDeposit = useWatch({ control, name: 'payDeposit' })

  const validateEmail = (email: string) => {
    return validator.isEmail(email)
  }

  const validatePhone = (phone: string) => {
    return validator.isMobilePhone(phone)
  }

  const onSubmit = async (data: FormFields) => {
    try {
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

      if (env.RECAPTCHA_ENABLED && !recaptchaToken) {
        setRecaptchaError(true)
        return
      }

      if (!authenticated) {
        // check email
        const status = await UserService.validateEmail({ email: data.email! })
        if (status === 200) {
          setEmailRegistered(false)
          setEmailInfo(true)
        } else {
          setEmailRegistered(true)
          setEmailInfo(false)
          return
        }
      }

      if (car.supplier.licenseRequired && !license) {
        setLicenseRequired(true)
        return
      }

      setPaymentFailed(false)

      let driver: bookcarsTypes.User | undefined
      let _additionalDriver: bookcarsTypes.AdditionalDriver | undefined

      if (!authenticated) {
        driver = {
          email: data.email,
          phone: data.phone,
          fullName: data.fullName!,
          birthDate: data.birthDate,
          language: UserService.getLanguage(),
          license: license || undefined,
        }
      }

      const basePrice = await bookcarsHelper.convertPrice(price, PaymentService.getCurrency(), env.BASE_CURRENCY)

      const booking: bookcarsTypes.Booking = {
        supplier: car.supplier._id as string,
        car: car._id,
        driver: authenticated ? user?._id : undefined,
        pickupLocation: pickupLocation._id,
        dropOffLocation: dropOffLocation._id,
        from,
        to,
        status: bookcarsTypes.BookingStatus.Pending,
        cancellation: data.cancellation,
        amendments: data.amendments,
        theftProtection: data.theftProtection,
        collisionDamageWaiver: data.collisionDamageWaiver,
        fullInsurance: data.fullInsurance,
        additionalDriver,
        price: basePrice,
      }

      if (adRequired && additionalDriver && data.additionalDriverBirthDate) {
        _additionalDriver = {
          fullName: data.additionalDriverFullName!,
          email: data.additionalDriverEmail!,
          phone: data.additionalDriverPhone!,
          birthDate: data.additionalDriverBirthDate,
        }
      }

      //
      // Stripe Payment Gateway
      //
      let _customerId: string | undefined
      let _sessionId: string | undefined
      if (!payLater) {
        if (env.PAYMENT_GATEWAY === bookcarsTypes.PaymentGateway.Stripe) {
          const name = bookcarsHelper.truncateString(`${env.WEBSITE_NAME} - ${car.name}`, StripeService.ORDER_NAME_MAX_LENGTH)
          const _description = `${env.WEBSITE_NAME} - ${car.name} - ${daysLabel} - ${pickupLocation._id === dropOffLocation._id ? pickupLocation.name : `${pickupLocation.name} - ${dropOffLocation.name}`}`
          const description = bookcarsHelper.truncateString(_description, StripeService.ORDER_DESCRIPTION_MAX_LENGTH)

          const payload: bookcarsTypes.CreatePaymentPayload = {
            amount: payDeposit ? depositPrice : price,
            currency: PaymentService.getCurrency(),
            locale: language,
            receiptEmail: (!authenticated ? driver?.email : user?.email) as string,
            name,
            description,
            customerName: (!authenticated ? driver?.fullName : user?.fullName) as string,
          }
          const res = await StripeService.createCheckoutSession(payload)
          setClientSecret(res.clientSecret)
          _sessionId = res.sessionId
          _customerId = res.customerId
        } else {
          setPayPalLoaded(true)
        }
      }

      booking.isDeposit = payDeposit

      const payload: bookcarsTypes.CheckoutPayload = {
        driver,
        booking,
        additionalDriver: _additionalDriver,
        payLater: !!data.payLater,
        sessionId: _sessionId,
        customerId: _customerId,
        payPal: env.PAYMENT_GATEWAY === bookcarsTypes.PaymentGateway.PayPal,
      }

      const { status, bookingId: _bookingId } = await BookingService.checkout(payload)

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
    }
  }

  const onError = () => {
    const firstErrorField = Object.keys(errors)[0] as keyof FormFields
    if (firstErrorField) {
      if (firstErrorField === 'birthDate' && birthDateRef.current) {
        birthDateRef.current.focus()
      }
      if (firstErrorField === 'additionalDriverBirthDate' && additionalDriverBirthDateRef.current) {
        additionalDriverBirthDateRef.current.focus()
      } else if (firstErrorField === 'additionalDriverEmail' && additionalDriverEmailRef.current) {
        additionalDriverEmailRef.current.focus()
      } else if (firstErrorField === 'additionalDriverPhone' && additionalDriverPhoneRef.current) {
        additionalDriverPhoneRef.current.focus()
      } else {
        setFocus(firstErrorField)
      }
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

      const priceChangeRate = _car.supplier.priceChangeRate || 0
      const _price = await PaymentService.convertPrice(bookcarsHelper.calculateTotalPrice(_car, _from, _to, priceChangeRate))
      let _depositPrice = _car.deposit > 0 ? await PaymentService.convertPrice(_car.deposit) : 0
      _depositPrice += _depositPrice * (priceChangeRate / 100)

      const included = (val: number) => val === 0

      setCar(_car)
      setPrice(_price)
      setDepositPrice(_depositPrice)
      setPickupLocation(_pickupLocation)
      setDropOffLocation(_dropOffLocation)
      setFrom(_from)
      setTo(_to)
      setValue('cancellation', included(_car.cancellation))
      setValue('amendments', included(_car.amendments))
      setValue('theftProtection', included(_car.theftProtection))
      setValue('collisionDamageWaiver', included(_car.collisionDamageWaiver))
      setValue('fullInsurance', included(_car.fullInsurance))
      setLicense(_user?.license || null)
      setVisible(true)
    } catch (err) {
      helper.error(err)
    }
  }

  return (
    <>
      <Layout onLoad={onLoad} strict={false}>
        {!user?.blacklisted && visible && car && from && to && pickupLocation && dropOffLocation && (
          <>
            <div className="checkout">
              <Paper className="checkout-form" elevation={10}>
                <h1 className="checkout-form-title">{strings.BOOKING_HEADING}</h1>
                <form onSubmit={handleSubmit(onSubmit, onError)}>
                  <div>
                    {(
                      (pickupLocation.latitude && pickupLocation.longitude)
                      || (pickupLocation.parkingSpots && pickupLocation.parkingSpots.length > 0)
                    ) && (
                        <Map
                          position={[pickupLocation.latitude || Number(pickupLocation.parkingSpots![0].latitude), pickupLocation.longitude || Number(pickupLocation.parkingSpots![0].longitude)]}
                          initialZoom={10}
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
                      hideSupplier={env.HIDE_SUPPLIERS}
                    />

                    <CheckoutOptions
                      car={car}
                      from={from}
                      to={to}
                      language={language}
                      clientSecret={clientSecret}
                      payPalLoaded={payPalLoaded}
                      onPriceChange={(value) => setPrice(value)}
                      onAdManuallyCheckedChange={(value) => setAdManuallyChecked(value)}
                      onCancellationChange={(value) => setValue('cancellation', value)}
                      onAmendmentsChange={(value) => setValue('amendments', value)}
                      onTheftProtectionChange={(value) => setValue('theftProtection', value)}
                      onCollisionDamageWaiverChange={(value) => setValue('collisionDamageWaiver', value)}
                      onFullInsuranceChange={(value) => setValue('fullInsurance', value)}
                      onAdditionalDriverChange={(value) => setValue('additionalDriver', value)}
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
                        {!env.HIDE_SUPPLIERS && (
                          <div className="checkout-detail" style={{ height: bookingDetailHeight }}>
                            <span className="checkout-detail-title">{commonStrings.SUPPLIER}</span>
                            <div className="checkout-detail-value">
                              <div className="car-supplier">
                                <img src={bookcarsHelper.joinURL(env.CDN_USERS, car.supplier.avatar)} alt={car.supplier.fullName} style={{ height: env.SUPPLIER_IMAGE_HEIGHT }} />
                                <span className="car-supplier-name">{car.supplier.fullName}</span>
                              </div>
                            </div>
                          </div>
                        )}
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
                            <OutlinedInput
                              {...register('fullName')}
                              type="text"
                              label={commonStrings.FULL_NAME}
                              required
                              error={!!errors.fullName}
                              autoComplete="off"
                            />
                          </FormControl>
                          <FormControl fullWidth margin="dense">
                            <InputLabel className="required">{commonStrings.EMAIL}</InputLabel>
                            <OutlinedInput
                              // {...register('email')}
                              type="text"
                              label={commonStrings.EMAIL}
                              error={!!errors.email || emailRegistered}
                              required
                              autoComplete="off"
                              onChange={(e) => {
                                if (errors.email) {
                                  clearErrors('email')
                                }
                                setEmailRegistered(false)
                                setEmailInfo(false)
                                setValue('email', e.target.value)
                              }}
                              onBlur={async (e) => {
                                trigger('email')
                                const email = e.target.value

                                if (validateEmail(email)) {
                                  const status = await UserService.validateEmail({ email })
                                  if (status === 200) {
                                    setEmailRegistered(false)
                                    setEmailInfo(true)
                                  } else {
                                    setEmailRegistered(true)
                                    setEmailInfo(false)
                                  }
                                } else {
                                  setEmailRegistered(false)
                                  setEmailInfo(false)
                                }
                              }}
                            />
                            <FormHelperText error={!!errors.email || emailRegistered}>
                              {(errors.email && errors.email.message) || ''}
                              {(emailRegistered && (
                                <span>
                                  <span>{commonStrings.EMAIL_ALREADY_REGISTERED}</span>
                                  <span> </span>
                                  <a href={`/sign-in?c=${car._id}&p=${pickupLocation._id}&d=${dropOffLocation._id}&f=${from.getTime()}&t=${to.getTime()}&from=checkout`}>{strings.SIGN_IN}</a>
                                </span>
                              ))
                                || ''}
                              {(emailInfo && !errors.email && strings.EMAIL_INFO) || ''}
                            </FormHelperText>
                          </FormControl>
                          <FormControl fullWidth margin="dense">
                            <InputLabel className="required">{commonStrings.PHONE}</InputLabel>
                            <OutlinedInput
                              // {...register('phone')}
                              type="text"
                              label={commonStrings.PHONE}
                              error={!!errors.phone}
                              required
                              autoComplete="off"
                              onChange={(e) => {
                                if (errors.phone) {
                                  clearErrors('phone')
                                }
                                setPhoneInfo(false)
                                setValue('phone', e.target.value)
                              }}
                              onBlur={(e) => {
                                trigger('phone')
                                setPhoneInfo(validatePhone(e.target.value))
                              }}
                            />
                            <FormHelperText error={!!errors.phone}>
                              {(errors.phone && errors.phone.message) || ''}
                              {(phoneInfo && strings.PHONE_INFO) || ''}
                            </FormHelperText>
                          </FormControl>
                          <FormControl fullWidth margin="dense">
                            <DatePicker
                              {...register('birthDate')}
                              ref={birthDateRef}
                              label={commonStrings.BIRTH_DATE}
                              variant="outlined"
                              required
                              onChange={(_birthDate) => {
                                if (errors.birthDate) {
                                  clearErrors('birthDate')
                                }
                                if (_birthDate) {
                                  setValue('birthDate', _birthDate, { shouldValidate: true })
                                } else {
                                  setValue('birthDate', undefined, { shouldValidate: true })
                                }
                              }}
                              language={language}
                            />
                            <FormHelperText error={!!errors.birthDate}>
                              {(errors.birthDate && errors.birthDate.message) || ''}
                            </FormHelperText>
                          </FormControl>

                          <div className="checkout-tos">
                            <table>
                              <tbody>
                                <tr>
                                  <td aria-label="tos">
                                    <Checkbox
                                      {...register('tos')}
                                      onChange={(e) => {
                                        if (e.target.checked && errors.tos) {
                                          clearErrors('tos')
                                        }
                                      }}
                                      color="primary"
                                    />
                                  </td>
                                  <td>
                                    <Link href="/tos" target="_blank" rel="noreferrer">
                                      {commonStrings.TOS}
                                    </Link>
                                  </td>
                                </tr>
                                <tr>
                                  <td colSpan={2}>
                                    <FormHelperText error={!!errors.tos}>{errors.tos?.message || ''}</FormHelperText>
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
                            hideDelete={!!clientSecret || payPalLoaded}
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
                              {...register('additionalDriverFullName')}
                              type="text"
                              label={commonStrings.FULL_NAME}
                              required={adRequired}
                              autoComplete="off"
                            />
                          </FormControl>
                          <FormControl fullWidth margin="dense">
                            <InputLabel className="required">{commonStrings.EMAIL}</InputLabel>
                            <OutlinedInput
                              // {...register('additionalDriverEmail')}
                              inputRef={additionalDriverEmailRef}
                              value={additionalDriverEmail}
                              type="text"
                              label={commonStrings.EMAIL}
                              error={!!errors.additionalDriverEmail}
                              required={adRequired}
                              autoComplete="off"
                              onChange={(e) => {
                                if (errors.additionalDriverEmail) {
                                  clearErrors('additionalDriverEmail')
                                }
                                setValue('additionalDriverEmail', e.target.value)
                              }}
                              onBlur={() => {
                                trigger('additionalDriverEmail')
                              }}
                            />
                            <FormHelperText error={!!errors.additionalDriverEmail}>
                              {(errors.additionalDriverEmail && errors.additionalDriverEmail.message) || ''}
                            </FormHelperText>
                          </FormControl>
                          <FormControl fullWidth margin="dense">
                            <InputLabel className="required">{commonStrings.PHONE}</InputLabel>
                            <OutlinedInput
                              // {...register('additionalDriverPhone')}
                              inputRef={additionalDriverPhoneRef}
                              value={additionalDriverPhone}
                              type="text"
                              label={commonStrings.PHONE}
                              error={!!errors.additionalDriverPhone}
                              required={adRequired}
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
                            <FormHelperText error={!!errors.additionalDriverPhone}>
                              {(errors.additionalDriverPhone && errors.additionalDriverPhone.message) || ''}
                            </FormHelperText>
                          </FormControl>
                          <FormControl fullWidth margin="dense">
                            <DatePicker
                              {...register('additionalDriverBirthDate')}
                              ref={additionalDriverBirthDateRef}
                              label={commonStrings.BIRTH_DATE}
                              variant="outlined"
                              required={adRequired}
                              onChange={(_birthDate) => {
                                if (_birthDate) {
                                  setValue('additionalDriverBirthDate', _birthDate, { shouldValidate: true })
                                } else {
                                  setValue('additionalDriverBirthDate', undefined, { shouldValidate: true })
                                }
                              }}
                              language={language}
                            />
                            <FormHelperText error={!!errors.additionalDriverBirthDate}>
                              {(errors.additionalDriverBirthDate && errors.additionalDriverBirthDate.message) || ''}
                            </FormHelperText>
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
                              onChange={(e) => {
                                setValue('payLater', e.target.value === 'payLater')
                                setValue('payDeposit', e.target.value === 'payDeposit')
                              }}
                            >
                              <FormControlLabel
                                value="payLater"
                                control={<Radio />}
                                disabled={!!clientSecret || payPalLoaded}
                                className={clientSecret || payPalLoaded ? 'payment-radio-disabled' : ''}
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
                                    disabled={!!clientSecret || payPalLoaded}
                                    className={clientSecret || payPalLoaded ? 'payment-radio-disabled' : ''}
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
                                disabled={!!clientSecret || payPalLoaded}
                                className={clientSecret || payPalLoaded ? 'payment-radio-disabled' : ''}
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
                      env.PAYMENT_GATEWAY === bookcarsTypes.PaymentGateway.Stripe
                        ? (
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
                        )
                        : payPalLoaded ? (
                          <div className="payment-options-container">
                            <PayPalButtons
                              createOrder={async () => {
                                const name = bookcarsHelper.truncateString(car.name, PayPalService.ORDER_NAME_MAX_LENGTH)
                                const _description = `${car.name} - ${daysLabel} - ${pickupLocation._id === dropOffLocation._id ? pickupLocation.name : `${pickupLocation.name} - ${dropOffLocation.name}`}`
                                const description = bookcarsHelper.truncateString(_description, PayPalService.ORDER_DESCRIPTION_MAX_LENGTH)
                                const amount = payDeposit ? depositPrice : price
                                const orderId = await PayPalService.createOrder(bookingId!, amount, PaymentService.getCurrency(), name, description)
                                return orderId
                              }}
                              onApprove={async (data, actions) => {
                                try {
                                  setPayPalProcessing(true)
                                  await actions.order?.capture()
                                  const { orderID } = data
                                  const status = await PayPalService.checkOrder(bookingId!, orderID)

                                  if (status === 200) {
                                    setVisible(false)
                                    setSuccess(true)
                                  } else {
                                    setPaymentFailed(true)
                                  }
                                } catch (err) {
                                  helper.error(err)
                                } finally {
                                  setPayPalProcessing(false)
                                }
                              }}
                              onInit={() => {
                                setPayPalInit(true)
                              }}
                              onCancel={() => {
                                setPayPalProcessing(false)
                              }}
                              onError={() => {
                                setPayPalProcessing(false)
                              }}
                            />
                          </div>
                        ) : null
                    )}
                    <div className="checkout-buttons">
                      {(
                        (env.PAYMENT_GATEWAY === bookcarsTypes.PaymentGateway.Stripe && !clientSecret)
                        || (env.PAYMENT_GATEWAY === bookcarsTypes.PaymentGateway.PayPal && !payPalInit)
                        || payLater) && (
                          <Button
                            type="submit"
                            variant="contained"
                            className="btn-checkout btn-margin-bottom"
                            aria-label="Checkout"
                            disabled={isSubmitting || (payPalLoaded && !payPalInit)}
                          >
                            {
                              (isSubmitting || (payPalLoaded && !payPalInit))
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

        {user?.blacklisted && <Unauthorized />}

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

        {payPalProcessing && <Backdrop text={strings.CHECKING} />}

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
