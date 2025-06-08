import React, { useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { IconButton, TextField, FormControl, Button } from '@mui/material'
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/booking-filter'
import LocationSelectList from './LocationSelectList'
import DatePicker from './DatePicker'
import Accordion from '@/components/Accordion'
import { schema, FormFields } from '@/models/BookingFilterForm'

import '@/assets/css/booking-filter.css'

interface BookingFilterProps {
  collapse?: boolean
  className?: string
  language?: string
  onSubmit?: (filter: bookcarsTypes.Filter | null) => void
}

const BookingFilter = ({
  collapse,
  className,
  language,
  onSubmit
}: BookingFilterProps) => {
  const [minDate, setMinDate] = useState<Date | undefined>(undefined)
  const inputRef = useRef<HTMLInputElement>(null)

  const { control, register, handleSubmit, setValue, formState: { isSubmitting } } = useForm<FormFields>({
    resolver: zodResolver(schema),
    mode: 'onChange',
  })

  const from = useWatch({ control, name: 'from' })
  const to = useWatch({ control, name: 'to' })
  const keyword = useWatch({ control, name: 'keyword' })

  const handleFormSubmit = (data: FormFields) => {
    let filter: bookcarsTypes.Filter | null = {
      from: data.from,
      to: data.to,
      pickupLocation: data.pickupLocation,
      dropOffLocation: data.dropOffLocation,
      keyword: data.keyword,
    }

    if (
      !data.from &&
      !data.to &&
      !data.pickupLocation &&
      !data.dropOffLocation &&
      !data.keyword
    ) {
      filter = null
    }

    if (onSubmit) {
      onSubmit(bookcarsHelper.clone(filter))
    }
  }

  return (
    <Accordion
      title={commonStrings.SEARCH}
      collapse={collapse}
      className={`${className ? `${className} ` : ''}booking-filter`}
    >
      <form autoComplete="off" onSubmit={handleSubmit(handleFormSubmit)}>
        <input autoComplete="false" name="hidden" type="text" style={{ display: 'none' }} />
        <FormControl fullWidth margin="dense">
          <DatePicker
            label={commonStrings.FROM}
            value={from}
            onChange={(date) => {
              if (date) {
                if (to && to.getTime() <= date.getTime()) {
                  setValue('to', undefined)
                }

                const _minDate = new Date(date)
                _minDate.setDate(date.getDate() + 1)
                setMinDate(_minDate)
              } else {
                setMinDate(undefined)
              }

              setValue('from', date || undefined)
            }}
            language={language}
            variant="standard"

          />
        </FormControl>
        <FormControl fullWidth margin="dense">
          <DatePicker
            label={commonStrings.TO}
            minDate={minDate}
            value={to}
            onChange={(date) => setValue('to', date || undefined)}
            language={language}
            variant="standard"
          />
        </FormControl>
        <FormControl fullWidth margin="dense">
          <LocationSelectList
            label={strings.PICK_UP_LOCATION}
            variant="standard"
            onChange={(locations) => setValue('pickupLocation', locations.length > 0 ? locations[0]._id : '')}
            init
          />
        </FormControl>
        <FormControl fullWidth margin="dense">
          <LocationSelectList
            label={strings.DROP_OFF_LOCATION}
            variant="standard"
            onChange={(locations) => setValue('dropOffLocation', locations.length > 0 ? locations[0]._id : '')}
            init
          />
        </FormControl>
        <FormControl fullWidth margin="dense">
          <TextField
            {...register('keyword')}
            inputRef={inputRef}
            variant="standard"
            onChange={(e) => setValue('keyword', e.target.value)}
            placeholder={commonStrings.SEARCH_PLACEHOLDER}
            slotProps={{
              input: {
                endAdornment: keyword ? (
                  <IconButton
                    size="small"
                    onClick={() => {
                      setValue('keyword', '')
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
        <Button type="submit" variant="contained" className="btn-primary btn-search" fullWidth disabled={isSubmitting}>
          {commonStrings.SEARCH}
        </Button>
      </form>
    </Accordion>
  )
}

export default BookingFilter
