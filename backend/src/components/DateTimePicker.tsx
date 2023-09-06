import React, { useState } from 'react'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DateTimePicker as MuiDateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { fr, enUS } from 'date-fns/locale'
import { TextFieldVariants } from '@mui/material'

const DateTimePicker = (
  {
    value: dateTimeValue,
    label,
    minDate,
    required,
    variant,
    language,
    onChange
  }
    : {
      value?: Date
      label?: string
      minDate?: Date
      required?: boolean
      language?: string
      variant?: TextFieldVariants
      onChange: (value: Date) => void
    }
) => {
  const [value, setValue] = useState(dateTimeValue || null)

  return (
    <LocalizationProvider adapterLocale={language === 'fr' ? fr : enUS} dateAdapter={AdapterDateFns}>
      <MuiDateTimePicker
        label={label}
        // showToolbar
        value={value}
        onChange={(value) => {
          const date = value as Date
          setValue(date)
          if (onChange) {
            onChange(date)
          }
        }}
        minDate={minDate}
        defaultCalendarMonth={minDate}
        slotProps={{
          textField: {
            variant: (variant as TextFieldVariants) || 'standard',
            required: required,
          },
          actionBar: {
            actions: ['accept', 'cancel', 'today', 'clear'],
          },
        }}
      />
    </LocalizationProvider>
  )
}

export default DateTimePicker
