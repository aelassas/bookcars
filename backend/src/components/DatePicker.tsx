import React, { useEffect, useState } from 'react'
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
    readOnly,
    onChange
  }
    : {
      value?: Date
      label?: string
      minDate?: Date
      required?: boolean
      language?: string
      variant?: TextFieldVariants
      readOnly?: boolean
      onChange?: (value: Date | null) => void
    }
) => {
  const [value, setValue] = useState<Date | null>(null)

  useEffect(() => {
    setValue(dateValue || null)
  }, [dateValue])

  return (
    <LocalizationProvider adapterLocale={language === 'fr' ? fr : enUS} dateAdapter={AdapterDateFns}>
      <MuiDatePicker
        label={label}
        views={['year', 'month', 'day']}
        value={value}
        readOnly={readOnly}
        onAccept={(value) => {
          if (value) {
            const date = value as Date
            date.setHours(10, 0, 0, 0)
          }
          setValue(value)

          if (onChange) {
            onChange(value)
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
