import React, { useState, useRef } from 'react'
import {
  FormControl,
  TextField,
  Button,
  IconButton
} from '@mui/material'
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/booking-filter'
import LocationSelectList from './LocationSelectList'
import Accordion from '@/components/Accordion'

import '@/assets/css/vehicle-scheduler-filter.css'

interface VehicleSchedulerFilterProps {
  collapse?: boolean
  className?: string
  onSubmit?: (filter: bookcarsTypes.Filter | null) => void
}

const VehicleSchedulerFilter = ({
  collapse,
  className,
  onSubmit
}: VehicleSchedulerFilterProps) => {
  const [pickupLocation, setPickupLocation] = useState('')
  const [dropOffLocation, setDropOffLocation] = useState('')
  const [keyword, setKeyword] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)

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
      pickupLocation,
      dropOffLocation,
      keyword
    }

    if (!pickupLocation && !dropOffLocation && !keyword) {
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
    <Accordion title={commonStrings.SEARCH} collapse={collapse} className={`${className ? `${className} ` : ''}vehicle-scheduler-filter`}>
      <form autoComplete="off" onSubmit={handleSubmit}>
        <input autoComplete="false" name="hidden" type="text" style={{ display: 'none' }} />
        <FormControl fullWidth margin="dense">
          <LocationSelectList
            label={strings.PICK_UP_LOCATION}
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
            inputRef={inputRef}
            variant="standard"
            value={keyword}
            onKeyDown={handleSearchKeyDown}
            onChange={handleSearchChange}
            placeholder={commonStrings.SEARCH_PLACEHOLDER}
            slotProps={{
              input: {
                endAdornment: keyword ? (
                  <IconButton
                    size="small"
                    onClick={() => {
                      setKeyword('')
                      inputRef.current?.focus()
                    }}
                  >
                    <ClearIcon className="d-adornment-icon" />
                  </IconButton>
                ) : (
                  <SearchIcon className="d-adornment-icon" />
                ),
              }
            }}
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

export default VehicleSchedulerFilter
