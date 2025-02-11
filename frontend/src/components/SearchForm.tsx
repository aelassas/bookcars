import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FormControl,
  Button,
  FormControlLabel,
  Checkbox,
  FormHelperText,
} from '@mui/material'
import { DateTimeValidationError } from '@mui/x-date-pickers'
import { addHours } from 'date-fns'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/search-form'
import * as UserService from '@/services/UserService'
import * as LocationService from '@/services/LocationService'
import LocationSelectList from '@/components/LocationSelectList'
import DateTimePicker from '@/components/DateTimePicker'

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

  let _minDate = new Date()
  _minDate = addHours(_minDate, env.MIN_PICK_UP_HOURS)

  const [pickupLocation, setPickupLocation] = useState('')
  const [selectedPickupLocation, setSelectedPickupLocation] = useState<bookcarsTypes.Location | undefined>(undefined)
  const [dropOffLocation, setDropOffLocation] = useState('')
  const [selectedDropOffLocation, setSelectedDropOffLocation] = useState<bookcarsTypes.Location | undefined>(undefined)
  const [minDate, setMinDate] = useState(_minDate)
  const [from, setFrom] = useState<Date>()
  const [to, setTo] = useState<Date>()
  const [sameLocation, setSameLocation] = useState(true)
  const [fromError, setFromError] = useState(false)
  const [toError, setToError] = useState(false)
  const [ranges, setRanges] = useState(bookcarsHelper.getAllRanges())
  const [minPickupHoursError, setMinPickupHoursError] = useState(false)
  const [minRentalHoursError, setMinRentalHoursError] = useState(false)

  useEffect(() => {
    const _from = new Date()
    _from.setDate(_from.getDate() + 3)
    _from.setHours(10)
    _from.setMinutes(0)
    _from.setSeconds(0)
    _from.setMilliseconds(0)

    const _to = new Date(_from)
    _to.setDate(_to.getDate() + 3)

    let __minDate = new Date()
    __minDate = addHours(__minDate, env.MIN_RENTAL_HOURS)

    setMinDate(__minDate)
    setFrom(_from)
    setTo(_to)
  }, [])

  useEffect(() => {
    const init = async () => {
      if (__pickupLocation) {
        const location = await LocationService.getLocation(__pickupLocation)
        setSelectedPickupLocation(location)
        setPickupLocation(__pickupLocation)
        if (sameLocation) {
          setDropOffLocation(__pickupLocation)
        } else {
          setSameLocation(dropOffLocation === __pickupLocation)
        }
      }
    }
    init()
  }, [__pickupLocation]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const init = async () => {
      if (__dropOffLocation) {
        const location = await LocationService.getLocation(__dropOffLocation)
        setSelectedDropOffLocation(location)
        setDropOffLocation(__dropOffLocation)
        setSameLocation(pickupLocation === __dropOffLocation)
      }
    }
    init()
  }, [__dropOffLocation]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (from) {
      let __minDate = new Date(from)
      __minDate = addHours(__minDate, env.MIN_RENTAL_HOURS)
      setMinDate(__minDate)

      if (from.getTime() - Date.now() < env.MIN_PICK_UP_HOURS * 60 * 60 * 1000) {
        setMinPickupHoursError(true)
      } else {
        setMinPickupHoursError(false)
      }
    }

    if (from && to) {
      if (from.getTime() > to.getTime()) {
        const _to = new Date(from)
        _to.setDate(_to.getDate() + 1)
        setTo(_to)
      } else if (to.getTime() - from.getTime() < env.MIN_RENTAL_HOURS * 60 * 60 * 1000) {
        setMinRentalHoursError(true)
      } else {
        setMinRentalHoursError(false)
      }
    }
  }, [from, to])

  useEffect(() => {
    setRanges(__ranges || bookcarsHelper.getAllRanges())
  }, [__ranges])

  const handlePickupLocationChange = async (values: bookcarsTypes.Option[]) => {
    const _pickupLocation = (values.length > 0 && values[0]._id) || ''
    setPickupLocation(_pickupLocation)

    if (_pickupLocation) {
      const location = await LocationService.getLocation(_pickupLocation)
      setSelectedPickupLocation(location)
    } else {
      setSelectedPickupLocation(undefined)
    }

    if (sameLocation) {
      setDropOffLocation(_pickupLocation)
    }
  }

  const handleSameLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSameLocation(e.target.checked)

    if (e.target.checked) {
      setDropOffLocation(pickupLocation)
    } else {
      setDropOffLocation('')
    }
  }

  const handleDropOffLocationChange = async (values: bookcarsTypes.Option[]) => {
    const _dropOffLocation = (values.length > 0 && values[0]._id) || ''
    setDropOffLocation(_dropOffLocation)

    if (_dropOffLocation) {
      const location = await LocationService.getLocation(_dropOffLocation)
      setSelectedDropOffLocation(location)
    } else {
      setSelectedDropOffLocation(undefined)
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!pickupLocation || !dropOffLocation || !from || !to || fromError || toError || minPickupHoursError || minRentalHoursError) {
      return
    }

    // navigate('/search', {
    //   state: {
    //     pickupLocationId: pickupLocation,
    //     dropOffLocationId: dropOffLocation,
    //     from,
    //     to,
    //     ranges,
    //   },
    // })

    setTimeout(navigate, 0, '/search', {
      state: {
        pickupLocationId: pickupLocation,
        dropOffLocationId: dropOffLocation,
        from,
        to,
        ranges,
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="home-search-form">
      <FormControl className="pickup-location">
        <LocationSelectList
          label={commonStrings.PICK_UP_LOCATION}
          hidePopupIcon
          // customOpen={env.isMobile}
          // init={!env.isMobile}
          init
          required
          variant="outlined"
          value={selectedPickupLocation}
          onChange={handlePickupLocationChange}
        />
      </FormControl>
      <FormControl className="from">
        <DateTimePicker
          label={strings.PICK_UP_DATE}
          value={from}
          minDate={_minDate}
          variant="outlined"
          required
          onChange={(date) => {
            if (date) {
              setFrom(date)
              setFromError(false)
            } else {
              setFrom(undefined)
              setMinDate(_minDate)
            }
          }}
          onError={(err: DateTimeValidationError) => {
            if (err) {
              setFromError(true)
            } else {
              setFromError(false)
            }
          }}
          language={UserService.getLanguage()}
        />
        <FormHelperText error={minPickupHoursError}>{(minPickupHoursError && strings.MIN_PICK_UP_HOURS_ERROR) || ''}</FormHelperText>
      </FormControl>
      <FormControl className="to">
        <DateTimePicker
          label={strings.DROP_OFF_DATE}
          value={to}
          minDate={minDate}
          variant="outlined"
          required
          onChange={(date) => {
            if (date) {
              setTo(date)
              setToError(false)
            } else {
              setTo(undefined)
            }
          }}
          onError={(err: DateTimeValidationError) => {
            if (err) {
              setToError(true)
            } else {
              setToError(false)
            }
          }}
          language={UserService.getLanguage()}
        />
        <FormHelperText error={minRentalHoursError}>{(minRentalHoursError && strings.MIN_RENTAL_HOURS_ERROR) || ''}</FormHelperText>
      </FormControl>
      <Button type="submit" variant="contained" className="btn-search">
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
            label={commonStrings.DROP_OFF_LOCATION}
            hidePopupIcon
            // customOpen={env.isMobile}
            // init={!env.isMobile}
            init
            value={selectedDropOffLocation}
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
