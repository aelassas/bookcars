import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Input,
  InputLabel,
  FormControl,
  Button,
  Paper,
  FormControlLabel,
  Switch,
  TextField,
  FormHelperText,
} from '@mui/material'
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
import * as helper from '@/common/helper'
import Error from './Error'
import ErrorMessage from '@/components/Error'
import Backdrop from '@/components/SimpleBackdrop'
import NoMatch from './NoMatch'
import Avatar from '@/components/Avatar'
import SupplierSelectList from '@/components/SupplierSelectList'
import LocationSelectList from '@/components/LocationSelectList'
import CarTypeList from '@/components/CarTypeList'
import GearboxList from '@/components/GearboxList'
import SeatsList from '@/components/SeatsList'
import DoorsList from '@/components/DoorsList'
import FuelPolicyList from '@/components/FuelPolicyList'
import MultimediaList from '@/components/MultimediaList'
import CarRangeList from '@/components/CarRangeList'
import DateBasedPriceEditList from '@/components/DateBasedPriceEditList'
import { schema, FormFields, DateBasedPrice, Supplier } from '@/models/CarForm'

import '@/assets/css/create-car.css'

const UpdateCar = () => {
  const navigate = useNavigate()

  const [user, setUser] = useState<bookcarsTypes.User>()
  const [isSupplier, setIsSupplier] = useState(false)
  const [car, setCar] = useState<bookcarsTypes.Car>()
  const [noMatch, setNoMatch] = useState(false)
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)
  const [formError, setFormError] = useState(false)
  const [imageRequired, setImageRequired] = useState(false)
  const [imageSizeError, setImageSizeError] = useState(false)
  const [image, setImage] = useState('')

  // Initialize react-hook-form
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    register,
    getValues,
  } = useForm<FormFields>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      supplier: undefined,
      minimumAge: String(env.MINIMUM_AGE),
      locations: [],
      dailyPrice: '',
      discountedDailyPrice: '',
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
  const {
    supplier,
    locations,
    isDateBasedPrice,
    dateBasedPrices,
    range,
    multimedia,
    available,
    fullyBooked,
    comingSoon,
    type,
    gearbox,
    seats,
    doors,
    fuelPolicy,
    aircon,
  } = useWatch({ control })

  const handleBeforeUpload = () => {
    setLoading(true)
  }

  const handleImageChange = (_image: string) => {
    setLoading(false)
    setImage(_image as string)

    if (_image !== null) {
      setImageRequired(false)
    }
  }

  const handleImageValidate = (valid: boolean) => {
    if (!valid) {
      setImageSizeError(true)
      setImageRequired(false)
      setFormError(false)
      setLoading(false)
    } else {
      setImageSizeError(false)
      setImageRequired(false)
      setFormError(false)
    }
  }

  const extraToString = (extra: number) => (extra === -1 ? '' : String(extra))

  const extraToNumber = (extra?: string) => (extra === undefined || extra === '' ? -1 : Number(extra))

  const getPrice = (price: string) => (price && Number(price)) || null

  const getPriceAsString = (price?: number | null) => (price && price.toString()) || ''

  const onSubmit = async (data: FormFields) => {
    try {
      if (!car || !supplier) {
        helper.error()
        return
      }

      const payload: bookcarsTypes.UpdateCarPayload = {
        loggedUser: user!._id!,
        _id: car._id,
        name: data.name,
        supplier: supplier._id!,
        minimumAge: Number.parseInt(data.minimumAge, 10),
        locations: data.locations.map((l) => l._id),
        dailyPrice: Number(data.dailyPrice),
        discountedDailyPrice: getPrice(data.discountedDailyPrice!),
        biWeeklyPrice: getPrice(data.biWeeklyPrice!),
        discountedBiWeeklyPrice: getPrice(data.discountedBiWeeklyPrice!),
        weeklyPrice: getPrice(data.weeklyPrice!),
        discountedWeeklyPrice: getPrice(data.discountedWeeklyPrice!),
        monthlyPrice: getPrice(data.monthlyPrice!),
        discountedMonthlyPrice: getPrice(data.discountedMonthlyPrice!),
        deposit: Number(data.deposit),
        available: data.available,
        type: data.type,
        gearbox: data.gearbox,
        aircon: data.aircon,
        image,
        seats: Number.parseInt(data.seats, 10),
        doors: Number.parseInt(data.doors, 10),
        fuelPolicy: data.fuelPolicy,
        mileage: extraToNumber(data.mileage),
        cancellation: extraToNumber(data.cancellation),
        amendments: extraToNumber(data.amendments),
        theftProtection: extraToNumber(data.theftProtection),
        collisionDamageWaiver: extraToNumber(data.collisionDamageWaiver),
        fullInsurance: extraToNumber(data.fullInsurance),
        additionalDriver: extraToNumber(data.additionalDriver),
        range: data.range,
        multimedia: data.multimedia!,
        rating: Number(data.rating) || undefined,
        co2: Number(data.co2) || undefined,
        comingSoon: data.comingSoon,
        fullyBooked: data.fullyBooked,
        isDateBasedPrice: data.isDateBasedPrice,
        dateBasedPrices: data.dateBasedPrices || [],
      }

      const status = await CarService.update(payload)

      if (status === 200) {
        helper.info(commonStrings.UPDATED)
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const onLoad = async (_user?: bookcarsTypes.User) => {
    if (_user && _user.verified) {
      setLoading(true)
      setUser(_user)
      setIsSupplier(_user.type === bookcarsTypes.RecordType.Supplier)
      const params = new URLSearchParams(window.location.search)
      if (params.has('cr')) {
        const id = params.get('cr')
        if (id && id !== '') {
          try {
            const _car = await CarService.getCar(id)

            if (_car) {
              if (_user.type === bookcarsTypes.RecordType.Supplier && _user._id !== _car.supplier._id) {
                setLoading(false)
                setNoMatch(true)
                return
              }

              const _supplier = {
                _id: _car.supplier._id as string,
                name: _car.supplier.fullName,
                image: _car.supplier.avatar,
              }

              setCar(_car)
              setImageRequired(!_car.image)
              setValue('name', _car.name)
              setValue('supplier', _supplier)
              setValue('minimumAge', _car.minimumAge.toString())
              const lcs: bookcarsTypes.Option[] = []
              for (const loc of _car.locations) {
                const { _id, name: _name } = loc
                const lc: bookcarsTypes.Option = { _id, name: _name ?? '' }
                lcs.push(lc)
              }
              setValue('locations', lcs)
              setValue('dailyPrice', getPriceAsString(_car.dailyPrice))
              setValue('discountedDailyPrice', getPriceAsString(_car.discountedDailyPrice))
              setValue('biWeeklyPrice', getPriceAsString(_car.biWeeklyPrice))
              setValue('discountedBiWeeklyPrice', getPriceAsString(_car.discountedBiWeeklyPrice))
              setValue('weeklyPrice', getPriceAsString(_car.weeklyPrice))
              setValue('discountedWeeklyPrice', getPriceAsString(_car.discountedWeeklyPrice))
              setValue('monthlyPrice', getPriceAsString(_car.monthlyPrice))
              setValue('discountedMonthlyPrice', getPriceAsString(_car.discountedMonthlyPrice))
              setValue('deposit', _car.deposit.toString())
              setValue('range', _car.range)
              setValue('multimedia', _car.multimedia || [])
              if (_car.rating) {
                setValue('rating', _car.rating.toString())
              }
              if (_car.co2) {
                setValue('co2', _car.co2.toString())
              }
              setValue('available', _car.available)
              setValue('fullyBooked', _car.fullyBooked || false)
              setValue('comingSoon', _car.comingSoon || false)
              setValue('type', _car.type)
              setValue('gearbox', _car.gearbox)
              setValue('aircon', _car.aircon)
              setValue('seats', _car.seats.toString())
              setValue('doors', _car.doors.toString())
              setValue('fuelPolicy', _car.fuelPolicy)
              setValue('mileage', extraToString(_car.mileage))
              setValue('cancellation', extraToString(_car.cancellation))
              setValue('amendments', extraToString(_car.amendments))
              setValue('theftProtection', extraToString(_car.theftProtection))
              setValue('collisionDamageWaiver', extraToString(_car.collisionDamageWaiver))
              setValue('fullInsurance', extraToString(_car.fullInsurance))
              setValue('additionalDriver', extraToString(_car.additionalDriver))
              setValue('isDateBasedPrice', _car.isDateBasedPrice)
              const _dateBasedPrices: DateBasedPrice[] = []
              for (const dbp of _car.dateBasedPrices) {
                const { _id, startDate, endDate, dailyPrice } = dbp
                const db: DateBasedPrice = { _id, startDate: new Date(startDate!), endDate: new Date(endDate!), dailyPrice: dailyPrice.toString() }
                _dateBasedPrices.push(db)
              }
              setValue('dateBasedPrices', _dateBasedPrices)
              setVisible(true)
              setLoading(false)
            } else {
              setLoading(false)
              setNoMatch(true)
            }
          } catch (err) {
            helper.error(err)
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

  return (
    <Layout onLoad={onLoad} strict>
      {!formError && !noMatch && (
        <div className="create-car">
          <Paper className="car-form car-form-wrapper" elevation={10} style={visible ? {} : { display: 'none' }}>
            <form onSubmit={handleSubmit(onSubmit)}>
              <Avatar
                type={bookcarsTypes.RecordType.Car}
                mode="update"
                record={car}
                hideDelete
                size="large"
                readonly={false}
                onBeforeUpload={handleBeforeUpload}
                onChange={handleImageChange}
                onValidate={handleImageValidate}
                color="disabled"
                className="avatar-ctn"
              />

              <div className="info">
                <InfoIcon />
                <span>{strings.RECOMMENDED_IMAGE_SIZE}</span>
              </div>

              <FormControl fullWidth margin="dense">
                <InputLabel className="required">{strings.NAME}</InputLabel>
                <Input
                  type="text"
                  {...register('name')}
                  required
                  autoComplete="off"
                />
              </FormControl>

              {!isSupplier && (
                <FormControl fullWidth margin="dense">
                  <SupplierSelectList
                    label={strings.SUPPLIER}
                    required
                    value={supplier as bookcarsTypes.Option}
                    variant="standard"
                    onChange={(values) => setValue('supplier', values.length > 0 ? values[0] as Supplier : undefined)}
                  />
                </FormControl>
              )}

              <FormControl fullWidth margin="dense">
                <InputLabel className="required">{strings.MINIMUM_AGE}</InputLabel>
                <Input
                  type="text"
                  required
                  {...register('minimumAge')}
                  error={!!errors.minimumAge}
                  autoComplete="off"
                  inputProps={{ inputMode: 'numeric', pattern: '^\\d{2}$' }}
                />
                {errors.minimumAge && (
                  <FormHelperText error>{errors.minimumAge.message}</FormHelperText>
                )}
              </FormControl>

              <FormControl fullWidth margin="dense">
                <LocationSelectList
                  label={strings.LOCATIONS}
                  value={locations as bookcarsTypes.Option[]}
                  multiple
                  required
                  variant="standard"
                  onChange={(values) => setValue('locations', values)}
                />
              </FormControl>

              <FormControl fullWidth margin="dense">
                <TextField
                  label={`${strings.DAILY_PRICE} (${commonStrings.CURRENCY})`}
                  {...register('dailyPrice')}
                  error={!!errors.dailyPrice}
                  helperText={errors.dailyPrice?.message}
                  required
                  variant="standard"
                  autoComplete="off"
                  slotProps={{
                    htmlInput: {
                      inputMode: 'numeric',
                      pattern: '^\\d+(\\.\\d+)?$'
                    }
                  }}
                />
              </FormControl>

              <FormControl fullWidth margin="dense">
                <TextField
                  label={`${strings.DISCOUNTED_DAILY_PRICE} (${commonStrings.CURRENCY})`}
                  {...register('discountedDailyPrice')}
                  variant="standard"
                  required
                  autoComplete="off"
                  slotProps={{
                    htmlInput: {
                      inputMode: 'numeric',
                      pattern: '^\\d+(\\.\\d+)?$'
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
                      label={`${strings.BI_WEEKLY_PRICE} (${commonStrings.CURRENCY})`}
                      {...register('biWeeklyPrice')}
                      variant="standard"
                      autoComplete="off"
                      slotProps={{
                        htmlInput: {
                          inputMode: 'numeric',
                          pattern: '^\\d+(\\.\\d+)?$'
                        }
                      }}
                    />
                  </FormControl>

                  <FormControl fullWidth margin="dense">
                    <TextField
                      label={`${strings.DISCOUNTED_BI_WEEKLY_PRICE} (${commonStrings.CURRENCY})`}
                      {...register('discountedBiWeeklyPrice')}
                      variant="standard"
                      autoComplete="off"
                      slotProps={{
                        htmlInput: {
                          inputMode: 'numeric',
                          pattern: '^\\d+(\\.\\d+)?$'
                        }
                      }}
                    />
                  </FormControl>

                  <FormControl fullWidth margin="dense">
                    <TextField
                      label={`${strings.WEEKLY_PRICE} (${commonStrings.CURRENCY})`}
                      {...register('weeklyPrice')}
                      variant="standard"
                      autoComplete="off"
                      slotProps={{
                        htmlInput: {
                          inputMode: 'numeric',
                          pattern: '^\\d+(\\.\\d+)?$'
                        }
                      }}
                    />
                  </FormControl>

                  <FormControl fullWidth margin="dense">
                    <TextField
                      label={`${strings.DISCOUNTED_WEEKLY_PRICE} (${commonStrings.CURRENCY})`}
                      {...register('discountedWeeklyPrice')}
                      variant="standard"
                      autoComplete="off"
                      slotProps={{
                        htmlInput: {
                          inputMode: 'numeric',
                          pattern: '^\\d+(\\.\\d+)?$'
                        }
                      }}
                    />
                  </FormControl>

                  <FormControl fullWidth margin="dense">
                    <TextField
                      label={`${strings.MONTHLY_PRICE} (${commonStrings.CURRENCY})`}
                      {...register('monthlyPrice')}
                      variant="standard"
                      autoComplete="off"
                      slotProps={{
                        htmlInput: {
                          inputMode: 'numeric',
                          pattern: '^\\d+(\\.\\d+)?$'
                        }
                      }}
                    />
                  </FormControl>

                  <FormControl fullWidth margin="dense">
                    <TextField
                      label={`${strings.DISCOUNTED_MONThLY_PRICE} (${commonStrings.CURRENCY})`}
                      {...register('discountedMonthlyPrice')}
                      variant="standard"
                      autoComplete="off"
                      slotProps={{
                        htmlInput: {
                          inputMode: 'numeric',
                          pattern: '^\\d+(\\.\\d+)?$'
                        }
                      }}
                    />
                  </FormControl>
                </>
              )}

              <FormControl fullWidth margin="dense">
                <TextField
                  label={`${csStrings.DEPOSIT} (${commonStrings.CURRENCY})`}
                  {...register('deposit')}
                  required
                  variant="standard"
                  autoComplete="off"
                  slotProps={{
                    htmlInput: {
                      inputMode: 'numeric',
                      pattern: '^\\d+(\\.\\d+)?$'
                    }
                  }}
                />
              </FormControl>

              <FormControl fullWidth margin="dense">
                <CarRangeList
                  label={strings.CAR_RANGE}
                  variant="standard"
                  required
                  value={range}
                  onChange={(value) => setValue('range', value)}
                />
              </FormControl>

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

              <FormControl fullWidth margin="dense">
                <TextField
                  label={strings.RATING}
                  {...register('rating')}
                  variant="standard"
                  autoComplete="off"
                  slotProps={{
                    htmlInput: {
                      type: 'number',
                      min: 1,
                      max: 5,
                      step: 0.01,
                    }
                  }}
                />
              </FormControl>

              <FormControl fullWidth margin="dense">
                <TextField
                  label={strings.CO2}
                  {...register('co2')}
                  variant="standard"
                  autoComplete="off"
                  slotProps={{
                    htmlInput: {
                      inputMode: 'numeric',
                      pattern: '^\\d+(\\.\\d+)?$'
                    }
                  }}
                />
              </FormControl>

              <FormControl fullWidth margin="dense" className="checkbox-fc">
                <FormControlLabel
                  control={
                    <Switch
                      checked={available}
                      onChange={(e) => setValue('available', e.target.checked)}
                      color="primary"
                    />
                  }
                  label={strings.AVAILABLE}
                  className="checkbox-fcl"
                />
              </FormControl>

              <FormControl fullWidth margin="dense" className="checkbox-fc">
                <FormControlLabel
                  control={(
                    <Switch
                      checked={fullyBooked}
                      onChange={(e) => setValue('fullyBooked', e.target.checked)}
                      color="primary"
                    />
                  )}
                  label={strings.FULLY_BOOKED}
                  className="checkbox-fcl"
                />
              </FormControl>

              <FormControl fullWidth margin="dense" className="checkbox-fc">
                <FormControlLabel
                  control={(
                    <Switch
                      checked={comingSoon}
                      onChange={(e) => setValue('comingSoon', e.target.checked)}
                      color="primary"
                    />
                  )}
                  label={strings.COMING_SOON}
                  className="checkbox-fcl"
                />
              </FormControl>

              <FormControl fullWidth margin="dense">
                <CarTypeList
                  label={strings.CAR_TYPE}
                  variant="standard"
                  required
                  value={type}
                  onChange={(value) => setValue('type', value)}
                />
              </FormControl>

              <FormControl fullWidth margin="dense">
                <GearboxList
                  label={strings.GEARBOX}
                  variant="standard"
                  required
                  value={gearbox}
                  onChange={(value) => setValue('gearbox', value)}

                />
              </FormControl>

              <FormControl fullWidth margin="dense">
                <SeatsList
                  label={strings.SEATS}
                  variant="standard"
                  required
                  value={seats}
                  onChange={(value) => setValue('seats', value.toString())}
                />
              </FormControl>

              <FormControl fullWidth margin="dense">
                <DoorsList
                  label={strings.DOORS}
                  variant="standard"
                  required
                  value={doors}
                  onChange={(value) => setValue('doors', value.toString())}
                />
              </FormControl>

              <FormControl fullWidth margin="dense">
                <FuelPolicyList
                  label={csStrings.FUEL_POLICY}
                  variant="standard"
                  required
                  value={fuelPolicy}
                  onChange={(value) => setValue('fuelPolicy', value)}
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
                      checked={aircon}
                      onChange={(e) => setValue('aircon', e.target.checked)}
                      color="primary"
                    />
                  }
                  label={strings.AIRCON}
                  className="checkbox-fcl"
                />
              </FormControl>

              <FormControl fullWidth margin="dense">
                <TextField
                  label={`${csStrings.MILEAGE} (${csStrings.MILEAGE_UNIT})`}
                  {...register('mileage')}
                  variant="standard"
                  autoComplete="off"
                  slotProps={{
                    htmlInput: {
                      inputMode: 'numeric',
                      pattern: '^\\d+(\\.\\d+)?$'
                    }
                  }}
                />
              </FormControl>

              <FormControl fullWidth margin="dense">
                <TextField
                  label={`${csStrings.CANCELLATION} (${commonStrings.CURRENCY})`}
                  {...register('cancellation')}
                  variant="standard"
                  autoComplete="off"
                  slotProps={{
                    htmlInput: {
                      inputMode: 'numeric',
                      pattern: '^\\d+(\\.\\d+)?$'
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
                  slotProps={{
                    htmlInput: {
                      inputMode: 'numeric',
                      pattern: '^\\d+(\\.\\d+)?$'
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
                  slotProps={{
                    htmlInput: {
                      inputMode: 'numeric',
                      pattern: '^\\d+(\\.\\d+)?$'
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
                  slotProps={{
                    htmlInput: {
                      inputMode: 'numeric',
                      pattern: '^\\d+(\\.\\d+)?$'
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
                  slotProps={{
                    htmlInput: {
                      inputMode: 'numeric',
                      pattern: '^\\d+(\\.\\d+)?$'
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
                  slotProps={{
                    htmlInput: {
                      inputMode: 'numeric',
                      pattern: '^\\d+(\\.\\d+)?$'
                    }
                  }}
                />
              </FormControl>

              <div className="buttons">
                <Button type="submit" variant="contained" className="btn-primary btn-margin-bottom" size="small" disabled={loading || isSubmitting}>
                  {commonStrings.SAVE}
                </Button>
                <Button variant="contained" className="btn-secondary btn-margin-bottom" size="small" onClick={() => navigate('/cars')}>
                  {commonStrings.CANCEL}
                </Button>
              </div>

              <div className="form-error">
                {imageRequired && <ErrorMessage message={commonStrings.IMAGE_REQUIRED} />}
                {imageSizeError && <ErrorMessage message={strings.CAR_IMAGE_SIZE_ERROR} />}
                {(formError || Object.keys(errors).length > 0) && <ErrorMessage message={commonStrings.FORM_ERROR} />}
              </div>
            </form>
          </Paper>
        </div>
      )}
      {(loading || isSubmitting) && <Backdrop text={commonStrings.PLEASE_WAIT} />}
      {formError && <Error />}
      {noMatch && <NoMatch hideHeader />}
    </Layout>
  )
}

export default UpdateCar
