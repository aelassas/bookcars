import React, { useEffect, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormControl, Button, FormControlLabel, Checkbox, FormHelperText } from '@mui/material'
import { addHours } from 'date-fns'
import * as bookcarsTypes from ':bookcars-types'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/search-form'
import * as UserService from '@/services/UserService'
import LocationSelectList from './LocationSelectList'
import DateTimePicker from './DateTimePicker'
import Accordion from './Accordion'
import { schema, FormFields, LocationField } from '@/models/SearchForm'
import * as LocationService from '@/services/LocationService'
import { useSetting } from '@/context/SettingContext'

import '@/assets/css/car-filter.css'

const OFFSET_HEIGHT = 100

interface CarFilterProps {
  from: Date
  to: Date
  pickupLocation: bookcarsTypes.Location
  dropOffLocation: bookcarsTypes.Location
  className?: string
  collapse?: boolean
  onSubmit: bookcarsTypes.CarFilterSubmitEvent
}

const CarFilter = ({
  from: filterFrom,
  to: filterTo,
  pickupLocation: filterPickupLocation,
  dropOffLocation: filterDropOffLocation,
  className,
  collapse,
  onSubmit
}: CarFilterProps) => {
  const { settings } = useSetting()

  const [minTime, setMinTime] = useState<Date | null>(null)
  const [maxTime, setMaxTime] = useState<Date | null>(null)
  const [minDate, setMinDate] = useState<Date | null>(null)
  const [fromMinDate, setFromMinDate] = useState<Date | null>(null)
  const [offsetHeight, setOffsetHeight] = useState(OFFSET_HEIGHT)

  useEffect(() => {
    if (settings) {
      const _minTime = new Date()
      _minTime.setHours(settings.minPickupDropoffHour, 0, 0, 0)
      setMinTime(_minTime)

      const _maxTime = new Date()
      _maxTime.setHours(settings.maxPickupDropoffHour, 0, 0, 0)
      setMaxTime(_maxTime)

      let _minDate = new Date()
      _minDate = addHours(_minDate, settings.minPickupHours)

      setFromMinDate(_minDate)
      setMinDate(_minDate)
    }
  }, [settings])

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
  } = useForm<FormFields>({
    resolver: zodResolver(schema),
    defaultValues: {
      from: filterFrom,
      to: filterTo,
      pickupLocation: filterPickupLocation as LocationField,
      dropOffLocation: filterDropOffLocation as LocationField,
      sameLocation: filterPickupLocation._id === filterDropOffLocation._id
    },
    mode: 'onSubmit',
  })

  const pickupLocation = useWatch({ control, name: 'pickupLocation' })
  const dropOffLocation = useWatch({ control, name: 'dropOffLocation' })
  const from = useWatch({ control, name: 'from' })
  const to = useWatch({ control, name: 'to' })
  const sameLocation = useWatch({ control, name: 'sameLocation' })

  useEffect(() => {
    if (settings && filterFrom) {
      let __minDate = new Date(filterFrom)
      __minDate = addHours(__minDate, settings!.minRentalHours)
      setMinDate(__minDate)
    }
  }, [filterFrom, settings])

  useEffect(() => {
    if (sameLocation) {
      setOffsetHeight(OFFSET_HEIGHT)
    } else {
      setOffsetHeight((prev) => prev + 56)
    }
  }, [sameLocation])

  const validateHour = (hour: number) => {
    if (!settings) {
      return false
    }
    return hour >= settings.minPickupDropoffHour && hour <= settings.maxPickupDropoffHour
  }

  const validateTimes = () => {
    if (!settings) {
      return false
    }

    let valid = true
    const minPickupDuration = settings.minPickupHours * 60 * 60 * 1000
    const minRentalDuration = settings.minRentalHours * 60 * 60 * 1000

    if (from) {
      let __minDate = new Date(from)
      __minDate = addHours(__minDate, settings.minRentalHours)
      setMinDate(__minDate)

      const minPickupTime = from.getTime() - Date.now()

      if (minPickupTime < minPickupDuration) {
        setError('from', { message: strings.MIN_PICK_UP_HOURS_ERROR })
        valid = false
      } else {
        if (errors.from) {
          clearErrors('from')
        }
      }

      const hourValid = validateHour(from.getHours())
      if (!hourValid) {
        setError('from', { message: strings.INVALID_PICK_UP_TIME })
        valid = false
      }
    }

    if (from && to) {
      const rentalDuration = to.getTime() - from.getTime()

      if (from.getTime() > to.getTime()) {
        const _to = new Date(from)
        if (settings.minRentalHours < 24) {
          _to.setDate(_to.getDate() + 1)
        } else {
          _to.setDate(_to.getDate() + Math.ceil(settings.minRentalHours / 24) + 1)
        }
        const _from = new Date(from)
        const fromHourValid = validateHour(_from.getHours())
        if (!fromHourValid) {
          _from.setHours(settings.minPickupDropoffHour)
          setValue('from', _from)
        }
        const toHourValid = validateHour(_to.getHours())
        if (!toHourValid) {
          _to.setHours(settings.minPickupDropoffHour)
        }
        setValue('to', _to)
      } else if (rentalDuration < minRentalDuration) {
        setError('to', { message: strings.MIN_RENTAL_HOURS_ERROR })
        valid = false
      } else {
        if (errors.to) {
          clearErrors('to')
        }
      }

      const hourValid = validateHour(to.getHours())
      if (!hourValid) {
        setError('to', { message: strings.INVALID_DROP_OFF_TIME })
        valid = false
      }
    }

    return valid
  }

  useEffect(() => {
    validateTimes()
  }, [from, to]) // eslint-disable-line react-hooks/exhaustive-deps

  // Guard against using `minDate` before it's ready
  if (!settings || !minDate || !fromMinDate || !minTime || !maxTime) {
    return null
  }

  const handleSameLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('sameLocation', e.target.checked)

    if (e.target.checked) {
      setValue('dropOffLocation', pickupLocation)
    }
  }

  const handlePickupLocationChange = async (values: bookcarsTypes.Option[]) => {
    const pickupLocationId = (values.length > 0 && values[0]._id) || ''
    if (pickupLocationId) {
      const _pickupLocation = await LocationService.getLocation(pickupLocationId) as LocationField

      setValue('pickupLocation', _pickupLocation)

      if (sameLocation) {
        setValue('dropOffLocation', _pickupLocation)
      }
    }
  }

  const handleDropOffLocationChange = async (values: bookcarsTypes.Option[]) => {
    const dropOffLocationId = (values.length > 0 && values[0]._id) || ''
    if (dropOffLocationId) {
      const _dropOffLocation = await LocationService.getLocation(dropOffLocationId) as LocationField

      setValue('dropOffLocation', _dropOffLocation)
    }
  }

  const onSubmitForm = (data: FormFields) => {
    const valid = validateTimes()
    if (!valid) {
      return
    }

    if (
      !data.pickupLocation
      || !data.dropOffLocation
      || !data.from
      || !data.to
    ) {
      return
    }

    if (onSubmit) {
      const filter: bookcarsTypes.CarFilter = {
        pickupLocation: data.pickupLocation as bookcarsTypes.Location,
        dropOffLocation: data.dropOffLocation as bookcarsTypes.Location,
        from: data.from!,
        to: data.to!,
      }
      onSubmit(filter)
    }
  }

  return (
    <Accordion
      title={commonStrings.LOCATION_TERM}
      collapse={collapse}
      offsetHeight={offsetHeight}
      className={`${className ? `${className} ` : ''}car-filter`}
    >
      <form onSubmit={handleSubmit(onSubmitForm)}>
        <FormControl fullWidth className="pickup-location">
          <LocationSelectList
            {...register('pickupLocation')}
            label={commonStrings.PICK_UP_LOCATION}
            hidePopupIcon
            customOpen={env.isMobile}
            init={!env.isMobile}
            required
            variant="standard"
            value={pickupLocation as bookcarsTypes.Location}
            onChange={handlePickupLocationChange}
          />
        </FormControl>
        {!sameLocation && (
          <FormControl fullWidth className="drop-off-location">
            <LocationSelectList
              {...register('dropOffLocation')}
              label={commonStrings.DROP_OFF_LOCATION}
              value={dropOffLocation as bookcarsTypes.Location}
              hidePopupIcon
              customOpen={env.isMobile}
              init={!env.isMobile}
              required
              variant="standard"
              onChange={handleDropOffLocationChange}
            />
          </FormControl>
        )}
        <FormControl fullWidth className="from">
          <Controller
            name="from"
            control={control}
            render={({ field }) => (
              <DateTimePicker
                {...field}
                variant="standard"
                label={strings.PICK_UP_DATE}
                value={field.value || undefined}
                minDate={fromMinDate}
                minTime={minTime}
                maxTime={maxTime}
                onChange={(date) => {
                  field.onChange(date)
                }}
                language={UserService.getLanguage()}
              />
            )}
          />
          <FormHelperText error={!!errors.from}>{errors.from?.message}</FormHelperText>
        </FormControl>

        <FormControl fullWidth className="to">
          <Controller
            name="to"
            control={control}
            render={({ field }) => (
              <DateTimePicker
                {...field}
                variant="standard"
                label={strings.DROP_OFF_DATE}
                value={field.value || undefined}
                minDate={minDate}
                minTime={minTime}
                maxTime={maxTime}
                onChange={(date) => {
                  field.onChange(date)
                }}
                language={UserService.getLanguage()}
              />
            )}
          />
          <FormHelperText error={!!errors.to}>{errors.to?.message}</FormHelperText>
        </FormControl>
        <FormControl fullWidth className="fc-search">
          <Button type="submit" variant="contained" className="btn-primary btn-search" disabled={isSubmitting}>
            {commonStrings.SEARCH}
          </Button>
        </FormControl>
        <FormControl fullWidth className="chk-same-location">
          <FormControlLabel
            control={<Checkbox
              {...register('sameLocation')}
              checked={sameLocation}
              onChange={handleSameLocationChange}
            />}
            label={strings.DROP_OFF}
          />
        </FormControl>
      </form>
    </Accordion>
  )
}

export default CarFilter
