import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Input,
  InputLabel,
  FormControl,
  Button,
  FormControlLabel,
  Switch,
  TextField,
  FormHelperText,
  Box,
  Typography,
  Chip,
  InputAdornment,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import { Info as InfoIcon } from '@mui/icons-material'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings as csStrings } from '@/lang/cars'
import { strings } from '@/lang/create-car'
import * as CarService from '@/services/CarService'
import * as helper from '@/utils/helper'
import Error from '@/components/Error'
import Backdrop from '@/components/SimpleBackdrop'
import Avatar from '@/components/Avatar'
import SupplierSelectList from '@/components/SupplierSelectList'
import LocationSelectList from '@/components/LocationSelectList'
import CarTypeList from '@/components/CarTypeList'
import GearboxList from '@/components/GearboxList'
import SeatsList from '@/components/SeatsList'
import DoorsList from '@/components/DoorsList'
import FuelPolicyList from '@/components/FuelPolicyList'
import CarRangeList from '@/components/CarRangeList'
import MultimediaList from '@/components/MultimediaList'
import DateBasedPriceEditList from '@/components/DateBasedPriceEditList'
import { UserContextType, useUserContext } from '@/context/UserContext'
import { Option, Supplier } from '@/models/common'
import { schema, FormFields, DateBasedPrice } from '@/models/CarForm'

import '@/assets/css/create-car.css'

// ─── Design tokens ────────────────────────────────────────────────────────────
const CARD_SX = {
  backgroundColor: 'var(--sr-surface)',
  borderRadius: '16px',
  border: '1px solid #E2E8F0',
  padding: '24px',
  mb: 3,
}

const SECTION_TITLE_SX = {
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontWeight: 600,
  fontSize: '13px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  color: 'var(--sr-emerald)',
  mb: 2,
}

const MONO_INPUT_SX = {
  '& input': { fontFamily: "'JetBrains Mono', monospace" },
}

type ComplianceStatus = 'PENDING_REVIEW' | 'APPROVED' | 'SUSPENDED'

const compliancePill: Record<ComplianceStatus, { label: string; bg: string; color: string }> = {
  PENDING_REVIEW: { label: 'PENDING REVIEW', bg: 'var(--sr-gold-soft)', color: 'var(--sr-accent-text)' },
  APPROVED: { label: 'APPROVED', bg: '#D1FAE5', color: 'var(--sr-emerald)' },
  SUSPENDED: { label: 'SUSPENDED', bg: '#FEE2E2', color: '#DC2626' },
}

const CreateCar = () => {
  const navigate = useNavigate()
  const { user } = useUserContext() as UserContextType

  const [isSupplier, setIsSupplier] = useState(false)
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [imageSizeError, setImageSizeError] = useState(false)
  const [image, setImage] = useState('')

  // PKR-specific local state (not persisted to backend in this PR)
  const [selfDrive, setSelfDrive] = useState(false)
  const [chauffeur, setChauffeur] = useState(false)
  const [hillRoute, setHillRoute] = useState(false)
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus>('PENDING_REVIEW')
  const [trackerDeviceId, setTrackerDeviceId] = useState('')
  const [smartCardNumber, setSmartCardNumber] = useState('')
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState('')
  const [insuranceExpiry, setInsuranceExpiry] = useState('')
  const [lastInspectionDate, setLastInspectionDate] = useState('')

  // Initialize react-hook-form
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    register,
    getValues,
    clearErrors,
    setFocus,
  } = useForm<FormFields>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: {
      name: '',
      licensePlate: '',
      supplier: undefined,
      minimumAge: String(env.MINIMUM_AGE),
      locations: [],
      dailyPrice: '',
      discountedDailyPrice: '',
      hourlyPrice: '',
      discountedHourlyPrice: '',
      biWeeklyPrice: '',
      discountedBiWeeklyPrice: '',
      weeklyPrice: '',
      discountedWeeklyPrice: '',
      monthlyPrice: '',
      discountedMonthlyPrice: '',
      deposit: '',
      available: true,
      fullyBooked: false,
      comingSoon: false,
      blockOnPay: true,
      type: '',
      gearbox: '',
      seats: '',
      doors: '',
      aircon: false,
      mileage: '',
      fuelPolicy: '',
      cancellation: '',
      amendments: '',
      theftProtection: '',
      collisionDamageWaiver: '',
      fullInsurance: '',
      additionalDriver: '',
      range: '',
      multimedia: [],
      rating: '',
      co2: '',
      isDateBasedPrice: false,
      dateBasedPrices: [],
    }
  })

  // Use watch to track form values
  const isDateBasedPrice = useWatch({ control, name: 'isDateBasedPrice' })
  const dateBasedPrices = useWatch({ control, name: 'dateBasedPrices' })
  const range = useWatch({ control, name: 'range' })
  const multimedia = useWatch({ control, name: 'multimedia' })
  const available = useWatch({ control, name: 'available' })
  const fullyBooked = useWatch({ control, name: 'fullyBooked' })
  const comingSoon = useWatch({ control, name: 'comingSoon' })
  const blockOnPay = useWatch({ control, name: 'blockOnPay' })
  const type = useWatch({ control, name: 'type' })
  const gearbox = useWatch({ control, name: 'gearbox' })
  const seats = useWatch({ control, name: 'seats' })
  const doors = useWatch({ control, name: 'doors' })
  const fuelPolicy = useWatch({ control, name: 'fuelPolicy' })
  const aircon = useWatch({ control, name: 'aircon' })


  const handleBeforeUpload = () => {
    setLoading(true)
  }

  const handleImageChange = (_image: bookcarsTypes.Car | string | null) => {
    setLoading(false)
    setImage(_image as string)

    if (_image !== null) {
      setImageError(false)
    }
  }

  const handleImageValidate = (valid: boolean) => {
    if (!valid) {
      setImageSizeError(true)
      setImageError(false)
      setLoading(false)
    } else {
      setImageSizeError(false)
      setImageError(false)
    }
  }

  const extraToNumber = (extra: string) => (extra === '' ? -1 : Number(extra))

  const getPrice = (price: string) => (price && Number(price)) || null

  const onSubmit = async (data: FormFields) => {
    try {
      if (!image) {
        setImageError(true)
        setImageSizeError(false)
        setLoading(false)
        return
      }

      if (data.licensePlate) {
        const res = await CarService.validateLicensePlate(data.licensePlate)
        if (res === 204) {
          helper.error(null, strings.LICENSE_PLATE_ALREADY_EXISTS)
          return
        }
      }

      const payload: bookcarsTypes.CreateCarPayload = {
        loggedUser: user!._id!,
        name: data.name,
        licensePlate: data.licensePlate || '',
        supplier: data.supplier?._id!,
        minimumAge: Number.parseInt(data.minimumAge, 10),
        locations: data.locations.map((l) => l._id),
        dailyPrice: Number(data.dailyPrice),
        discountedDailyPrice: getPrice(data.discountedDailyPrice || ''),
        hourlyPrice: getPrice(data.hourlyPrice || ''),
        discountedHourlyPrice: getPrice(data.discountedHourlyPrice || ''),
        biWeeklyPrice: getPrice(data.biWeeklyPrice || ''),
        discountedBiWeeklyPrice: getPrice(data.discountedBiWeeklyPrice || ''),
        weeklyPrice: getPrice(data.weeklyPrice || ''),
        discountedWeeklyPrice: getPrice(data.discountedWeeklyPrice || ''),
        monthlyPrice: getPrice(data.monthlyPrice || ''),
        discountedMonthlyPrice: getPrice(data.discountedMonthlyPrice || ''),
        deposit: Number(data.deposit),
        available: data.available,
        fullyBooked: data.fullyBooked,
        comingSoon: data.comingSoon,
        blockOnPay: data.blockOnPay,
        type: data.type,
        gearbox: data.gearbox,
        aircon: data.aircon,
        image,
        seats: Number.parseInt(data.seats, 10),
        doors: Number.parseInt(data.doors, 10),
        fuelPolicy: data.fuelPolicy,
        mileage: extraToNumber(data.mileage || ''),
        cancellation: extraToNumber(data.cancellation || ''),
        amendments: extraToNumber(data.amendments || ''),
        theftProtection: extraToNumber(data.theftProtection || ''),
        collisionDamageWaiver: extraToNumber(data.collisionDamageWaiver || ''),
        fullInsurance: extraToNumber(data.fullInsurance || ''),
        additionalDriver: extraToNumber(data.additionalDriver || ''),
        range: data.range,
        multimedia: data.multimedia || [],
        rating: data.rating ? Number(data.rating) : undefined,
        co2: data.co2 ? Number(data.co2) : undefined,
        isDateBasedPrice: data.isDateBasedPrice,
        dateBasedPrices: data.dateBasedPrices || [],
      }

      const car = await CarService.create(payload)

      if (car && car._id) {
        navigate('/cars')
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

  const onLoad = (user?: bookcarsTypes.User) => {
    if (user && user.verified) {
      setVisible(true)

      if (user.type === bookcarsTypes.RecordType.Supplier) {
        setValue('supplier', {
          _id: user._id,
          name: user.fullName,
          image: user.avatar,
        } as Supplier)
        setIsSupplier(true)
      }
    }
  }

  const handleCancel = async () => {
    if (image) {
      await CarService.deleteTempImage(image)
    }
    navigate('/cars')
  }

  return (
    <Layout onLoad={onLoad} strict>
      <Box sx={{ backgroundColor: 'var(--sr-surface-raised)', minHeight: '100vh', p: 3 }}>
        <form onSubmit={handleSubmit(onSubmit, onError)} style={visible ? {} : { display: 'none' }}>
          <Typography variant="h5" sx={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: 'var(--sr-text)', mb: 3 }}>
            {strings.NEW_CAR_HEADING}
          </Typography>

          {/* Avatar */}
          <Box sx={{ ...CARD_SX, mb: 3 }}>
            <Avatar
              type={bookcarsTypes.RecordType.Car}
              mode="create"
              record={null}
              size="large"
              readonly={false}
              onBeforeUpload={handleBeforeUpload}
              onChange={handleImageChange}
              onValidate={handleImageValidate}
              color="disabled"
              className="avatar-ctn"
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, color: 'var(--sr-muted)' }}>
              <InfoIcon fontSize="small" />
              <Typography variant="caption">{strings.RECOMMENDED_IMAGE_SIZE}</Typography>
            </Box>
          </Box>

          {/* ── Card 1: Basic Vehicle Specs ── */}
          <Box sx={CARD_SX}>
            <Typography sx={SECTION_TITLE_SX}>Basic Vehicle Specs</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth margin="dense">
                  <InputLabel className="required">{strings.NAME}</InputLabel>
                  <Input type="text" {...register('name')} required autoComplete="off" />
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth margin="dense">
                  <InputLabel>{strings.LICENSE_PLATE}</InputLabel>
                  <Input
                    type="text"
                    {...register('licensePlate')}
                    autoComplete="off"
                    sx={{ fontFamily: "'JetBrains Mono', monospace" }}
                  />
                </FormControl>
              </Grid>

              {!isSupplier && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth margin="dense">
                    <SupplierSelectList
                      label={strings.SUPPLIER}
                      required
                      variant="standard"
                      onChange={(values) => setValue('supplier', values.length > 0 ? values[0] as Supplier : undefined)}
                    />
                  </FormControl>
                </Grid>
              )}

              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth margin="dense">
                  <LocationSelectList
                    label={strings.LOCATIONS}
                    multiple
                    required
                    variant="standard"
                    onChange={(values) => setValue('locations', values as Option[])}
                  />
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth margin="dense">
                  <CarTypeList
                    label={strings.CAR_TYPE}
                    variant="standard"
                    required
                    value={type}
                    onChange={(value) => setValue('type', value)}
                  />
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth margin="dense">
                  <GearboxList
                    label={strings.GEARBOX}
                    variant="standard"
                    required
                    value={gearbox}
                    onChange={(value) => setValue('gearbox', value)}
                  />
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth margin="dense">
                  <SeatsList
                    label={strings.SEATS}
                    variant="standard"
                    required
                    value={seats}
                    onChange={(value) => setValue('seats', value.toString())}
                  />
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth margin="dense">
                  <DoorsList
                    label={strings.DOORS}
                    variant="standard"
                    required
                    value={doors}
                    onChange={(value) => setValue('doors', value.toString())}
                  />
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth margin="dense">
                  <FuelPolicyList
                    label={csStrings.FUEL_POLICY}
                    variant="standard"
                    required
                    value={fuelPolicy}
                    onChange={(value) => setValue('fuelPolicy', value)}
                  />
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth margin="dense">
                  <CarRangeList
                    label={strings.CAR_RANGE}
                    variant="standard"
                    required
                    value={range}
                    onChange={(value) => setValue('range', value)}
                  />
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth margin="dense">
                  <TextField
                    label={`${csStrings.MILEAGE} (${csStrings.MILEAGE_UNIT})`}
                    {...register('mileage')}
                    variant="standard"
                    autoComplete="off"
                    error={!!errors.mileage}
                    helperText={errors.mileage?.message}
                    sx={MONO_INPUT_SX}
                    onChange={() => {
 if (errors.mileage) {
clearErrors('mileage')
} 
}}
                  />
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth margin="dense">
                  <TextField
                    label={strings.CO2}
                    {...register('co2')}
                    variant="standard"
                    autoComplete="off"
                    error={!!errors.co2}
                    helperText={errors.co2?.message}
                    onChange={() => {
 if (errors.co2) {
clearErrors('co2')
} 
}}
                  />
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth margin="dense">
                  <TextField
                    label={strings.RATING}
                    {...register('rating')}
                    variant="standard"
                    autoComplete="off"
                    slotProps={{ htmlInput: { type: 'number', min: 1, max: 5, step: 0.01 } }}
                  />
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth margin="dense">
                  <InputLabel className="required">{strings.MINIMUM_AGE}</InputLabel>
                  <Input
                    type="text"
                    required
                    {...register('minimumAge')}
                    error={!!errors.minimumAge}
                    autoComplete="off"
                    onChange={() => {
 if (errors.minimumAge) {
clearErrors('minimumAge')
} 
}}
                  />
                  {errors.minimumAge && <FormHelperText error>{errors.minimumAge.message}</FormHelperText>}
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth margin="dense">
                  <MultimediaList
                    label={strings.MULTIMEDIA}
                    value={multimedia as bookcarsTypes.CarMultimedia[]}
                    onChange={(value) => {
                      const currentValue = getValues('multimedia')
                      if (JSON.stringify(currentValue) !== JSON.stringify(value)) {
                        setValue('multimedia', value)
                      }
                    }}
                  />
                </FormControl>
              </Grid>

              {/* Toggles row */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControlLabel
                  control={<Switch checked={aircon} onChange={(e) => setValue('aircon', e.target.checked)} sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--sr-emerald)' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#059669' } }} />}
                  label={strings.AIRCON}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControlLabel
                  control={<Switch checked={available} onChange={(e) => setValue('available', e.target.checked)} color="primary" />}
                  label={strings.AVAILABLE}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControlLabel
                  control={<Switch checked={fullyBooked} onChange={(e) => setValue('fullyBooked', e.target.checked)} color="primary" />}
                  label={strings.FULLY_BOOKED}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControlLabel
                  control={<Switch checked={comingSoon} onChange={(e) => setValue('comingSoon', e.target.checked)} color="primary" />}
                  label={strings.COMING_SOON}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControlLabel
                  control={<Switch checked={blockOnPay} onChange={(e) => setValue('blockOnPay', e.target.checked)} color="primary" />}
                  label={strings.BLOCK_ON_PAY}
                />
              </Grid>
            </Grid>
          </Box>

          {/* ── Cards 2 & 3 side by side ── */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {/* Card 2: PKR Pricing & Mileage Caps */}
            <Grid size={{ xs: 12, md: 7 }}>
              <Box sx={{ ...CARD_SX, mb: 0 }}>
                <Typography sx={SECTION_TITLE_SX}>PKR Pricing &amp; Mileage Caps</Typography>

                <FormControl fullWidth margin="dense">
                  <TextField
                    label={'Daily Rate (PKR) *'}
                    {...register('dailyPrice')}
                    error={!!errors.dailyPrice}
                    helperText={errors.dailyPrice?.message}
                    required
                    variant="standard"
                    autoComplete="off"
                    slotProps={{
                      input: { startAdornment: <InputAdornment position="start" sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>Rs</InputAdornment> },
                      htmlInput: { style: { fontFamily: "'JetBrains Mono', monospace", fontSize: '1.1rem' } },
                    }}
                    onChange={() => {
 if (errors.dailyPrice) {
clearErrors('dailyPrice')
} 
}}
                  />
                </FormControl>

                <FormControl fullWidth margin="dense">
                  <TextField
                    label={`${strings.DISCOUNTED_DAILY_PRICE} (PKR)`}
                    {...register('discountedDailyPrice')}
                    variant="standard"
                    autoComplete="off"
                    error={!!errors.discountedDailyPrice}
                    helperText={errors.discountedDailyPrice?.message}
                    sx={MONO_INPUT_SX}
                    onChange={() => {
 if (errors.discountedDailyPrice) {
clearErrors('discountedDailyPrice')
} 
}}
                  />
                </FormControl>

                <FormControl fullWidth margin="dense" className="checkbox-fc">
                  <FormControlLabel
                    control={(
                      <Switch
                        checked={isDateBasedPrice}
                        onChange={(e) => setValue('isDateBasedPrice', e.target.checked)}
                        color="primary"
                      />
                    )}
                    label={strings.IS_DATE_BASED_PRICE}
                    className="checkbox-fcl"
                  />
                </FormControl>

                {isDateBasedPrice && (
                  <DateBasedPriceEditList
                    title={strings.DATE_BASED_PRICES}
                    values={dateBasedPrices as bookcarsTypes.DateBasedPrice[]}
                    onAdd={(value) => {
                      const newValues = [...(dateBasedPrices || []), value]
                      setValue('dateBasedPrices', newValues as DateBasedPrice[])
                    }}
                    onUpdate={(value, index) => {
                      const newValues = [...(dateBasedPrices || [])]
                      newValues[index] = value as DateBasedPrice
                      setValue('dateBasedPrices', newValues as DateBasedPrice[])
                    }}
                    onDelete={(_, index) => {
                      const newValues = [...(dateBasedPrices || [])]
                      newValues.splice(index, 1)
                      setValue('dateBasedPrices', newValues as DateBasedPrice[])
                    }}
                  />
                )}

                {!isDateBasedPrice && (
                  <>
                    <FormControl fullWidth margin="dense">
                      <TextField
                        label={`${strings.HOURLY_PRICE} (PKR)`}
                        {...register('hourlyPrice')}
                        error={!!errors.hourlyPrice}
                        helperText={errors.hourlyPrice?.message}
                        variant="standard"
                        autoComplete="off"
                        sx={MONO_INPUT_SX}
                        onChange={() => {
 if (errors.hourlyPrice) {
clearErrors('hourlyPrice')
} 
}}
                      />
                    </FormControl>
                    <FormControl fullWidth margin="dense">
                      <TextField
                        label={`${strings.WEEKLY_PRICE} (PKR)`}
                        {...register('weeklyPrice')}
                        variant="standard"
                        autoComplete="off"
                        error={!!errors.weeklyPrice}
                        helperText={errors.weeklyPrice?.message}
                        sx={MONO_INPUT_SX}
                        onChange={() => {
 if (errors.weeklyPrice) {
clearErrors('weeklyPrice')
} 
}}
                      />
                    </FormControl>
                    <FormControl fullWidth margin="dense">
                      <TextField
                        label={`${strings.DISCOUNTED_WEEKLY_PRICE} (PKR)`}
                        {...register('discountedWeeklyPrice')}
                        variant="standard"
                        autoComplete="off"
                        error={!!errors.discountedWeeklyPrice}
                        helperText={errors.discountedWeeklyPrice?.message}
                        sx={MONO_INPUT_SX}
                        onChange={() => {
 if (errors.discountedWeeklyPrice) {
clearErrors('discountedWeeklyPrice')
} 
}}
                      />
                    </FormControl>
                    <FormControl fullWidth margin="dense">
                      <TextField
                        label={`${strings.MONTHLY_PRICE} (PKR)`}
                        {...register('monthlyPrice')}
                        variant="standard"
                        autoComplete="off"
                        error={!!errors.monthlyPrice}
                        helperText={errors.monthlyPrice?.message}
                        sx={MONO_INPUT_SX}
                        onChange={() => {
 if (errors.monthlyPrice) {
clearErrors('monthlyPrice')
} 
}}
                      />
                    </FormControl>
                    <FormControl fullWidth margin="dense">
                      <TextField
                        label={`${strings.DISCOUNTED_MONThLY_PRICE} (PKR)`}
                        {...register('discountedMonthlyPrice')}
                        variant="standard"
                        autoComplete="off"
                        error={!!errors.discountedMonthlyPrice}
                        helperText={errors.discountedMonthlyPrice?.message}
                        sx={MONO_INPUT_SX}
                        onChange={() => {
 if (errors.discountedMonthlyPrice) {
clearErrors('discountedMonthlyPrice')
} 
}}
                      />
                    </FormControl>
                    <FormControl fullWidth margin="dense">
                      <TextField
                        label={`${strings.BI_WEEKLY_PRICE} (PKR)`}
                        {...register('biWeeklyPrice')}
                        variant="standard"
                        autoComplete="off"
                        error={!!errors.biWeeklyPrice}
                        helperText={errors.biWeeklyPrice?.message}
                        sx={MONO_INPUT_SX}
                        onChange={() => {
 if (errors.biWeeklyPrice) {
clearErrors('biWeeklyPrice')
} 
}}
                      />
                    </FormControl>
                    <FormControl fullWidth margin="dense">
                      <TextField
                        label={`${strings.DISCOUNTED_BI_WEEKLY_PRICE} (PKR)`}
                        {...register('discountedBiWeeklyPrice')}
                        variant="standard"
                        autoComplete="off"
                        error={!!errors.discountedBiWeeklyPrice}
                        helperText={errors.discountedBiWeeklyPrice?.message}
                        sx={MONO_INPUT_SX}
                        onChange={() => {
 if (errors.discountedBiWeeklyPrice) {
clearErrors('discountedBiWeeklyPrice')
} 
}}
                      />
                    </FormControl>
                  </>
                )}

                <FormControl fullWidth margin="dense">
                  <TextField
                    label={`${csStrings.DEPOSIT} (PKR)`}
                    {...register('deposit')}
                    required
                    variant="standard"
                    autoComplete="off"
                    error={!!errors.deposit}
                    helperText={errors.deposit?.message}
                    sx={MONO_INPUT_SX}
                    onChange={() => {
 if (errors.deposit) {
clearErrors('deposit')
} 
}}
                  />
                </FormControl>

                {/* Insurance extras */}
                <FormControl fullWidth margin="dense">
                  <TextField
                    label={`${csStrings.CANCELLATION} (${commonStrings.CURRENCY})`}
                    {...register('cancellation')}
                    variant="standard"
                    autoComplete="off"
                    error={!!errors.cancellation}
                    helperText={errors.cancellation?.message}
                    sx={MONO_INPUT_SX}
                    onChange={() => {
 if (errors.cancellation) {
clearErrors('cancellation')
} 
}}
                  />
                </FormControl>
                <FormControl fullWidth margin="dense">
                  <TextField
                    label={`${csStrings.AMENDMENTS} (${commonStrings.CURRENCY})`}
                    {...register('amendments')}
                    variant="standard"
                    autoComplete="off"
                    error={!!errors.amendments}
                    helperText={errors.amendments?.message}
                    sx={MONO_INPUT_SX}
                    onChange={() => {
 if (errors.amendments) {
clearErrors('amendments')
} 
}}
                  />
                </FormControl>
                <FormControl fullWidth margin="dense">
                  <TextField
                    label={`${csStrings.THEFT_PROTECTION} (${csStrings.CAR_CURRENCY})`}
                    {...register('theftProtection')}
                    variant="standard"
                    autoComplete="off"
                    error={!!errors.theftProtection}
                    helperText={errors.theftProtection?.message}
                    sx={MONO_INPUT_SX}
                    onChange={() => {
 if (errors.theftProtection) {
clearErrors('theftProtection')
} 
}}
                  />
                </FormControl>
                <FormControl fullWidth margin="dense">
                  <TextField
                    label={`${csStrings.COLLISION_DAMAGE_WAVER} (${csStrings.CAR_CURRENCY})`}
                    {...register('collisionDamageWaiver')}
                    variant="standard"
                    autoComplete="off"
                    error={!!errors.collisionDamageWaiver}
                    helperText={errors.collisionDamageWaiver?.message}
                    sx={MONO_INPUT_SX}
                    onChange={() => {
 if (errors.collisionDamageWaiver) {
clearErrors('collisionDamageWaiver')
} 
}}
                  />
                </FormControl>
                <FormControl fullWidth margin="dense">
                  <TextField
                    label={`${csStrings.FULL_INSURANCE} (${csStrings.CAR_CURRENCY})`}
                    {...register('fullInsurance')}
                    variant="standard"
                    autoComplete="off"
                    error={!!errors.fullInsurance}
                    helperText={errors.fullInsurance?.message}
                    sx={MONO_INPUT_SX}
                    onChange={() => {
 if (errors.fullInsurance) {
clearErrors('fullInsurance')
} 
}}
                  />
                </FormControl>
                <FormControl fullWidth margin="dense">
                  <TextField
                    label={`${csStrings.ADDITIONAL_DRIVER} (${csStrings.CAR_CURRENCY})`}
                    {...register('additionalDriver')}
                    variant="standard"
                    autoComplete="off"
                    error={!!errors.additionalDriver}
                    helperText={errors.additionalDriver?.message}
                    sx={MONO_INPUT_SX}
                    onChange={() => {
 if (errors.additionalDriver) {
clearErrors('additionalDriver')
} 
}}
                  />
                </FormControl>
              </Box>
            </Grid>

            {/* Card 3: Self-Drive & Hill-Route Eligibility */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Box sx={{ ...CARD_SX, mb: 0 }}>
                <Typography sx={SECTION_TITLE_SX}>Self-Drive &amp; Hill-Route Eligibility</Typography>

                <FormControlLabel
                  sx={{ display: 'flex', mb: 2 }}
                  control={(
                    <Switch
                      checked={selfDrive}
                      onChange={(e) => setSelfDrive(e.target.checked)}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--sr-emerald)' },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#059669' },
                      }}
                    />
                  )}
                  label="Self-Drive Eligible"
                />

                <FormControlLabel
                  sx={{ display: 'flex', mb: 2 }}
                  control={<Switch checked={chauffeur} onChange={(e) => setChauffeur(e.target.checked)} color="primary" />}
                  label="With Chauffeur Available"
                />

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <FormControlLabel
                    control={(
                      <Switch
                        checked={hillRoute}
                        onChange={(e) => setHillRoute(e.target.checked)}
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--sr-accent-text)' },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#D97706' },
                        }}
                      />
                    )}
                    label="Hill-Route / 4×4 Approved"
                  />
                  {hillRoute && (
                    <Chip
                      label="Hill-Route 4x4 ✓"
                      size="small"
                      sx={{ background: 'var(--sr-gold-soft)', color: 'var(--sr-accent-text)', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    />
                  )}
                </Box>

                <Typography variant="caption" sx={{ color: 'var(--sr-muted)', display: 'block', mb: 1 }}>
                  <InfoIcon fontSize="inherit" sx={{ mr: 0.5 }} />
                  {commonStrings.OPTIONAL}
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* ── Card 4: Smart Card & Tracker Compliance ── */}
          <Box sx={CARD_SX}>
            <Typography sx={SECTION_TITLE_SX}>Smart Card &amp; Tracker Compliance</Typography>

            {/* 3-way segmented compliance control */}
            <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
              {(Object.keys(compliancePill) as ComplianceStatus[]).map((status) => {
                const pill = compliancePill[status]
                const isActive = complianceStatus === status
                return (
                  <Chip
                    key={status}
                    label={pill.label}
                    onClick={() => setComplianceStatus(status)}
                    sx={{
                      background: isActive ? pill.bg : '#F8FAFC',
                      color: isActive ? pill.color : '#64748B',
                      border: `2px solid ${isActive ? pill.color : '#E2E8F0'}`,
                      fontWeight: isActive ? 700 : 400,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  />
                )
              })}
            </Box>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Tracker Device ID"
                  value={trackerDeviceId}
                  onChange={(e) => setTrackerDeviceId(e.target.value)}
                  variant="standard"
                  autoComplete="off"
                  sx={MONO_INPUT_SX}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Smart Card Number"
                  value={smartCardNumber}
                  onChange={(e) => setSmartCardNumber(e.target.value)}
                  variant="standard"
                  autoComplete="off"
                  sx={MONO_INPUT_SX}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Insurance Policy Number"
                  value={insurancePolicyNumber}
                  onChange={(e) => setInsurancePolicyNumber(e.target.value)}
                  variant="standard"
                  autoComplete="off"
                  sx={MONO_INPUT_SX}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Insurance Expiry Date"
                  value={insuranceExpiry}
                  onChange={(e) => setInsuranceExpiry(e.target.value)}
                  variant="standard"
                  type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Last Inspection Date"
                  value={lastInspectionDate}
                  onChange={(e) => setLastInspectionDate(e.target.value)}
                  variant="standard"
                  type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
            </Grid>
          </Box>

          {/* Action buttons */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Button type="submit" variant="contained" size="small" disabled={loading || isSubmitting}
              sx={{ background: '#107487', '&:hover': { background: '#047857' }, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {commonStrings.CREATE}
            </Button>
            <Button variant="contained" size="small" onClick={handleCancel}
              sx={{ background: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {commonStrings.CANCEL}
            </Button>
          </Box>

          <Box className="form-error">
            {imageError && <Error message={commonStrings.IMAGE_REQUIRED} />}
            {imageSizeError && <Error message={strings.CAR_IMAGE_SIZE_ERROR} />}
          </Box>
        </form>
      </Box>

      {(loading || isSubmitting) && <Backdrop text={commonStrings.PLEASE_WAIT} />}
    </Layout>
  )
}

export default CreateCar
