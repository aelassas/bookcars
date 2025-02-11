import React, { useState, useEffect } from 'react'
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
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/search-form'
import * as UserService from '@/services/UserService'
import LocationSelectList from './LocationSelectList'
import DateTimePicker from './DateTimePicker'
import Accordion from './Accordion'

import '@/assets/css/car-filter.css'

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

  const [from, setFrom] = useState<Date | undefined>(filterFrom)
  const [to, setTo] = useState<Date | undefined>(filterTo)
  const [minDate, setMinDate] = useState<Date>()
  const [pickupLocation, setPickupLocation] = useState<bookcarsTypes.Location | null | undefined>(filterPickupLocation)
  const [dropOffLocation, setDropOffLocation] = useState<bookcarsTypes.Location | null | undefined>(filterDropOffLocation)
  const [sameLocation, setSameLocation] = useState(filterPickupLocation === filterDropOffLocation)
  const [fromError, setFromError] = useState(false)
  const [toError, setToError] = useState(false)
  const [offsetHeight, setOffsetHeight] = useState(0)
  const [minPickupHoursError, setMinPickupHoursError] = useState(false)
  const [minRentalHoursError, setMinRentalHoursError] = useState(false)

  useEffect(() => {
    if (filterFrom) {
      let __minDate = new Date(filterFrom)
      __minDate = addHours(__minDate, env.MIN_RENTAL_HOURS)
      setMinDate(__minDate)
    }
  }, [filterFrom])

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
        if (env.MIN_RENTAL_HOURS < 24) {
          _to.setDate(_to.getDate() + 1)
        } else {
          _to.setDate(_to.getDate() + Math.ceil(env.MIN_RENTAL_HOURS / 24) + 1)
        }
        setTo(_to)
      } else if (to.getTime() - from.getTime() < env.MIN_RENTAL_HOURS * 60 * 60 * 1000) {
        setMinRentalHoursError(true)
      } else {
        setMinRentalHoursError(false)
      }
    }
  }, [from, to])

  useEffect(() => {
    setPickupLocation(filterPickupLocation)
  }, [filterPickupLocation])

  useEffect(() => {
    setDropOffLocation(filterDropOffLocation)
  }, [filterDropOffLocation])

  useEffect(() => {
    setSameLocation(pickupLocation?._id === dropOffLocation?._id)
  }, [pickupLocation, dropOffLocation])

  useEffect(() => {
    if (sameLocation) {
      setOffsetHeight(0)
    } else {
      setOffsetHeight(56)
    }
  }, [sameLocation])

  const handlePickupLocationChange = (values: bookcarsTypes.Option[]) => {
    const _pickupLocation = (values.length > 0 && values[0]) as bookcarsTypes.Location || null

    setPickupLocation(_pickupLocation)

    if (sameLocation) {
      setDropOffLocation(_pickupLocation)
    }
  }

  const handleSameLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSameLocation(e.target.checked)

    if (e.target.checked) {
      setDropOffLocation(pickupLocation)
    }
  }

  const handleDropOffLocationChange = (values: bookcarsTypes.Option[]) => {
    setDropOffLocation((values.length > 0 && values[0]) as bookcarsTypes.Location || null)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!pickupLocation || !dropOffLocation || !from || !to || fromError || toError || minPickupHoursError || minRentalHoursError) {
      return
    }

    if (onSubmit) {
      const filter: bookcarsTypes.CarFilter = {
        pickupLocation, dropOffLocation, from, to
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
      <form onSubmit={handleSubmit}>
        <FormControl fullWidth className="pickup-location">
          <LocationSelectList
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
            label={strings.PICK_UP_DATE}
            value={from}
            minDate={_minDate}
            variant="standard"
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
        <FormControl fullWidth className="to">
          <DateTimePicker
            label={strings.DROP_OFF_DATE}
            value={to}
            minDate={minDate}
            variant="standard"
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
        <FormControl fullWidth className="fc-search">
          <Button type="submit" variant="contained" className="btn-primary btn-search">
            {commonStrings.SEARCH}
          </Button>
        </FormControl>
        <FormControl fullWidth className="chk-same-location">
          <FormControlLabel control={<Checkbox checked={sameLocation} onChange={handleSameLocationChange} />} label={strings.DROP_OFF} />
        </FormControl>
      </form>
    </Accordion>
  )
}

export default CarFilter
