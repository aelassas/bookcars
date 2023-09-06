import React, { useState } from 'react'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DatePicker as MuiDatePicker } from '@mui/x-date-pickers/DatePicker'
import { fr, enUS } from 'date-fns/locale'
import { TextFieldVariants } from '@mui/material'

const DatePicker = (
  {
    value: dateValue,
    label,
    minDate,
    required,
    language,
    variant,
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
  const [value, setValue] = useState(dateValue || null)

  return (
    <LocalizationProvider adapterLocale={language === 'fr' ? fr : enUS} dateAdapter={AdapterDateFns}>
      <MuiDatePicker
        label={label}
        views={['year', 'month', 'day']}
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

export default DatePicker
