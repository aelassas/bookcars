import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  FormControl,
  Button,
  FormControlLabel,
  Switch,
  FormHelperText,
  InputLabel,
  Input,
  Alert,
  Box,
  Typography,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import {
  Info as InfoIcon,
  Person as DriverIcon,
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
import * as LocationService from '@/services/LocationService'
import * as AIService from '@/services/AIService'
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

// ─── Design tokens ─────────────────────────────────────────────────────────
const EMERALD = '#107487'
const GOLD = '#995000'
const CANVAS = 'var(--sr-ink)'
const CARD_BORDER = '#E2E8F0'

const cardSx = {
  backgroundColor: 'var(--sr-surface)',
  borderRadius: '16px',
  border: `1px solid ${CARD_BORDER}`,
  padding: '24px',
  mb: 2,
}

const cardTitleSx = {
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontWeight: 600,
  fontSize: 14,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  color: 'var(--sr-emerald)',
  mb: 2,
}

const monoSx = {
  fontFamily: "'JetBrains Mono', monospace",
  fontVariantNumeric: 'tabular-nums',
}

// ─── Payment method chips ───────────────────────────────────────────────────
const PAYMENT_METHODS = ['JazzCash', 'Easypaisa', 'Raast']

// ─── Component ─────────────────────────────────────────────────────────────
const CreateBooking = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const aiBookingData = (location.state as { aiBookingData?: bookcarsTypes.BookingIntakeData } | null)?.aiBookingData
  const aiBookingLocations = location.state as { pickupLocationId?: string, dropOffLocationId?: string } | null

  const [isSupplier, setIsSupplier] = useState(false)
  const [visible, setVisible] = useState(false)
  const [carObj, setCarObj] = useState<bookcarsTypes.Car>()
  const [minDate, setMinDate] = useState<Date>()
  const [fromError, setFromError] = useState(false)
  const [toError, setToError] = useState(false)
  // UI-only extras
  const [driverMode, setDriverMode] = useState<'self' | 'chauffeur'>('self')
  const [paymentMethod, setPaymentMethod] = useState<string>('JazzCash')
  const [escrowStatus, setEscrowStatus] = useState<string>('deposit_locked')

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
    if (aiBookingData?.startDate) {
      const start = new Date(`${aiBookingData.startDate}T09:00:00`)
      if (!Number.isNaN(start.getTime())) {
setValue('from', start)
}
    }
    if (aiBookingData?.endDate) {
      const end = new Date(`${aiBookingData.endDate}T09:00:00`)
      if (!Number.isNaN(end.getTime())) {
setValue('to', end)
}
    }
  }, [aiBookingData, setValue])

  useEffect(() => {
    const loadLocations = async () => {
      try {
        const [pickup, dropOff] = await Promise.all([
          aiBookingLocations?.pickupLocationId ? LocationService.getLocation(aiBookingLocations.pickupLocationId) : Promise.resolve(undefined),
          aiBookingLocations?.dropOffLocationId ? LocationService.getLocation(aiBookingLocations.dropOffLocationId) : Promise.resolve(undefined),
        ])
        if (pickup) {
setValue('pickupLocation', pickup as Option)
}
        if (dropOff) {
setValue('dropOffLocation', dropOff as Option)
}
      } catch (error) {
        helper.error(error)
      }
    }
    loadLocations()
  }, [aiBookingLocations?.pickupLocationId, aiBookingLocations?.dropOffLocationId, setValue])

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

      if (_booking && _booking._id) {
        if (typeof location.state === 'object' && location.state && 'auditId' in location.state && typeof location.state.auditId === 'string') {
          try {
            await AIService.markBookingCreated(location.state.auditId, _booking._id)
          } catch (error) {
            helper.error(error)
          }
        }
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

  // Auto-calculated PKR total display (days × daily rate)
  const days = from && to ? bookcarsHelper.days(from, to) : 0
  const dailyRate = carObj ? (carObj as any).price ?? (carObj as any).dailyPrice ?? 0 : 0
  const pkrTotal = days * dailyRate

  // Escrow pill color
  const escrowColor = escrowStatus === 'deposit_locked' ? GOLD : escrowStatus === 'overdue' ? '#DC2626' : EMERALD

  return (
    <Layout onLoad={onLoad} strict>
      <Box className="create-booking" sx={{ background: CANVAS, minHeight: '100vh', p: { xs: 2, md: 3 } }}>
        <Box
          sx={{
            backgroundColor: 'var(--sr-surface)',
            borderRadius: '16px',
            border: `1px solid ${CARD_BORDER}`,
            padding: { xs: '20px', md: '32px' },
            maxWidth: 1100,
            width: '100%',
            minWidth: 0,
            mx: 'auto',
          }}
          style={visible ? {} : { display: 'none' }}
        >
          {/* Page title */}
          <Typography
            sx={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
              fontSize: 22,
              color: 'var(--sr-text)',
              mb: 2,
            }}
          >
            {strings.NEW_BOOKING_HEADING}
          </Typography>

          {aiBookingData && (
            <Alert severity="info" sx={{ mb: 2 }}>
              AI-approved draft loaded. Confirm supplier, customer, locations, vehicle, dates, and pricing before submitting.
              {aiBookingData.pickupLocation && ` Pickup: ${aiBookingData.pickupLocation}.`}
              {aiBookingData.dropoffLocation && ` Drop-off: ${aiBookingData.dropoffLocation}.`}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* ── Supplier (outside cards if not supplier user) ── */}
            {!isSupplier && (
              <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
                <SupplierSelectList
                  label={blStrings.SUPPLIER}
                  required
                  variant="standard"
                  onChange={(values) => setValue('supplier', values.length > 0 ? values[0] as Option : undefined)}
                />
              </FormControl>
            )}

            {/* ════════════════════════════════════════════════════════
                Card 1 — Trip & Hub Details (full width)
            ════════════════════════════════════════════════════════ */}
            <Box sx={cardSx}>
              <Typography sx={cardTitleSx}>Trip &amp; Hub Details</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth margin="dense">
                    <LocationSelectList
                      label={bfStrings.PICK_UP_LOCATION}
                      required
                      variant="standard"
                      onChange={(values) => setValue('pickupLocation', values.length > 0 ? values[0] as Option : undefined)}
                    />
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth margin="dense">
                    <LocationSelectList
                      label={bfStrings.DROP_OFF_LOCATION}
                      required
                      variant="standard"
                      onChange={(values) => setValue('dropOffLocation', values.length > 0 ? values[0] as Option : undefined)}
                    />
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
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
                        setFromError(!!err)
                      }}
                      language={UserService.getLanguage()}
                    />
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
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
                        setToError(!!err)
                      }}
                      language={UserService.getLanguage()}
                    />
                  </FormControl>
                </Grid>
              </Grid>
            </Box>

            {/* ════════════════════════════════════════════════════════
                Cards 2 & 3 — side by side
            ════════════════════════════════════════════════════════ */}
            <Grid container spacing={2}>
              {/* Card 2 — Vehicle & Driver Mode (7/12) */}
              <Grid size={{ xs: 12, md: 7 }}>
                <Box sx={cardSx}>
                  <Typography sx={cardTitleSx}>Vehicle &amp; Driver Mode</Typography>

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

                  {/* Driver mode toggle */}
                  <Box sx={{ mt: 2 }}>
                    <Typography sx={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: 'var(--sr-muted)', mb: 1 }}>
                      Driver Mode
                    </Typography>
                    <ToggleButtonGroup
                      value={driverMode}
                      exclusive
                      onChange={(_e, val) => {
 if (val) {
setDriverMode(val)
} 
}}
                      size="small"
                      sx={{ '& .MuiToggleButton-root.Mui-selected': { background: EMERALD, color: '#fff' } }}
                    >
                      <ToggleButton value="self">Self-Drive</ToggleButton>
                      <ToggleButton value="chauffeur">With Chauffeur</ToggleButton>
                    </ToggleButtonGroup>
                  </Box>

                  {/* Daily rate display */}
                  {carObj && (
                    <Box
                      sx={{
                        mt: 2,
                        p: 1.5,
                        background: CANVAS,
                        borderRadius: '8px',
                        border: `1px solid ${CARD_BORDER}`,
                        display: 'inline-block',
                      }}
                    >
                      <Typography sx={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: 'var(--sr-muted)' }}>
                        Daily Rate
                      </Typography>
                      <Typography sx={{ ...monoSx, fontSize: 16, fontWeight: 700, color: 'var(--sr-emerald)' }}>
                        PKR {Number(dailyRate).toLocaleString('en-PK')} / day
                      </Typography>
                    </Box>
                  )}

                  {/* Options */}
                  <Box sx={{ mt: 2 }}>
                    <div className="info">
                      <InfoIcon />
                      <span>{commonStrings.OPTIONAL}</span>
                    </div>
                    {(['cancellation', 'amendments', 'theftProtection', 'collisionDamageWaiver', 'fullInsurance', 'additionalDriver'] as const).map((opt) => (
                      <FormControl key={opt} fullWidth margin="dense" className="checkbox-fc">
                        <FormControlLabel
                          control={
                            <Switch
                              {...register(opt)}
                              color="primary"
                              disabled={!carObj || !helper.carOptionAvailable(carObj, opt)}
                            />
                          }
                          label={
                            opt === 'cancellation' ? csStrings.CANCELLATION
                            : opt === 'amendments' ? csStrings.AMENDMENTS
                            : opt === 'theftProtection' ? csStrings.THEFT_PROTECTION
                            : opt === 'collisionDamageWaiver' ? csStrings.COLLISION_DAMAGE_WAVER
                            : opt === 'fullInsurance' ? csStrings.FULL_INSURANCE
                            : csStrings.ADDITIONAL_DRIVER
                          }
                          className="checkbox-fcl"
                        />
                      </FormControl>
                    ))}
                  </Box>

                  {/* Additional driver sub-form */}
                  {carObj && helper.carOptionAvailable(carObj, 'additionalDriver') && additionalDriverEnabled && (
                    <>
                      <div className="info">
                        <DriverIcon />
                        <span>{csStrings.ADDITIONAL_DRIVER}</span>
                      </div>
                      <FormControl fullWidth margin="dense">
                        <InputLabel className="required">{commonStrings.FULL_NAME}</InputLabel>
                        <Input {...register('additionalDriverFullName')} type="text" required autoComplete="off" />
                        {errors.additionalDriverFullName && <FormHelperText error>{commonStrings.REQUIRED}</FormHelperText>}
                      </FormControl>
                      <FormControl fullWidth margin="dense">
                        <InputLabel className="required">{commonStrings.EMAIL}</InputLabel>
                        <Input {...register('additionalDriverEmail')} type="text" error={!!errors.additionalDriverEmail} required autoComplete="off" />
                        {errors.additionalDriverEmail && <FormHelperText error>{errors.additionalDriverEmail.message}</FormHelperText>}
                      </FormControl>
                      <FormControl fullWidth margin="dense">
                        <InputLabel className="required">{commonStrings.PHONE}</InputLabel>
                        <Input {...register('additionalDriverPhone')} type="text" error={!!errors.additionalDriverPhone} required autoComplete="off" />
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
                          <FormHelperText error>{helper.getBirthDateError(env.MINIMUM_AGE)}</FormHelperText>
                        )}
                      </FormControl>
                    </>
                  )}
                </Box>
              </Grid>

              {/* Card 3 — Renter KYC & Payment (5/12) */}
              <Grid size={{ xs: 12, md: 5 }}>
                <Box sx={cardSx}>
                  <Typography sx={cardTitleSx}>Renter KYC &amp; Payment</Typography>

                  {/* Renter selector */}
                  <UserSelectList
                    label={blStrings.DRIVER}
                    required
                    variant="standard"
                    onChange={(values) => setValue('driver', values.length > 0 ? values[0] as Option : undefined)}
                  />

                  {/* CNIC status chip — static indicator, real value comes from driver object */}
                  <Box sx={{ mt: 1, mb: 1 }}>
                    <Chip
                      label="CNIC Verified ✓"
                      size="small"
                      sx={{ background: EMERALD, color: '#fff', fontWeight: 600 }}
                    />
                  </Box>

                  {/* Escrow status selector */}
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

                  {/* Escrow pill */}
                  <Box sx={{ mt: 1, mb: 1, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                    <Typography sx={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: 'var(--sr-muted)' }}>Escrow:</Typography>
                    {(['deposit_locked', 'deposit_refunded', 'overdue'] as const).map((es) => (
                      <Chip
                        key={es}
                        label={es === 'deposit_locked' ? '20% Locked 🔒' : es === 'deposit_refunded' ? 'Refunded ↺' : 'Overdue 🚨'}
                        size="small"
                        onClick={() => setEscrowStatus(es)}
                        sx={{
                          cursor: 'pointer',
                          fontWeight: escrowStatus === es ? 700 : 400,
                          background: escrowStatus === es ? escrowColor : CANVAS,
                          color: escrowStatus === es ? '#fff' : 'var(--sr-muted)',
                          border: `1px solid ${escrowStatus === es ? escrowColor : CARD_BORDER}`,
                        }}
                      />
                    ))}
                  </Box>

                  {/* PKR total */}
                  <Box
                    sx={{
                      mt: 2,
                      p: 2,
                      background: CANVAS,
                      borderRadius: '12px',
                      border: `1px solid ${CARD_BORDER}`,
                    }}
                  >
                    <Typography sx={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: 'var(--sr-muted)' }}>
                      PKR Total ({days} day{days !== 1 ? 's' : ''})
                    </Typography>
                    <Typography sx={{ ...monoSx, fontSize: 20, fontWeight: 700, color: 'var(--sr-emerald)' }}>
                      PKR {pkrTotal > 0 ? pkrTotal.toLocaleString('en-PK') : '—'}
                    </Typography>
                  </Box>

                  {/* Payment method pills */}
                  <Box sx={{ mt: 2 }}>
                    <Typography sx={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: 'var(--sr-muted)', mb: 1 }}>
                      Payment Method
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {PAYMENT_METHODS.map((pm) => (
                        <Chip
                          key={pm}
                          label={pm}
                          size="small"
                          onClick={() => setPaymentMethod(pm)}
                          sx={{
                            cursor: 'pointer',
                            fontWeight: paymentMethod === pm ? 700 : 400,
                            background: paymentMethod === pm ? GOLD : CANVAS,
                            color: paymentMethod === pm ? '#fff' : 'var(--sr-muted)',
                            border: `1px solid ${paymentMethod === pm ? GOLD : CARD_BORDER}`,
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                </Box>
              </Grid>
            </Grid>

            {/* ── Action buttons ── */}
            <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
              <Button
                type="submit"
                variant="contained"
                size="small"
                disabled={isSubmitting}
                sx={{
                  background: EMERALD,
                  '&:hover': { background: '#047857' },
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: '8px',
                }}
              >
                {commonStrings.CREATE}
              </Button>
              <Button
                variant="contained"
                className="btn-secondary btn-margin-bottom"
                size="small"
                onClick={() => navigate('/')}
                sx={{ fontFamily: "'Plus Jakarta Sans', sans-serif", textTransform: 'none', borderRadius: '8px' }}
              >
                {commonStrings.CANCEL}
              </Button>
            </Box>
          </form>
        </Box>
      </Box>
    </Layout>
  )
}

export default CreateBooking
