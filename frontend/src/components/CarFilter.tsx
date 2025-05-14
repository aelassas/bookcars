import React, { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
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
  let _minDate = new Date()
  _minDate = addHours(_minDate, env.MIN_PICK_UP_HOURS)

  const [minDate, setMinDate] = useState<Date>()
  const [offsetHeight, setOffsetHeight] = useState(OFFSET_HEIGHT)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
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

  const { from, to, pickupLocation, dropOffLocation, sameLocation } = useWatch({ control })

  useEffect(() => {
    if (filterFrom) {
      let __minDate = new Date(filterFrom)
      __minDate = addHours(__minDate, env.MIN_RENTAL_HOURS)
      setMinDate(__minDate)
    }
  }, [filterFrom])

  useEffect(() => {
    const minPickupDuration = env.MIN_PICK_UP_HOURS * 60 * 60 * 1000
    const minRentalDuration = env.MIN_RENTAL_HOURS * 60 * 60 * 1000

    if (from) {
      let __minDate = new Date(from)
      __minDate = addHours(__minDate, env.MIN_RENTAL_HOURS)
      setMinDate(__minDate)

      const minPickupTime = from.getTime() - Date.now()

      if (minPickupTime < minPickupDuration) {
        setError('from', { message: strings.MIN_PICK_UP_HOURS_ERROR })
      } else {
        clearErrors('from')
      }
    }

    if (from && to) {
      const rentalDuration = to.getTime() - from.getTime()

      if (from.getTime() > to.getTime()) {
        const _to = new Date(from)
        if (env.MIN_RENTAL_HOURS < 24) {
          _to.setDate(_to.getDate() + 1)
        } else {
          _to.setDate(_to.getDate() + Math.ceil(env.MIN_RENTAL_HOURS / 24) + 1)
        }
        setValue('to', _to)
      } else if (rentalDuration < minRentalDuration) {
        setError('to', { message: strings.MIN_RENTAL_HOURS_ERROR })
      } else {
        clearErrors('to')
      }
    }
  }, [from, to, setValue, setError, clearErrors])

  useEffect(() => {
    if (sameLocation) {
      setOffsetHeight(OFFSET_HEIGHT)
    } else {
      setOffsetHeight((prev) => prev + 56)
    }
  }, [sameLocation])


  const handleSameLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('sameLocation', e.target.checked)

    if (e.target.checked) {
      setValue('dropOffLocation', pickupLocation as LocationField)
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
          <DateTimePicker
            {...register('from')}
            label={strings.PICK_UP_DATE}
            value={from || undefined}
            minDate={_minDate}
            variant="standard"
            required
            onChange={(date) => {
              if (date) {
                setValue('from', date, { shouldValidate: true })
              } else {
                setValue('from', null)
                setMinDate(_minDate)
              }
            }}
            language={UserService.getLanguage()}
          />
          <FormHelperText error={!!errors.from}>{errors.from?.message}</FormHelperText>
        </FormControl>
        <FormControl fullWidth className="to">
          <DateTimePicker
            {...register('to')}
            label={strings.DROP_OFF_DATE}
            value={to || undefined}
            minDate={minDate}
            variant="standard"
            required
            onChange={(date) => {
              if (date) {
                setValue('to', date, { shouldValidate: true })
              } else {
                setValue('to', null)
              }
            }}
            language={UserService.getLanguage()}
          />
          <FormHelperText error={!!errors.to}>{errors.to?.message}</FormHelperText>
        </FormControl>
        <FormControl fullWidth className="fc-search">
          <Button type="submit" variant="contained" className="btn-primary btn-search">
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
