import React, { useEffect, useState } from 'react'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DatePicker as MuiDatePicker } from '@mui/x-date-pickers/DatePicker'
import { fr, enUS } from 'date-fns/locale'
import { TextFieldVariants } from '@mui/material'
import { DateValidationError } from '@mui/x-date-pickers'

interface DatePickerProps {
  value?: Date
  label?: string
  minDate?: Date
  maxDate?: Date
  required?: boolean
  language?: string
  variant?: TextFieldVariants
  readOnly?: boolean
  onChange?: (value: Date | null) => void
  onError?: (error: DateValidationError, value: Date | null) => void
}

const DatePicker = ({
  value: dateValue,
  label,
  minDate,
  maxDate,
  required,
  language,
  variant,
  readOnly,
  onChange,
  onError
}: DatePickerProps) => {
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
        onChange={(_value) => {
          if (_value) {
            const date = _value as Date
            date.setHours(10, 0, 0, 0)
          }
          setValue(_value)

          if (onChange) {
            onChange(_value)
          }

          if (_value && minDate && _value < minDate && onError) {
            onError('minDate', _value)
          }
        }}
        onError={onError}
        minDate={minDate}
        maxDate={maxDate}
        slotProps={{
          textField: {
            variant: variant || 'standard',
            required,
          },
          actionBar: {
            actions: ['accept', 'cancel', 'clear'],
          },
        }}
      />
    </LocalizationProvider>
  )
}

export default DatePicker
