import React, { useEffect, useState } from 'react'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DateTimePicker as MuiDateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { fr, enUS, es } from 'date-fns/locale'
import { TextFieldVariants } from '@mui/material'
import { DateTimeValidationError, PickersActionBarAction } from '@mui/x-date-pickers'

interface DateTimePickerProps {
  value?: Date
  label?: string
  minDate?: Date
  maxDate?: Date
  required?: boolean
  language?: string
  variant?: TextFieldVariants
  readOnly?: boolean
  showClear?: boolean
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
  showClear,
  onChange,
  onError
}: DateTimePickerProps) => {
  const [value, setValue] = useState<Date | null>(null)

  useEffect(() => {
    setValue(dateTimeValue || null)
  }, [dateTimeValue])

  const actions: PickersActionBarAction[] = ['accept', 'cancel']

  if (showClear) {
    actions.push('clear')
  }

  return (
    <LocalizationProvider adapterLocale={language === 'fr' ? fr : language === 'es' ? es : enUS} dateAdapter={AdapterDateFns}>
      <MuiDateTimePicker
        label={label}
        value={value}
        readOnly={readOnly}
        views={['year', 'month', 'day', 'hours', 'minutes']}
        onChange={(_value) => {
          setValue(_value)

          if (onChange) {
            onChange(_value)
          }

          if (_value && minDate) {
            const val = new Date(_value)
            val.setHours(0, 0, 0, 0)
            const min = new Date(minDate)
            min.setHours(0, 0, 0, 0)

            if (val < min && onError) {
              onError('minDate', _value)
            }
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
            actions,
          },
        }}
      />
    </LocalizationProvider>
  )
}

export default DateTimePicker
