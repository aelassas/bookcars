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
import HubSelect, { HubPills } from '@/components/HubSelect'
import DateTimePicker from '@/components/DateTimePicker'
import { schema, FormFields } from '@/models/SearchForm'
import { ALL_PAKISTAN_HUBS_ID, DEFAULT_HUB_NAME, findHubByName, loadHubs } from '@/utils/hubs'
import { useSetting } from '@/context/SettingContext'

import '@/assets/css/search-form.css'

const DEFAULT_SEARCH_SETTINGS = {
  minPickupHours: 3,
  minRentalHours: 24,
  minPickupDropoffHour: 6,
  maxPickupDropoffHour: 22,
}

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
  const searchSettings = settings || DEFAULT_SEARCH_SETTINGS

  const [pickupLocationId, setPickupLocationId] = useState<string>(__pickupLocation || '')
  const [dropOffLocationId, setDropOffLocationId] = useState<string>(__dropOffLocation || __pickupLocation || '')
  const [minTime, setMinTime] = useState<Date | null>(null)
  const [maxTime, setMaxTime] = useState<Date | null>(null)
  const [minDate, setMinDate] = useState<Date | null>(null)
  const [fromMinDate, setFromMinDate] = useState<Date | null>(null)
  const [ranges, setRanges] = useState(bookcarsHelper.getAllRanges())
  const [rentalMode, setRentalMode] = useState<bookcarsTypes.RentalMode>(bookcarsTypes.RentalMode.SelfDrive)

  // Start every search on the Islamabad hub (or "All Pakistan Hubs" from the pills).
  useEffect(() => {
    if (pickupLocationId) {
      return
    }
    let active = true
    loadHubs().then((hubs) => {
      const defaultHub = findHubByName(hubs, DEFAULT_HUB_NAME) || hubs[0]
      if (active && defaultHub) {
        setPickupLocationId(defaultHub._id)
        setDropOffLocationId(defaultHub._id)
      }
    })
    return () => {
      active = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (searchSettings) {
      const _minTime = new Date()
      _minTime.setHours(searchSettings.minPickupDropoffHour, 0, 0, 0)
      setMinTime(_minTime)

      const _maxTime = new Date()
      _maxTime.setHours(searchSettings.maxPickupDropoffHour, 0, 0, 0)
      setMaxTime(_maxTime)

      let _minDate = new Date()
      _minDate = addHours(_minDate, searchSettings.minPickupHours)

      setFromMinDate(_minDate)
      setMinDate(_minDate)
    }
  }, [searchSettings])

  const {
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
      pickupLocation: null,
      dropOffLocation: null,
    }
  })

  const from = useWatch({ control, name: 'from' })
  const to = useWatch({ control, name: 'to' })
  const sameLocation = useWatch({ control, name: 'sameLocation' })

  // Default window: pickup tomorrow, return three days later.
  useEffect(() => {
    if (searchSettings) {
      const _from = new Date()
      _from.setDate(_from.getDate() + 1)
      _from.setHours(10)
      _from.setMinutes(0)
      _from.setSeconds(0)
      _from.setMilliseconds(0)

      const earliestPickup = addHours(new Date(), searchSettings.minPickupHours)
      if (_from.getTime() < earliestPickup.getTime()) {
        _from.setTime(earliestPickup.getTime())
      }

      const _to = new Date(_from)
      _to.setDate(_to.getDate() + 3)

      const earliestReturn = addHours(_from, searchSettings.minRentalHours)
      if (_to.getTime() < earliestReturn.getTime()) {
        _to.setTime(earliestReturn.getTime())
      }

      let __minDate = new Date()
      __minDate = addHours(__minDate, searchSettings.minRentalHours)

      setMinDate(__minDate)
      setValue('from', _from)
      setValue('to', _to)
    }
  }, [searchSettings]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setRanges(__ranges || bookcarsHelper.getAllRanges())
  }, [__ranges])

  const validateHour = (hour: number) => {
    return hour >= searchSettings.minPickupDropoffHour && hour <= searchSettings.maxPickupDropoffHour
  }

  const validateTimes = () => {
    let valid = true
    const minPickupDuration = searchSettings.minPickupHours * 60 * 60 * 1000
    const minRentalDuration = searchSettings.minRentalHours * 60 * 60 * 1000

    if (from) {
      let __minDate = new Date(from)
      __minDate = addHours(__minDate, searchSettings.minRentalHours)
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
        if (searchSettings.minRentalHours < 24) {
          _to.setDate(_to.getDate() + 1)
        } else {
          _to.setDate(_to.getDate() + Math.ceil(searchSettings.minRentalHours / 24) + 1)
        }
        const _from = new Date(from)
        const fromHourValid = validateHour(_from.getHours())
        if (!fromHourValid) {
          _from.setHours(searchSettings.minPickupDropoffHour)
          setValue('from', _from)
        }
        const toHourValid = validateHour(_to.getHours())
        if (!toHourValid) {
          _to.setHours(searchSettings.minPickupDropoffHour)
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

  // Use fallback rules while remote settings are unavailable so search stays visible.
  if (!minDate || !fromMinDate || !minTime || !maxTime) {
    return null
  }

  const handlePickupLocationChange = (hubId: string) => {
    setPickupLocationId(hubId)

    if (sameLocation) {
      setDropOffLocationId(hubId)
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

  const handleDropOffLocationChange = (hubId: string) => {
    setDropOffLocationId(hubId)
  }

  const onSubmit = (data: FormFields) => {
    const valid = validateTimes()
    if (!valid) {
      return
    }

    if (!data.from || !data.to) {
      return
    }

    const selectedDropOffId = sameLocation ? pickupLocationId : dropOffLocationId

    // An empty hub id means "All Pakistan Hubs"; the API then returns every approved vehicle.
    navigate('/search', {
      state: {
        pickupLocationId: pickupLocationId || ALL_PAKISTAN_HUBS_ID,
        dropOffLocationId: selectedDropOffId || ALL_PAKISTAN_HUBS_ID,
        from: data.from,
        to: data.to,
        ranges,
        rentalMode,
      },
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="home-search-form">
      {/* Top Controls Row */}
      <div className="home-search-top-row">
        <div className="rental-mode-pill-group" role="group" aria-label="Rental mode selection">
          <button
            type="button"
            className={`rental-mode-pill ${rentalMode === bookcarsTypes.RentalMode.SelfDrive ? 'active' : ''}`}
            aria-pressed={rentalMode === bookcarsTypes.RentalMode.SelfDrive}
            onClick={() => setRentalMode(bookcarsTypes.RentalMode.SelfDrive)}
          >
            Self-drive
          </button>
          <button
            type="button"
            className={`rental-mode-pill ${rentalMode === bookcarsTypes.RentalMode.WithDriver ? 'active' : ''}`}
            aria-pressed={rentalMode === bookcarsTypes.RentalMode.WithDriver}
            onClick={() => setRentalMode(bookcarsTypes.RentalMode.WithDriver)}
          >
            With chauffeur
          </button>
        </div>

        <FormControl className="chk-same-location">
          <FormControlLabel control={<Checkbox checked={sameLocation} onChange={handleSameLocationChange} />} label={strings.DROP_OFF} />
        </FormControl>
      </div>

      {/* Locations Row */}
      <div className="home-search-locations-row">
        <FormControl fullWidth className="pickup-location">
          <HubSelect
            label="Pickup hub"
            value={pickupLocationId}
            onChange={handlePickupLocationChange}
          />
        </FormControl>

        {!sameLocation && (
          <FormControl fullWidth className="drop-off-location">
            <HubSelect
              label="Drop-off hub"
              value={dropOffLocationId}
              onChange={handleDropOffLocationChange}
            />
          </FormControl>
        )}
      </div>

      {/* Quick city pills */}
      <HubPills value={pickupLocationId} onChange={handlePickupLocationChange} />

      {/* Dates & Search CTA Row */}
      <div className="home-search-dates-row">
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
      </div>
    </form>
  )
}

export default SearchForm
