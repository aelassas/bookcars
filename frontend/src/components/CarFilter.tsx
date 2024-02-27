import React, { useState, useEffect } from 'react'
import { FormControl, Button } from '@mui/material'
import * as bookcarsTypes from 'bookcars-types'
import { strings as commonStrings } from '../lang/common'
import { strings } from '../lang/home'
import * as UserService from '../services/UserService'
import LocationSelectList from './LocationSelectList'
import DateTimePicker from './DateTimePicker'

import '../assets/css/car-filter.css'

interface CarFilterProps {
  from: Date
  to: Date
  pickupLocation: bookcarsTypes.Location
  dropOffLocation: bookcarsTypes.Location
  className?: string
  onSubmit: bookcarsTypes.CarFilterSubmitEvent
}

const CarFilter = ({
  from: filterFrom,
  to: filterTo,
  pickupLocation: filterPickupLocation,
  dropOffLocation: filterDropOffLocation,
  className,
  onSubmit
}: CarFilterProps) => {
  const _minDate = new Date()
  _minDate.setDate(_minDate.getDate() + 1)

  const [from, setFrom] = useState<Date | undefined>(filterFrom)
  const [to, setTo] = useState<Date | undefined>(filterTo)
  const [minDate, setMinDate] = useState<Date>()
  const [pickupLocation, setPickupLocation] = useState<bookcarsTypes.Location | null | undefined>(filterPickupLocation)
  const [dropOffLocation, setDropOffLocation] = useState<bookcarsTypes.Location | null | undefined>(filterDropOffLocation)
  const [sameLocation, setSameLocation] = useState(filterPickupLocation === filterDropOffLocation)

  useEffect(() => {
    if (filterFrom) {
      const __minDate = new Date(filterFrom)
      __minDate.setDate(filterFrom.getDate() + 1)
      setMinDate(__minDate)
    }
  }, [filterFrom])

  const handlePickupLocationChange = (values: bookcarsTypes.Option[]) => {
    const _pickupLocation = (values.length > 0 && values[0]) || null

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
    setDropOffLocation((values.length > 0 && values[0]) || null)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!pickupLocation || !dropOffLocation || !from || !to) {
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
    <div className={`${className ? `${className} ` : ''}car-filter`}>
      <form onSubmit={handleSubmit} className="home-search-form">
        <FormControl fullWidth className="pickup-location">
          <LocationSelectList
            label={commonStrings.PICKUP_LOCATION}
            hidePopupIcon
            customOpen
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
              customOpen
              required
              variant="standard"
              onChange={handleDropOffLocationChange}
            />
          </FormControl>
        )}
        <FormControl fullWidth className="from">
          <DateTimePicker
            label={commonStrings.FROM}
            value={from}
            minDate={new Date()}
            variant="standard"
            required
            onChange={(date) => {
              if (date) {
                if (to && to.getTime() <= date.getTime()) {
                  setTo(undefined)
                }

                const __minDate = new Date(date)
                __minDate.setDate(date.getDate() + 1)
                setMinDate(__minDate)
              } else {
                setMinDate(_minDate)
              }

              setFrom(date || undefined)
            }}
            language={UserService.getLanguage()}
          />
        </FormControl>
        <FormControl fullWidth className="to">
          <DateTimePicker
            label={commonStrings.TO}
            value={to}
            minDate={minDate}
            variant="standard"
            required
            onChange={(date) => {
              setTo(date || undefined)
            }}
            language={UserService.getLanguage()}
          />
        </FormControl>
        <FormControl fullWidth className="search">
          <Button type="submit" variant="contained" className="btn-search">
            {commonStrings.SEARCH}
          </Button>
        </FormControl>
        <FormControl fullWidth className="chk-same-location">
          <input
            id="chk-same-location"
            type="checkbox"
            checked={sameLocation}
            onChange={handleSameLocationChange}
          />
          <label
            htmlFor="chk-same-location"
          >
            {strings.DROP_OFF}
          </label>
        </FormControl>
      </form>
    </div>
  )
}

export default CarFilter
