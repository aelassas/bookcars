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
  TextField,
  Stack,
} from '@mui/material'
import { MyLocation } from '@mui/icons-material'
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

  const nearestPickupPoint = async (latitude: number, longitude: number) => {
    const points = await LocationService.getLocationsWithPosition()
    const distanceKm = (lat: number, lon: number) => {
      const radians = (value: number) => value * Math.PI / 180
      const dLat = radians(lat - latitude)
      const dLon = radians(lon - longitude)
      const a = Math.sin(dLat / 2) ** 2
        + Math.cos(radians(latitude)) * Math.cos(radians(lat)) * Math.sin(dLon / 2) ** 2
      return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    }
    const nearest = points
      .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude))
      .map((point) => ({ point, distance: distanceKm(point.latitude!, point.longitude!) }))
      .sort((a, b) => a.distance - b.distance)[0]

    return nearest && nearest.distance <= 50 ? nearest.point : undefined
  }

  const { settings } = useSetting()
  const searchSettings = settings || DEFAULT_SEARCH_SETTINGS

  const [pickupLocationId, setPickupLocationId] = useState('')
  const [dropOffLocationId, setDropOffLocationId] = useState('')
  const [minTime, setMinTime] = useState<Date | null>(null)
  const [maxTime, setMaxTime] = useState<Date | null>(null)
  const [minDate, setMinDate] = useState<Date | null>(null)
  const [fromMinDate, setFromMinDate] = useState<Date | null>(null)
  const [ranges, setRanges] = useState(bookcarsHelper.getAllRanges())
  const [pickupPlace, setPickupPlace] = useState('')
  const [pickupCoordinates, setPickupCoordinates] = useState<{ latitude: number; longitude: number; name: string }>()
  const [placeError, setPlaceError] = useState('')
  const [rentalMode, setRentalMode] = useState<bookcarsTypes.RentalMode>(bookcarsTypes.RentalMode.SelfDrive)

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
    if (searchSettings) {
      const _from = new Date()
      if (searchSettings.minPickupHours < 72) {
        _from.setDate(_from.getDate() + 3)
      } else {
        _from.setDate(_from.getDate() + Math.ceil(searchSettings.minPickupHours / 24) + 1)
      }
      _from.setHours(10)
      _from.setMinutes(0)
      _from.setSeconds(0)
      _from.setMilliseconds(0)

      const _to = new Date(_from)
      if (searchSettings.minRentalHours < 72) {
        _to.setDate(_to.getDate() + 3)
      } else {
        _to.setDate(_to.getDate() + Math.ceil(searchSettings.minRentalHours / 24) + 1)
      }

      let __minDate = new Date()
      __minDate = addHours(__minDate, searchSettings.minRentalHours)

      setMinDate(__minDate)
      setValue('from', _from)
      setValue('to', _to)
    }
  }, [searchSettings]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const handlePickupLocationChange = async (values: bookcarsTypes.Option[]) => {
    setPickupPlace('')
    setPickupCoordinates(undefined)
    setPlaceError('')
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

  const onSubmit = async (data: FormFields) => {
    const valid = validateTimes()
    if (!valid) {
      return
    }

    if (!data.from || !data.to) {
      return
    }

    let resolvedCoordinates = pickupCoordinates
    if (!resolvedCoordinates && pickupPlace.trim()) {
      try {
        const place = await LocationService.resolvePlace(pickupPlace.trim())
        resolvedCoordinates = { ...place, name: place.name || pickupPlace.trim() }
      } catch (err) {
        setPlaceError('We could not find that place. Try a Pakistani city or use your current location.')
        return
      }
    }

    if (resolvedCoordinates) {
      let nearestPoint
      try {
        nearestPoint = await nearestPickupPoint(resolvedCoordinates.latitude, resolvedCoordinates.longitude)
      } catch (err) {
        setPlaceError('Pickup locations could not be loaded. Please try again.')
        return
      }
      if (!nearestPoint) {
        setPlaceError('There are no SafarRent pickup points within 50 km yet. Choose a listed pickup city instead.')
        return
      }

      if (!sameLocation && (!data.dropOffLocation || !dropOffLocationId)) {
        return
      }
      navigate('/search', {
        state: {
          pickupLocationId: nearestPoint._id,
          dropOffLocationId: sameLocation ? nearestPoint._id : dropOffLocationId,
          pickupCoordinates: {
            latitude: resolvedCoordinates.latitude,
            longitude: resolvedCoordinates.longitude,
          },
          pickupPlace: resolvedCoordinates.name,
          from: data.from,
          to: data.to,
          ranges,
          rentalMode,
        },
      })
      return
    }

    if (!data.pickupLocation || !data.dropOffLocation) {
      return
    }

    setTimeout(navigate, 0, '/search', {
      state: {
        pickupLocationId: pickupLocationId,
        dropOffLocationId: dropOffLocationId,
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
          <LocationSelectList
            {...register('pickupLocation')}
            label={commonStrings.PICK_UP_LOCATION}
            hidePopupIcon
            init
            required={!pickupPlace && !pickupCoordinates}
            variant="outlined"
            value={pickupLocation as bookcarsTypes.Location}
            onChange={handlePickupLocationChange}
          />
        </FormControl>

        <FormControl fullWidth className="pickup-place">
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <TextField
              fullWidth
              label="Search any place in Pakistan"
              placeholder="Enter a city or area"
              value={pickupPlace}
              onChange={(event) => {
                setPickupPlace(event.target.value)
                setPickupCoordinates(undefined)
                setPlaceError('')
                if (event.target.value) {
                  setPickupLocationId('geo')
                  setValue('pickupLocation', null)
                  if (sameLocation) {
                    setDropOffLocationId('geo')
                    setValue('dropOffLocation', null)
                  }
                }
              }}
              variant="outlined"
            />
            <Button
              type="button"
              variant="outlined"
              startIcon={<MyLocation />}
              sx={{ whiteSpace: 'nowrap', minWidth: '160px', height: '56px' }}
              onClick={() => {
                if (!navigator.geolocation) {
                  setPlaceError('Location access is not available in this browser.')
                  return
                }
                navigator.geolocation.getCurrentPosition(
                  ({ coords }) => {
                    setPickupCoordinates({ latitude: coords.latitude, longitude: coords.longitude, name: 'Your current location' })
                    setPickupPlace('Current location')
                    setPickupLocationId('')
                    setValue('pickupLocation', null)
                    if (sameLocation) {
                      setDropOffLocationId('')
                      setValue('dropOffLocation', null)
                    }
                    setPlaceError('')
                  },
                  () => setPlaceError('Allow location access or enter a city to search nearby cars.'),
                  { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
                )
              }}
            >
              Use my location
            </Button>
          </Stack>
          <FormHelperText error={!!placeError}>{placeError || (pickupCoordinates ? `${pickupCoordinates.name} selected. Searching approved vehicles within 50 km.` : 'Searches approved vehicles near registered pickup points (within 50 km).')}</FormHelperText>
        </FormControl>

        {!sameLocation && (
          <FormControl fullWidth className="drop-off-location">
            <LocationSelectList
              {...register('dropOffLocation')}
              label={commonStrings.DROP_OFF_LOCATION}
              hidePopupIcon
              init
              value={dropOffLocation as bookcarsTypes.Location}
              required
              variant="outlined"
              onChange={handleDropOffLocationChange}
            />
          </FormControl>
        )}
      </div>

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
