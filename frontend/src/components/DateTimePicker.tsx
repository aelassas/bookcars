import React, { useEffect, useState } from 'react'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DateTimePicker as MuiDateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { fr, enUS } from 'date-fns/locale'
import { TextFieldVariants } from '@mui/material'

interface DateTimePickerProps {
  value?: Date
  label?: string
  minDate?: Date
  required?: boolean
  language?: string
  variant?: TextFieldVariants
  readOnly?: boolean
  onChange?: (value: Date | null) => void
}

const DateTimePicker = ({
  value: dateTimeValue,
  label,
  minDate,
  required,
  variant,
  language,
  readOnly,
  onChange
}: DateTimePickerProps) => {
  const [value, setValue] = useState<Date | null>(null)

  useEffect(() => {
    setValue(dateTimeValue || null)
  }, [dateTimeValue])

  return (
    <LocalizationProvider adapterLocale={language === 'fr' ? fr : enUS} dateAdapter={AdapterDateFns}>
      <MuiDateTimePicker
        label={label}
        // showToolbar
        value={value}
        readOnly={readOnly}
        onAccept={(_value) => {
          setValue(_value)

          if (onChange) {
            onChange(_value)
          }
        }}
        minDate={minDate}
        defaultCalendarMonth={minDate}
        slotProps={{
          textField: {
            variant: variant || 'standard',
            required,
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
