import React, { useEffect, useRef, useState } from 'react'
import { Image, StyleSheet, Text, View, TextInput as ReactTextInput } from 'react-native'
import { useIsFocused } from '@react-navigation/native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { MaterialIcons } from '@expo/vector-icons'
import validator from 'validator'
import { format, intervalToDuration } from 'date-fns'
import { enUS, fr } from 'date-fns/locale'
import { PaymentSheetError, initPaymentSheet, useStripe } from '@stripe/stripe-react-native'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'

import Layout from '@/components/Layout'
import i18n from '@/lang/i18n'
import * as UserService from '@/services/UserService'
import CarList from '@/components/CarList'
import TextInput from '@/components/TextInput'
import DateTimePicker from '@/components/DateTimePicker'
import Switch from '@/components/Switch'
import Link from '@/components/Link'
import * as helper from '@/utils/helper'
import Error from '@/components/Error'
import Button from '@/components/Button'
import RadioButton from '@/components/RadioButton'
import * as CarService from '@/services/CarService'
import * as LocationService from '@/services/LocationService'
import * as BookingService from '@/services/BookingService'
import * as StripeService from '@/services/StripeService'
import * as env from '@/config/env.config'
import Backdrop from '@/components/Backdrop'
import Indicator from '@/components/Indicator'
import DriverLicense from '@/components/DriverLicense'

const CheckoutScreen = ({ navigation, route }: NativeStackScreenProps<StackParams, 'Checkout'>) => {
  const isFocused = useIsFocused()
  const [reload, setReload] = useState(false)
  const [visible, setVisible] = useState(false)
  const [formVisible, setFormVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [user, setUser] = useState<bookcarsTypes.User | null>()
  const [language, setLanguage] = useState(env.DEFAULT_LANGUAGE)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [birthDate, setBirthDate] = useState<Date>()
  const [tosChecked, setTosChecked] = useState(false)
  const [car, setCar] = useState<bookcarsTypes.Car | null>(null)
  const [pickupLocation, setPickupLocation] = useState<bookcarsTypes.Location | null>(null)
  const [dropOffLocation, setDropOffLocation] = useState<bookcarsTypes.Location | null>(null)
  const [from, setFrom] = useState<Date>()
  const [to, setTo] = useState<Date>()
  const [price, setPrice] = useState(0)
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
  const [payLater, setPayLater] = useState(false)

  const [fullNameRequired, setFullNameRequired] = useState(false)
  const [emailInfo, setEmailInfo] = useState(true)
  const [emailError, setEmailError] = useState(false)
  const [emailValid, setEmailValid] = useState(true)
  const [emailRequired, setEmailRequired] = useState(false)
  const [phoneInfo, setPhoneInfo] = useState(true)
  const [phoneValid, setPhoneValid] = useState(true)
  const [phoneRequired, setPhoneRequired] = useState(false)
  const [birthDateRequired, setBirthDateRequired] = useState(false)
  const [birthDateValid, setBirthDateValid] = useState(true)
  const [tosError, setTosError] = useState(false)
  const [error, setError] = useState(false)
  const [success, setSuccess] = useState(true)
  const [locale, setLoacle] = useState(fr)
  const [additionalDriverFullNameRequired, setAdditionalDriverFullNameRequired] = useState(false)
  const [additionalDriverEmailRequired, setAdditionalDriverEmailRequired] = useState(false)
  const [additionalDriverEmailValid, setAdditionalDriverEmailValid] = useState(true)
  const [additionalDriverPhoneRequired, setAdditionalDriverPhoneRequired] = useState(false)
  const [additionalDriverPhoneValid, setAdditionalDriverPhoneValid] = useState(true)
  const [additionalDriverBirthDateRequired, setAdditionalDriverBirthDateRequired] = useState(false)
  const [additionalDriverBirthDateValid, setAdditionalDriverBirthDateValid] = useState(true)

  const [currencySymbol, setCurrencySymbol] = useState('')
  const [cancellationText, setCancellationText] = useState('')
  const [amendmentsText, setAmendmentsText] = useState('')
  const [collisionDamageWaiverText, setCollisionDamageWaiverText] = useState('')
  const [theftProtectionText, setTheftProtectionText] = useState('')
  const [fullInsuranceText, setFullInsuranceText] = useState('')
  const [additionalDriverText, setAdditionalDriverText] = useState('')

  const [adManuallyChecked, setAdManuallyChecked] = useState(false)
  const [licenseRequired, setLicenseRequired] = useState(false)
  const [license, setLicense] = useState<string | null>(null)
  const [depositPrice, setDepositPrice] = useState(0)
  const [payDeposit, setPayDeposit] = useState(false)
  const adRequired = true

  const { presentPaymentSheet } = useStripe()

  const fullNameRef = useRef<ReactTextInput>(null)
  const emailRef = useRef<ReactTextInput>(null)
  const phoneRef = useRef<ReactTextInput>(null)
  const cardNameRef = useRef<ReactTextInput>(null)
  const cardNumberRef = useRef<ReactTextInput>(null)
  const cardMonthRef = useRef<ReactTextInput>(null)
  const cardYearRef = useRef<ReactTextInput>(null)
  const cvvRef = useRef<ReactTextInput>(null)
  const _fullNameRef = useRef<ReactTextInput>(null)
  const _emailRef = useRef<ReactTextInput>(null)
  const _phoneRef = useRef<ReactTextInput>(null)

  const _init = async () => {
    try {
      setVisible(false)
      setFormVisible(false)

      const _language = await UserService.getLanguage()
      i18n.locale = _language
      setLanguage(_language)
      setLoacle(_language === 'fr' ? fr : enUS)

      setAuthenticated(false)
      setUser(null)

      let _authenticated = false
      let _user: bookcarsTypes.User | null = null
      const currentUser = await UserService.getCurrentUser()

      if (currentUser?._id) {
        let status
        try {
          status = await UserService.validateAccessToken()
        } catch {
          status = 403
        }

        if (status === 200) {
          const __user = await UserService.getUser(currentUser._id)

          if (__user) {
            _authenticated = true
            _user = __user
          }
        }
      }

      setAuthenticated(_authenticated)
      setUser(_user)

      if (!_authenticated) {
        setFullName('')
        setEmail('')
        setPhone('')
        setBirthDate(undefined)
        setTosChecked(false)

        if (fullNameRef.current) {
          fullNameRef.current.clear()
        }
        if (emailRef.current) {
          emailRef.current.clear()
        }
        if (phoneRef.current) {
          phoneRef.current.clear()
        }
      }

      setAdditionalDriverFullName('')
      setAdditionalDriverEmail('')
      setAdditionalDriverPhone('')
      setAdditionalDriverBirthDate(undefined)
      if (_fullNameRef.current) {
        _fullNameRef.current.clear()
      }
      if (_emailRef.current) {
        _emailRef.current.clear()
      }
      if (_phoneRef.current) {
        _phoneRef.current.clear()
      }

      setFullNameRequired(false)
      setEmailRequired(false)
      setEmailValid(true)
      setEmailError(false)
      setPhoneRequired(false)
      setPhoneValid(true)
      setBirthDateRequired(false)
      setBirthDateValid(true)
      setBirthDateRequired(false)
      setTosError(false)
      setError(false)
      setPayLater(false)
      setSuccess(false)

      if (cardNameRef.current) {
        cardNameRef.current.clear()
      }
      if (cardNumberRef.current) {
        cardNumberRef.current.clear()
      }
      if (cardMonthRef.current) {
        cardMonthRef.current.clear()
      }
      if (cardYearRef.current) {
        cardYearRef.current.clear()
      }
      if (cvvRef.current) {
        cvvRef.current.clear()
      }

      if (!route.params
        || !route.params.car
        || !route.params.pickupLocation
        || !route.params.dropOffLocation
        || !route.params.from
        || !route.params.to) {
        await UserService.signout(navigation)
        return
      }

      const _car = await CarService.getCar(route.params.car)
      setCar(_car)

      const _pickupLocation = await LocationService.getLocation(route.params.pickupLocation)
      setPickupLocation(_pickupLocation)

      if (route.params.dropOffLocation !== route.params.pickupLocation) {
        const _dropOffLocation = await LocationService.getLocation(route.params.dropOffLocation)
        setDropOffLocation(_dropOffLocation)
      } else {
        setDropOffLocation(_pickupLocation)
      }

      const _from = new Date(route.params.from)
      setFrom(_from)

      const _to = new Date(route.params.to)
      setTo(_to)

      const priceChangeRate = _car.supplier.priceChangeRate || 0
      const _price = await StripeService.convertPrice(bookcarsHelper.calculateTotalPrice(_car, _from, _to, priceChangeRate))
      setPrice(_price)

      let _depositPrice = _car.deposit > 0 ? await StripeService.convertPrice(_car.deposit) : 0
      _depositPrice += _depositPrice * (priceChangeRate / 100)
      setDepositPrice(_depositPrice)

      const included = (val: number) => val === 0

      setCancellation(included(_car.cancellation))
      setAmendments(included(_car.amendments))
      setCollisionDamageWaiver(included(_car.collisionDamageWaiver))
      setTheftProtection(included(_car.theftProtection))
      setFullInsurance(included(_car.fullInsurance))
      setLicenseRequired(false)
      setLicense(_user?.license || null)

      setCurrencySymbol(await StripeService.getCurrencySymbol())

      const days = bookcarsHelper.days(_from, _to)
      setCancellationText(await helper.getCancellationOption(_car.cancellation, _language, priceChangeRate))
      setAmendmentsText(await helper.getAmendmentsOption(_car.amendments, _language, priceChangeRate))
      setCollisionDamageWaiverText(await helper.getCollisionDamageWaiverOption(_car.collisionDamageWaiver, days, _language, priceChangeRate))
      setTheftProtectionText(await helper.getTheftProtectionOption(_car.theftProtection, days, _language, priceChangeRate))
      setFullInsuranceText(await helper.getFullInsuranceOption(_car.fullInsurance, days, _language, priceChangeRate))
      setAdditionalDriverText(await helper.getAdditionalDriverOption(_car.additionalDriver, days, _language, priceChangeRate))

      setVisible(true)
      setFormVisible(true)
    } catch {
      await UserService.signout(navigation)
    }
  }

  useEffect(() => {
    if (isFocused) {
      _init()
      setReload(true)
    } else {
      setVisible(false)
    }
  }, [route.params, isFocused]) // eslint-disable-line react-hooks/exhaustive-deps

  const onLoad = () => {
    setReload(false)
  }

  const validateFullName = () => {
    const valid = fullName !== ''
    setFullNameRequired(!valid)
    setError(!valid)
    return valid
  }

  const _validateFullName = () => {
    const valid = additionalDriverfullName !== ''
    setAdditionalDriverFullNameRequired(!valid)
    setError(!valid)
    return valid
  }

  const onChangeFullName = (text: string) => {
    setFullName(text)
    setFullNameRequired(false)
    setError(false)
  }

  const validateEmail = async () => {
    if (email) {
      setEmailRequired(false)

      if (validator.isEmail(email)) {
        try {
          const status = await UserService.validateEmail({ email })
          if (status === 200) {
            setEmailInfo(true)
            setEmailError(false)
            setEmailValid(true)
            setError(false)
            return true
          }
          setEmailInfo(false)
          setEmailError(true)
          setEmailValid(true)
          setError(true)
          return false
        } catch (err) {
          helper.error(err)
          setEmailInfo(true)
          setEmailError(false)
          setEmailValid(true)
          setError(false)
          return false
        }
      } else {
        setEmailError(false)
        setEmailValid(false)
        setError(true)
        return false
      }
    } else {
      setEmailInfo(false)
      setEmailRequired(true)
      setEmailError(false)
      setEmailValid(true)
      setError(true)
      return false
    }
  }

  const _validateEmail = () => {
    if (addtionalDriverEmail) {
      setAdditionalDriverEmailRequired(false)

      if (validator.isEmail(addtionalDriverEmail)) {
        setAdditionalDriverEmailValid(true)
        setError(false)
        return true
      }
      setAdditionalDriverEmailValid(false)
      setError(true)
      return false
    }
    setAdditionalDriverEmailRequired(true)
    setAdditionalDriverEmailValid(true)
    setError(true)
    return false
  }

  const onChangeEmail = (text: string) => {
    setEmail(text)
    setEmailInfo(true)
    setEmailRequired(false)
    setEmailValid(true)
    setEmailError(false)
    setError(false)
  }

  const validatePhone = () => {
    if (phone) {
      const _phoneValid = validator.isMobilePhone(phone)
      setPhoneInfo(_phoneValid)
      setPhoneRequired(false)
      setPhoneValid(_phoneValid)
      setError(!_phoneValid)

      return _phoneValid
    }
    setPhoneInfo(false)
    setPhoneRequired(true)
    setPhoneValid(true)
    setError(true)

    return false
  }

  const _validatePhone = () => {
    if (additionalDriverPhone) {
      const _phoneValid = validator.isMobilePhone(additionalDriverPhone)
      setAdditionalDriverPhoneRequired(false)
      setAdditionalDriverPhoneValid(_phoneValid)
      setError(!_phoneValid)

      return _phoneValid
    }
    setAdditionalDriverPhoneRequired(true)
    setAdditionalDriverPhoneValid(true)
    setError(true)

    return false
  }

  const onChangePhone = (text: string) => {
    setPhone(text)
    setPhoneInfo(true)
    setPhoneRequired(false)
    setPhoneValid(true)
    setError(false)
  }

  const validateBirthDate = () => {
    if (birthDate) {
      setBirthDateRequired(false)

      const sub = intervalToDuration({
        start: birthDate,
        end: new Date(),
      }).years ?? 0
      const _birthDateValid = sub >= env.MINIMUM_AGE

      setBirthDateValid(_birthDateValid)
      setError(!_birthDateValid)
      return _birthDateValid
    }
    setBirthDateRequired(true)
    setBirthDateValid(true)
    setError(true)

    return false
  }

  const _validateBirthDate = () => {
    if (addtionalDriverBirthDate) {
      setAdditionalDriverBirthDateRequired(false)

      const sub = intervalToDuration({
        start: addtionalDriverBirthDate,
        end: new Date(),
      }).years ?? 0
      const _birthDateValid = sub >= env.MINIMUM_AGE

      setAdditionalDriverBirthDateValid(_birthDateValid)
      setError(!_birthDateValid)
      return _birthDateValid
    }
    setAdditionalDriverBirthDateRequired(true)
    setAdditionalDriverBirthDateValid(true)
    setError(true)

    return false
  }

  const onChangeBirthDate = (date: Date | undefined) => {
    setBirthDate(date)
    setBirthDateRequired(false)
    setBirthDateValid(true)
    setError(false)
  }

  const onChangeToS = (checked: boolean) => {
    setTosChecked(checked)
    if (checked) {
      setTosError(false)
    }
  }

  const onCancellationChange = async (checked: boolean) => {
    const options = {
      cancellation: checked,
      amendments,
      collisionDamageWaiver,
      theftProtection,
      fullInsurance,
      additionalDriver,
    }
    const _price = await StripeService.convertPrice(bookcarsHelper.calculateTotalPrice(car as bookcarsTypes.Car, from as Date, to as Date, (car as bookcarsTypes.Car).supplier.priceChangeRate || 0, options))
    setCancellation(checked)
    setPrice(_price)
  }

  const onAmendmentsChange = async (checked: boolean) => {
    const options = {
      cancellation,
      amendments: checked,
      collisionDamageWaiver,
      theftProtection,
      fullInsurance,
      additionalDriver,
    }
    const _price = await StripeService.convertPrice(bookcarsHelper.calculateTotalPrice(car as bookcarsTypes.Car, from as Date, to as Date, (car as bookcarsTypes.Car).supplier.priceChangeRate || 0, options))
    setAmendments(checked)
    setPrice(_price)
  }

  const onCollisionDamageWaiverChange = async (checked: boolean) => {
    const options = {
      cancellation,
      amendments,
      collisionDamageWaiver: checked,
      theftProtection,
      fullInsurance,
      additionalDriver,
    }
    const _price = await StripeService.convertPrice(bookcarsHelper.calculateTotalPrice(car as bookcarsTypes.Car, from as Date, to as Date, (car as bookcarsTypes.Car).supplier.priceChangeRate || 0, options))
    setCollisionDamageWaiver(checked)
    setPrice(_price)
  }

  const onTheftProtectionChange = async (checked: boolean) => {
    const options = {
      cancellation,
      amendments,
      collisionDamageWaiver,
      theftProtection: checked,
      fullInsurance,
      additionalDriver,
    }
    const _price = await StripeService.convertPrice(bookcarsHelper.calculateTotalPrice(car as bookcarsTypes.Car, from as Date, to as Date, (car as bookcarsTypes.Car).supplier.priceChangeRate || 0, options))
    setTheftProtection(checked)
    setPrice(_price)
  }

  const onFullInsuranceChange = async (checked: boolean) => {
    const options = {
      cancellation,
      amendments,
      collisionDamageWaiver,
      theftProtection,
      fullInsurance: checked,
      additionalDriver,
    }
    const _price = await StripeService.convertPrice(bookcarsHelper.calculateTotalPrice(car as bookcarsTypes.Car, from as Date, to as Date, (car as bookcarsTypes.Car).supplier.priceChangeRate || 0, options))
    setFullInsurance(checked)
    setPrice(_price)
  }

  const onAdditionalDriverChange = async (checked: boolean) => {
    const options = {
      cancellation,
      amendments,
      collisionDamageWaiver,
      theftProtection,
      fullInsurance,
      additionalDriver: checked,
    }
    const _price = await StripeService.convertPrice(bookcarsHelper.calculateTotalPrice(car as bookcarsTypes.Car, from as Date, to as Date, (car as bookcarsTypes.Car).supplier.priceChangeRate || 0, options))
    setAdditionalDriver(checked)
    setPrice(_price)
    setAdManuallyChecked(checked)
  }

  const _error = (err?: unknown) => {
    helper.error(err)
    setLoading(false)
  }

  const handleCheckout = async () => {
    try {
      if (!car || !pickupLocation || !dropOffLocation || !from || !to) {
        helper.error()
        return
      }

      if (!authenticated) {
        fullNameRef?.current?.blur()
        emailRef?.current?.blur()
        phoneRef?.current?.blur()

        const fullNameValid = validateFullName()
        if (!fullNameValid) {
          return
        }

        const _emailValid = await validateEmail()
        if (!_emailValid) {
          return
        }

        const _phoneValid = validatePhone()
        if (!_phoneValid) {
          return
        }

        const _birthDateValid = validateBirthDate()
        if (!_birthDateValid) {
          return
        }

        if (!tosChecked) {
          setTosError(true)
          return
        }
      }

      if (car.supplier.licenseRequired && !license) {
        setLicenseRequired(true)
        return
      }

      if (adManuallyChecked && additionalDriver) {
        const fullNameValid = _validateFullName()
        if (!fullNameValid) {
          return
        }

        const _emailValid = _validateEmail()
        if (!_emailValid) {
          return
        }

        const _phoneValid = _validatePhone()
        if (!_phoneValid) {
          return
        }

        const _birthDateValid = _validateBirthDate()
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
          language: await UserService.getLanguage(),
          license: license || undefined,
        }
      }

      const currency = await StripeService.getCurrency()
      let paid = payLater
      let canceled = false
      let paymentIntentId: string | undefined
      let customerId: string | undefined
      try {
        if (!payLater) {
          const name = bookcarsHelper.truncateString(`${env.WEBSITE_NAME} - ${car.name}`, StripeService.ORDER_NAME_MAX_LENGTH)
          const _locale = _fr ? fr : enUS
          const daysLabel = from && to && `${helper.getDaysShort(days)} (${bookcarsHelper.capitalize(format(from, _format, { locale: _locale }))} - ${bookcarsHelper.capitalize(format(to, _format, { locale: _locale }))})`
          const _description = `${env.WEBSITE_NAME} - ${car.name} - ${daysLabel} - ${pickupLocation._id === dropOffLocation._id ? pickupLocation.name : `${pickupLocation.name} - ${dropOffLocation.name}`}`
          const description = bookcarsHelper.truncateString(_description, StripeService.ORDER_DESCRIPTION_MAX_LENGTH)

          const createPaymentIntentPayload: bookcarsTypes.CreatePaymentPayload = {
            amount: payDeposit ? depositPrice : price,
            currency,
            locale: language,
            receiptEmail: (!authenticated ? driver?.email : user?.email) as string,
            name,
            description,
            customerName: (!authenticated ? driver?.fullName : user?.fullName) as string,
          }

          // Create payment intent
          const {
            paymentIntentId: stripePaymentIntentId,
            clientSecret,
            customerId: stripeCustomerId,
          } = await StripeService.createPaymentIntent(createPaymentIntentPayload)
          paymentIntentId = stripePaymentIntentId || undefined
          customerId = stripeCustomerId || undefined

          if (clientSecret) {
            const { error: initPaymentSheetError } = await initPaymentSheet({
              customerId,
              paymentIntentClientSecret: clientSecret,
              merchantDisplayName: 'BookCars',
              googlePay: {
                merchantCountryCode: env.STRIPE_COUNTRY_CODE.toUpperCase(),
                testEnv: env.STRIPE_PUBLISHABLE_KEY.includes('_test_'),
                currencyCode: currency,
              },
              applePay: {
                merchantCountryCode: env.STRIPE_COUNTRY_CODE.toUpperCase(),
              },
            })
            if (initPaymentSheetError) {
              console.log(initPaymentSheetError)
              paid = false
            } else {
              const { error: presentPaymentSheetError } = await presentPaymentSheet()
              if (presentPaymentSheetError) {
                canceled = presentPaymentSheetError.code === PaymentSheetError.Canceled
                if (!canceled) {
                  console.log(`${presentPaymentSheetError.code} - ${presentPaymentSheetError.message}`)
                  paid = false
                }
              } else {
                paid = true
              }
            }
          }
        }
      } catch (err) {
        console.log(err)
        paid = false
      }

      if (canceled) {
        setLoading(false)
        return
      }

      if (!paid) {
        setLoading(false)
        alert(i18n.t('PAYMENT_FAILED'))
        return
      }

      const basePrice = await bookcarsHelper.convertPrice(price, currency, env.BASE_CURRENCY)

      const booking: bookcarsTypes.Booking = {
        supplier: car.supplier._id as string,
        car: car._id as string,
        driver: authenticated ? user?._id : undefined,
        pickupLocation: pickupLocation._id as string,
        dropOffLocation: dropOffLocation._id as string,
        from,
        to,
        status: payLater ? bookcarsTypes.BookingStatus.Pending : payDeposit ? bookcarsTypes.BookingStatus.Deposit : bookcarsTypes.BookingStatus.Paid,
        cancellation,
        amendments,
        theftProtection,
        collisionDamageWaiver,
        fullInsurance,
        additionalDriver,
        price: basePrice,
        isDeposit: payDeposit,
      }

      if (adRequired && additionalDriver && addtionalDriverBirthDate) {
        _additionalDriver = {
          fullName: additionalDriverfullName,
          email: addtionalDriverEmail,
          phone: additionalDriverPhone,
          birthDate: addtionalDriverBirthDate,
        }
      }

      const payload: bookcarsTypes.CheckoutPayload = {
        driver,
        booking,
        additionalDriver: _additionalDriver,
        payLater,
        paymentIntentId,
        customerId
      }

      const status = await BookingService.checkout(payload)

      if (status === 200) {
        setLoading(false)
        setFormVisible(false)
        setSuccess(true)
      } else {
        _error()
      }
    } catch (err) {
      _error(err)
    }
  }

  const iconSize = 18
  const iconColor = '#000'
  const _fr = bookcarsHelper.isFrench(language)
  const _format = _fr ? 'eee d LLL yyyy kk:mm' : 'eee, d LLL yyyy, p'
  const days = bookcarsHelper.days(from, to)

  return (
    <Layout style={styles.master} navigation={navigation} onLoad={onLoad} reload={reload} route={route}>
      {!visible && <Indicator style={{ marginVertical: 10 }} />}
      {visible && car && from && to && pickupLocation && dropOffLocation && (
        <>
          {formVisible && (
            <CarList
              route={route}
              navigation={navigation}
              pickupLocation={pickupLocation._id}
              dropOffLocation={dropOffLocation._id}
              cars={[car]}
              from={from}
              to={to}
              hidePrice
              routeName="Checkout"
              // header={<Text style={styles.header}>{i18n.t('CREATE_BOOKING')}</Text>}
              footerComponent={
                <View style={styles.contentContainer}>
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <MaterialIcons name="event-seat" size={iconSize} color={iconColor} />
                      <Text style={styles.sectionHeaderText}>{i18n.t('BOOKING_OPTIONS')}</Text>
                    </View>

                    <View style={styles.extra}>
                      <Switch
                        disabled={car.cancellation === -1 || car.cancellation === 0}
                        textStyle={styles.extraSwitch}
                        label={i18n.t('CANCELLATION')}
                        value={cancellation}
                        onValueChange={onCancellationChange}
                      />
                      <Text style={styles.extraText}>{cancellationText}</Text>
                    </View>

                    <View style={styles.extra}>
                      <Switch
                        disabled={car.amendments === -1 || car.amendments === 0}
                        textStyle={styles.extraSwitch}
                        label={i18n.t('AMENDMENTS')}
                        value={amendments}
                        onValueChange={onAmendmentsChange}
                      />
                      <Text style={styles.extraText}>{amendmentsText}</Text>
                    </View>

                    <View style={styles.extra}>
                      <Switch
                        disabled={car.theftProtection === -1 || car.theftProtection === 0}
                        textStyle={styles.extraSwitch}
                        label={i18n.t('THEFT_PROTECTION')}
                        value={theftProtection}
                        onValueChange={onTheftProtectionChange}
                      />
                      <Text style={styles.extraText}>{theftProtectionText}</Text>
                    </View>

                    <View style={styles.extra}>
                      <Switch
                        disabled={car.collisionDamageWaiver === -1 || car.collisionDamageWaiver === 0}
                        textStyle={styles.extraSwitch}
                        label={i18n.t('COLLISION_DAMAGE_WAVER')}
                        value={collisionDamageWaiver}
                        onValueChange={onCollisionDamageWaiverChange}
                      />
                      <Text style={styles.extraText}>{collisionDamageWaiverText}</Text>
                    </View>

                    <View style={styles.extra}>
                      <Switch
                        disabled={car.fullInsurance === -1 || car.fullInsurance === 0}
                        textStyle={styles.extraSwitch}
                        label={i18n.t('FULL_INSURANCE')}
                        value={fullInsurance}
                        onValueChange={onFullInsuranceChange}
                      />
                      <Text style={styles.extraText}>{fullInsuranceText}</Text>
                    </View>

                    <View style={styles.extra}>
                      <Switch
                        disabled={car.additionalDriver === -1}
                        textStyle={styles.extraSwitch}
                        label={i18n.t('ADDITIONAL_DRIVER')}
                        value={additionalDriver}
                        onValueChange={onAdditionalDriverChange}
                      />
                      <Text style={styles.extraText}>{additionalDriverText}</Text>
                    </View>
                  </View>

                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <MaterialIcons name="directions-car" size={iconSize} color={iconColor} />
                      <Text style={styles.sectionHeaderText}>{i18n.t('BOOKING_DETAILS')}</Text>
                    </View>

                    <Text style={styles.detailTitle}>{i18n.t('DAYS')}</Text>
                    <Text style={styles.detailText}>
                      {`${helper.getDaysShort(bookcarsHelper.days(from, to))} (${bookcarsHelper.capitalize(format(from, _format, { locale }))} - ${bookcarsHelper.capitalize(
                        format(to, _format, { locale }),
                      )})`}
                    </Text>

                    <Text style={styles.detailTitle}>{i18n.t('PICKUP_LOCATION')}</Text>
                    <Text style={styles.detailText}>{pickupLocation.name}</Text>

                    <Text style={styles.detailTitle}>{i18n.t('DROP_OFF_LOCATION')}</Text>
                    <Text style={styles.detailText}>{dropOffLocation.name}</Text>

                    <Text style={styles.detailTitle}>{i18n.t('CAR')}</Text>
                    <Text style={styles.detailText}>{`${car.name} (${bookcarsHelper.formatPrice(price / days, currencySymbol, language)}${i18n.t('DAILY')})`}</Text>

                    <Text style={styles.detailTitle}>{i18n.t('SUPPLIER')}</Text>
                    <View style={styles.supplier}>
                      <Image
                        style={styles.supplierImg}
                        source={{
                          uri: bookcarsHelper.joinURL(env.CDN_USERS, car.supplier.avatar),
                        }}
                      />
                      <Text style={styles.supplierText} numberOfLines={2} ellipsizeMode="tail">{car.supplier.fullName}</Text>
                    </View>

                    <Text style={styles.detailTitle}>{i18n.t('COST')}</Text>
                    <Text style={styles.detailTextBold}>{bookcarsHelper.formatPrice(price, currencySymbol, language)}</Text>
                  </View>

                  {!authenticated && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <MaterialIcons name="person" size={iconSize} color={iconColor} />
                        <Text style={styles.sectionHeaderText}>{i18n.t('DRIVER_DETAILS')}</Text>
                      </View>

                      <TextInput
                        ref={fullNameRef}
                        style={styles.component}
                        label={i18n.t('FULL_NAME')}
                        value={fullName}
                        error={fullNameRequired}
                        helperText={(fullNameRequired && i18n.t('REQUIRED')) || ''}
                        onChangeText={onChangeFullName}
                        backgroundColor="#fbfbfb"
                      />

                      <TextInput
                        ref={emailRef}
                        style={styles.component}
                        label={i18n.t('EMAIL')}
                        value={email}
                        error={emailRequired || !emailValid || emailError}
                        helperText={
                          (emailInfo && i18n.t('EMAIL_INFO'))
                          || (emailRequired && i18n.t('REQUIRED'))
                          || (!emailValid && i18n.t('EMAIL_NOT_VALID'))
                          || (emailError && i18n.t('BOOKING_EMAIL_ALREADY_REGISTERED'))
                          || ''
                        }
                        onChangeText={onChangeEmail}
                        backgroundColor="#fbfbfb"
                      />

                      <TextInput
                        ref={phoneRef}
                        style={styles.component}
                        label={i18n.t('PHONE')}
                        value={phone}
                        error={phoneRequired || !phoneValid}
                        helperText={(phoneInfo && i18n.t('PHONE_INFO')) || (phoneRequired && i18n.t('REQUIRED')) || (!phoneValid && i18n.t('PHONE_NOT_VALID')) || ''}
                        onChangeText={onChangePhone}
                        backgroundColor="#fbfbfb"
                      />

                      <DateTimePicker
                        mode="date"
                        locale={language}
                        style={styles.date}
                        label={i18n.t('BIRTH_DATE')}
                        value={birthDate}
                        error={birthDateRequired || !birthDateValid}
                        helperText={(birthDateRequired && i18n.t('REQUIRED')) || (!birthDateValid && helper.getBirthDateError(car.minimumAge)) || ''}
                        onChange={onChangeBirthDate}
                        backgroundColor="#fbfbfb"
                      />

                      <Switch style={styles.component} textStyle={styles.tosText} label={i18n.t('ACCEPT_TOS')} value={tosChecked} onValueChange={onChangeToS} />
                    </View>
                  )}

                  {car.supplier.licenseRequired && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <MaterialIcons name="payment" size={iconSize} color={iconColor} />
                        <Text style={styles.sectionHeaderText}>{i18n.t('DRIVER_LICENSE')}</Text>
                      </View>

                      <DriverLicense
                        user={user || undefined}
                        hideLabel
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
                    </View>
                  )}

                  {(adManuallyChecked && additionalDriver) && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <MaterialIcons name="person" size={iconSize} color={iconColor} />
                        <Text style={styles.sectionHeaderText}>{i18n.t('ADDITIONAL_DRIVER')}</Text>
                      </View>

                      <TextInput
                        ref={_fullNameRef}
                        style={styles.component}
                        label={i18n.t('FULL_NAME')}
                        value={additionalDriverfullName}
                        error={adRequired && additionalDriverFullNameRequired}
                        helperText={(adRequired && additionalDriverFullNameRequired && i18n.t('REQUIRED')) || ''}
                        onChangeText={(text: string) => {
                          setAdditionalDriverFullName(text)
                          setAdditionalDriverFullNameRequired(false)
                          setError(false)
                        }}
                        backgroundColor="#fbfbfb"
                      />

                      <TextInput
                        ref={_emailRef}
                        style={styles.component}
                        label={i18n.t('EMAIL')}
                        value={addtionalDriverEmail}
                        error={adRequired && (additionalDriverEmailRequired || !additionalDriverEmailValid)}
                        helperText={(adRequired && additionalDriverEmailRequired && i18n.t('REQUIRED')) || (adRequired && !additionalDriverEmailValid && i18n.t('EMAIL_NOT_VALID')) || ''}
                        onChangeText={(text: string) => {
                          setAdditionalDriverEmail(text)
                          setAdditionalDriverEmailRequired(false)
                          setAdditionalDriverEmailValid(true)
                          setError(false)
                        }}
                        backgroundColor="#fbfbfb"
                      />

                      <TextInput
                        ref={_phoneRef}
                        style={styles.component}
                        label={i18n.t('PHONE')}
                        value={additionalDriverPhone}
                        error={adRequired && (additionalDriverPhoneRequired || !additionalDriverPhoneValid)}
                        helperText={(adRequired && additionalDriverPhoneRequired && i18n.t('REQUIRED')) || (adRequired && !additionalDriverPhoneValid && i18n.t('PHONE_NOT_VALID')) || ''}
                        onChangeText={(text: string) => {
                          setAdditionalDriverPhone(text)
                          setAdditionalDriverPhoneRequired(false)
                          setAdditionalDriverPhoneValid(true)
                          setError(false)
                        }}
                        backgroundColor="#fbfbfb"
                      />

                      <DateTimePicker
                        mode="date"
                        locale={language}
                        style={styles.date}
                        label={i18n.t('BIRTH_DATE')}
                        value={addtionalDriverBirthDate}
                        error={adRequired && (additionalDriverBirthDateRequired || !additionalDriverBirthDateValid)}
                        helperText={(adRequired && additionalDriverBirthDateRequired && i18n.t('REQUIRED')) || (adRequired && !additionalDriverBirthDateValid && helper.getBirthDateError(car.minimumAge)) || ''}
                        onChange={(date: Date | undefined) => {
                          setAdditionalDriverBirthDate(date)
                          setAdditionalDriverBirthDateRequired(false)
                          setAdditionalDriverBirthDateValid(true)
                          setError(false)
                        }}
                        backgroundColor="#fbfbfb"
                      />
                    </View>
                  )}

                  {car.supplier.payLater && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <MaterialIcons name="settings" size={iconSize} color={iconColor} />
                        <Text style={styles.sectionHeaderText}>{i18n.t('PAYMENT_OPTIONS')}</Text>
                      </View>

                      <RadioButton
                        label={i18n.t('PAY_LATER')}
                        checked={payLater}
                        onValueChange={(checked: boolean) => {
                          setPayLater(checked)
                          setPayDeposit(!checked)
                        }}
                      />
                      <Text style={styles.paymentInfo}>{i18n.t('PAY_LATER_INFO')}</Text>

                      {
                        car.deposit > 0 && (
                          <>
                            <RadioButton
                              label={i18n.t('PAY_DEPOSIT')}
                              checked={payDeposit}
                              onValueChange={(checked: boolean) => {
                                setPayDeposit(checked)
                                setPayLater(!checked)
                              }}
                            />
                            <Text style={styles.paymentInfo}>{i18n.t('PAY_ONLINE_INFO')}</Text>
                          </>
                        )}

                      <RadioButton
                        label={i18n.t('PAY_ONLINE')}
                        checked={!payLater && !payDeposit}
                        onValueChange={(checked: boolean) => {
                          setPayLater(!checked)
                          setPayDeposit(!checked)
                        }}
                      />
                      <Text style={styles.paymentInfo}>{i18n.t('PAY_ONLINE_INFO')}</Text>
                    </View>
                  )}

                  <View style={styles.footer}>
                    <Button style={styles.component} label={i18n.t('BOOK_NOW')} onPress={handleCheckout} />

                    <View style={styles.error}>
                      {error && <Error message={i18n.t('FIX_ERRORS')} />}
                      {tosError && <Error message={i18n.t('TOS_ERROR')} />}
                      {licenseRequired && <Error message={i18n.t('LICENSE_REQUIRED')} />}
                    </View>
                  </View>
                </View>
              }
            />
          )}
          {success && (
            <View style={styles.sucess}>
              <Text style={styles.sucessText}>{payLater ? i18n.t('PAY_LATER_SUCCESS') : i18n.t('BOOKING_SUCCESS')}</Text>
              <Link
                style={styles.sucessLink}
                label={i18n.t('GO_TO_HOME')}
                onPress={() => {
                  navigation.navigate('Home', { d: new Date().getTime() })
                }}
              />
            </View>
          )}
          {loading && <Backdrop message={i18n.t('PLEASE_WAIT')} />}
        </>
      )}
    </Layout>
  )
}

const styles = StyleSheet.create({
  master: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flex: 1,
    textAlign: 'center',
    textTransform: 'capitalize',
    fontSize: 27,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
    marginRight: 7,
    marginLeft: 7,
    padding: 5,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d9d8d9',
    borderRadius: 5,
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    flexGrow: 1,
  },
  contentContainer: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
  },
  section: {
    alignSelf: 'stretch',
    backgroundColor: '#fbfbfb',
    borderWidth: 1,
    borderColor: '#d9d8d9',
    borderRadius: 5,
    marginTop: 15,
    marginRight: 10,
    marginLeft: 10,
    padding: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionHeaderText: {
    color: '#444',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 5,
  },
  extra: {
    flexDirection: 'column',
  },
  extraSwitch: {
    fontWeight: '600',
    fontSize: 13,
  },
  extraText: {
    color: 'rgba(0, 0, 0, 0.35)',
    fontSize: 12,
    flex: 1,
    flexWrap: 'wrap',
    marginLeft: 53,
    marginTop: -3,
  },
  detailTitle: {
    alignSelf: 'stretch',
    alignItems: 'center',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  detailText: {
    color: 'rgba(0, 0, 0, 0.35)',
    fontSize: 12,
    marginBottom: 10,
  },
  detailTextBold: {
    fontSize: 15,
    fontWeight: '700',
  },
  supplier: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-start',
    flex: 1,
  },
  supplierImg: {
    width: env.SUPPLIER_IMAGE_WIDTH,
    height: env.SUPPLIER_IMAGE_HEIGHT,
    resizeMode: 'contain',
  },
  supplierText: {
    color: '#a1a1a1',
    fontSize: 10,
    marginLeft: 5,
    width: 200,
  },
  component: {
    alignSelf: 'stretch',
    marginBottom: 10,
  },
  tosText: {
    fontSize: 12,
  },
  date: {
    alignSelf: 'stretch',
    marginBottom: 25,
  },
  paymentInfo: {
    color: 'rgba(0, 0, 0, 0.35)',
    fontSize: 12,
    marginLeft: 25,
  },
  payment: {
    alignSelf: 'stretch',
    backgroundColor: '#e5efe5',
    borderWidth: 1,
    borderColor: '#d9d8d9',
    borderRadius: 5,
    marginTop: 45,
    marginRight: 10,
    marginLeft: 10,
    padding: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentHeader: {
    alignSelf: 'stretch',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#1c8901',
    borderRadius: 5,
    marginTop: -58,
    marginBottom: 15,
    padding: 5,
  },
  paymentImage: {
    marginBottom: 15,
  },
  securePaymentInfo: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  securePaymentInfoText: {
    fontSize: 13,
    color: '#1c8901',
    marginLeft: 5,
  },
  totalText: {
    color: '#1c8901',
    fontSize: 22,
    fontWeight: '700',
    marginRight: 7,
  },
  costText: {
    color: '#1c8901',
    fontSize: 22,
    fontWeight: '700',
  },
  footer: {
    alignSelf: 'stretch',
    marginTop: 15,
    marginRight: 10,
    marginBottom: 40,
    marginLeft: 10,
    alignItems: 'center',
  },
  sucess: {
    margin: 10,
  },
  sucessText: {
    fontSize: 14,
    color: 'rgba(0, 0, 0, 0.8)',
    marginBottom: 10,
  },
  sucessLink: {
    fontSize: 14,
  },
  error: {
    marginTop: 10,
  },
})

export default CheckoutScreen
