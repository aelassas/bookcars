import React, { useState, useEffect } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import {
  FormControl,
  Button,
  FormControlLabel,
  Checkbox,
  FormHelperText,
} from '@mui/material'
import { addHours } from 'date-fns'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/search-form'
import * as UserService from '@/services/UserService'
import * as LocationService from '@/services/LocationService'
import LocationSelectList from '@/components/LocationSelectList'
import DateTimePicker from '@/components/DateTimePicker'
import { schema, FormFields, LocationField } from '@/models/SearchForm'
import { useSetting } from '@/context/SettingContext'

import '@/assets/css/search-form.css'

interface SearchFormProps {
  pickupLocation?: string
  dropOffLocation?: string
  ranges?: bookcarsTypes.CarRange[]
  onCancel?: () => void
}

const SearchForm = ({
  pickupLocation: __pickupLocation,
  dropOffLocation: __dropOffLocation,
  ranges: __ranges,
  onCancel,
}: SearchFormProps) => {
  const navigate = useNavigate()

  const { settings } = useSetting()

  const minTime = new Date()
  minTime.setHours(settings!.minPickupDropoffHour, 0, 0, 0)

  const maxTime = new Date()
  maxTime.setHours(settings!.maxPickupDropoffHour, 0, 0, 0)

  let _minDate = new Date()
  _minDate = addHours(_minDate, settings!.minPickupHours)

  const [pickupLocationId, setPickupLocationId] = useState('')
  const [dropOffLocationId, setDropOffLocationId] = useState('')
  const [minDate, setMinDate] = useState(_minDate)
  const [ranges, setRanges] = useState(bookcarsHelper.getAllRanges())

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
    mode: 'onSubmit',
    defaultValues: {
      sameLocation: true,
    }
  })

  const from = useWatch({ control, name: 'from' })
  const to = useWatch({ control, name: 'to' })
  const pickupLocation = useWatch({ control, name: 'pickupLocation' })
  const dropOffLocation = useWatch({ control, name: 'dropOffLocation' })
  const sameLocation = useWatch({ control, name: 'sameLocation' })

  useEffect(() => {
    const _from = new Date()
    if (settings!.minPickupHours < 72) {
      _from.setDate(_from.getDate() + 3)
    } else {
      _from.setDate(_from.getDate() + Math.ceil(settings!.minPickupHours / 24) + 1)
    }
    _from.setHours(10)
    _from.setMinutes(0)
    _from.setSeconds(0)
    _from.setMilliseconds(0)

    const _to = new Date(_from)
    if (settings!.minRentalHours < 72) {
      _to.setDate(_to.getDate() + 3)
    } else {
      _to.setDate(_to.getDate() + Math.ceil(settings!.minRentalHours / 24) + 1)
    }

    let __minDate = new Date()
    __minDate = addHours(__minDate, settings!.minRentalHours)

    setMinDate(__minDate)
    setValue('from', _from)
    setValue('to', _to)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const init = async () => {
      if (__pickupLocation) {
        const location = await LocationService.getLocation(__pickupLocation) as LocationField
        setValue('pickupLocation', location)
        setPickupLocationId(__pickupLocation)
        if (sameLocation) {
          setValue('dropOffLocation', location)
          setDropOffLocationId(__pickupLocation)
        } else {
          setValue('sameLocation', dropOffLocationId === __pickupLocation)
        }
      }
    }
    init()
  }, [__pickupLocation]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const init = async () => {
      if (__dropOffLocation) {
        const location = await LocationService.getLocation(__dropOffLocation) as LocationField
        setValue('dropOffLocation', location)
        setDropOffLocationId(__dropOffLocation)
        setValue('sameLocation', pickupLocationId === __dropOffLocation)
      }
    }
    init()
  }, [__dropOffLocation]) // eslint-disable-line react-hooks/exhaustive-deps

  const validateHour = (hour: number) => {
    if (!settings) {
      return false
    }
    if (hour >= settings.minPickupDropoffHour && hour <= settings.maxPickupDropoffHour) {
      return true
    }
    return false
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

  useEffect(() => {
    setRanges(__ranges || bookcarsHelper.getAllRanges())
  }, [__ranges])

  const handlePickupLocationChange = async (values: bookcarsTypes.Option[]) => {
    const _pickupLocationId = (values.length > 0 && values[0]._id) || ''
    setPickupLocationId(_pickupLocationId)

    if (_pickupLocationId) {
      const location = await LocationService.getLocation(_pickupLocationId) as LocationField
      setValue('pickupLocation', location)
      if (sameLocation) {
        setValue('dropOffLocation', location)
      }
    } else {
      setValue('pickupLocation', null)
    }

    if (sameLocation) {
      setDropOffLocationId(_pickupLocationId)
    }
  }

  const handleSameLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = e.target
    setValue('sameLocation', checked)

    if (checked) {
      setDropOffLocationId(pickupLocationId)
    } else {
      setDropOffLocationId('')
    }
  }

  const handleDropOffLocationChange = async (values: bookcarsTypes.Option[]) => {
    const _dropOffLocationId = (values.length > 0 && values[0]._id) || ''
    setDropOffLocationId(_dropOffLocationId)

    if (_dropOffLocationId) {
      const location = await LocationService.getLocation(_dropOffLocationId) as LocationField
      setValue('dropOffLocation', location)
    } else {
      setValue('dropOffLocation', null)
    }
  }

  const onSubmit = (data: FormFields) => {
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

    setTimeout(navigate, 0, '/search', {
      state: {
        pickupLocationId: pickupLocationId,
        dropOffLocationId: dropOffLocationId,
        from: data.from,
        to: data.to,
        ranges,
      },
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="home-search-form">
      <FormControl className="pickup-location">
        <LocationSelectList
          {...register('pickupLocation')}
          label={commonStrings.PICK_UP_LOCATION}
          hidePopupIcon
          // customOpen={env.isMobile}
          // init={!env.isMobile}
          init
          required
          variant="outlined"
          value={pickupLocation as bookcarsTypes.Location}
          onChange={handlePickupLocationChange}
        />
      </FormControl>
      <FormControl fullWidth className="from">
        <Controller
          name="from"
          control={control}
          render={({ field }) => (
            <DateTimePicker
              {...field}
              variant="outlined"
              label={strings.PICK_UP_DATE}
              value={field.value || undefined}
              minDate={_minDate}
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
              variant="outlined"
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
      <Button type="submit" variant="contained" className="btn-search" disabled={isSubmitting}>
        {commonStrings.SEARCH}
      </Button>
      {onCancel && (
        <Button
          variant="outlined"
          color="inherit"
          className="btn-cancel"
          onClick={() => {
            onCancel()
          }}
        >
          {commonStrings.CANCEL}
        </Button>
      )}
      {!sameLocation && (
        <FormControl className="drop-off-location">
          <LocationSelectList
            {...register('dropOffLocation')}
            label={commonStrings.DROP_OFF_LOCATION}
            hidePopupIcon
            // customOpen={env.isMobile}
            // init={!env.isMobile}
            init
            value={dropOffLocation as bookcarsTypes.Location}
            required
            variant="outlined"
            onChange={handleDropOffLocationChange}
          />
        </FormControl>
      )}
      <FormControl className="chk-same-location">
        <FormControlLabel control={<Checkbox checked={sameLocation} onChange={handleSameLocationChange} />} label={strings.DROP_OFF} />
      </FormControl>
    </form>
  )
}

export default SearchForm
