import React, { useEffect, useState } from 'react'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DateTimePicker as MuiDateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { fr, enUS } from 'date-fns/locale'
import { TextFieldVariants } from '@mui/material'
import { DateTimeValidationError } from '@mui/x-date-pickers'

interface DateTimePickerProps {
  value?: Date
  label?: string
  minDate?: Date
  maxDate?: Date
  required?: boolean
  language?: string
  variant?: TextFieldVariants
  readOnly?: boolean
  onChange?: (value: Date | null) => void
  onError?: (error: DateTimeValidationError, value: Date | null) => void
}

const DateTimePicker = ({
  value: dateTimeValue,
  label,
  minDate,
  maxDate,
  required,
  variant,
  language,
  readOnly,
  onChange,
  onError
}: DateTimePickerProps) => {
  const [value, setValue] = useState<Date | null>(null)

  useEffect(() => {
    setValue(dateTimeValue || null)
  }, [dateTimeValue])

  return (
    <LocalizationProvider adapterLocale={language === 'fr' ? fr : enUS} dateAdapter={AdapterDateFns}>
      <MuiDateTimePicker
        label={label}
        value={value}
        readOnly={readOnly}
        onChange={(_value) => {
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
        timeSteps={{ hours: 1, minutes: 5 }}
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

export default DateTimePicker
