import React, { useState } from 'react'
import {
  FormControl,
  TextField,
  Button,
  IconButton
} from '@mui/material'
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material'
import * as bookcarsTypes from 'bookcars-types'
import * as bookcarsHelper from 'bookcars-helper'
import { strings as commonStrings } from '../lang/common'
import { strings } from '../lang/booking-filter'
import LocationSelectList from './LocationSelectList'
import DatePicker from './DatePicker'
import Accordion from '../components/Accordion'

import '../assets/css/booking-filter.css'

function BookingFilter({
  collapse,
  className,
  language,
  onSubmit
}:
  {
    collapse?: boolean,
    className?: string,
    language?: string,
    onSubmit?: (filter: bookcarsTypes.Filter | null) => void
  }) {
  const [from, setFrom] = useState<Date>()
  const [to, setTo] = useState<Date>()
  const [pickupLocation, setPickupLocation] = useState('')
  const [dropOffLocation, setDropOffLocation] = useState('')
  const [keyword, setKeyword] = useState('')
  const [minDate, setMinDate] = useState<Date>()

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value)
  }

  const handlePickupLocationChange = (locations: bookcarsTypes.Option[]) => {
    setPickupLocation(locations.length > 0 ? locations[0]._id : '')
  }

  const handleDropOffLocationChange = (locations: bookcarsTypes.Option[]) => {
    setDropOffLocation(locations.length > 0 ? locations[0]._id : '')
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement> | React.KeyboardEvent<HTMLElement>) => {
    e.preventDefault()

    let filter: bookcarsTypes.Filter | null = {
      from,
      to,
      pickupLocation,
      dropOffLocation,
      keyword
    }

    if (!from && !to && !pickupLocation && !dropOffLocation && !keyword) {
      filter = null
    }
    if (onSubmit) {
      onSubmit(bookcarsHelper.clone(filter))
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter') {
      handleSubmit(e)
    }
  }

  return (
    <Accordion title={commonStrings.SEARCH} collapse={collapse} className={`${className ? `${className} ` : ''}booking-filter`}>
      <form onSubmit={handleSubmit}>
        <FormControl fullWidth margin="dense">
          <DatePicker
            label={commonStrings.FROM}
            onChange={(date) => {
              if (date) {
                if (to && to.getTime() <= date.getTime()) {
                  setTo(undefined)
                }

                const _minDate = new Date(date)
                _minDate.setDate(date.getDate() + 1)
                setMinDate(_minDate)
              } else {
                setMinDate(undefined)
              }

              setFrom(date || undefined)
            }}
            language={language}
            variant="standard"
            value={from}
          />
        </FormControl>
        <FormControl fullWidth margin="dense">
          <DatePicker
            label={commonStrings.TO}
            minDate={minDate}
            onChange={(date) => {
              setTo(date || undefined)
            }}
            language={language}
            variant="standard"
            value={to}
          />
        </FormControl>
        <FormControl fullWidth margin="dense">
          <LocationSelectList
            label={strings.PICKUP_LOCATION}
            variant="standard"
            onChange={handlePickupLocationChange}
          />
        </FormControl>
        <FormControl fullWidth margin="dense">
          <LocationSelectList
            label={strings.DROP_OFF_LOCATION}
            variant="standard"
            onChange={handleDropOffLocationChange}
          />
        </FormControl>
        <FormControl fullWidth margin="dense">
          <TextField
            variant="standard"
            value={keyword}
            onKeyDown={handleSearchKeyDown}
            onChange={handleSearchChange}
            placeholder={commonStrings.SEARCH_PLACEHOLDER}
            InputProps={{
              endAdornment: keyword ? (
                <IconButton
                  size="small"
                  onClick={() => {
                    setKeyword('')
                  }}
                >
                  <ClearIcon className="d-adornment-icon" />
                </IconButton>
              ) : (
                <SearchIcon className="d-adornment-icon" />
              ),
            }}
            autoComplete="off"
            className="bf-search"
          />
        </FormControl>
        <Button type="submit" variant="contained" className="btn-primary btn-search" fullWidth>
          {commonStrings.SEARCH}
        </Button>
      </form>
    </Accordion>
  )
}

export default BookingFilter
