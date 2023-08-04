import React, { useState } from 'react'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DateTimePicker as MuiDateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { fr, enUS } from 'date-fns/locale'

const DateTimePicker = (props) => {
  const [value, setValue] = useState(props.value || null)

  return (
    <LocalizationProvider adapterLocale={props.language === 'fr' ? fr : enUS} dateAdapter={AdapterDateFns}>
      <MuiDateTimePicker
        label={props.label}
        inputFormat="dd-MM-yyyy HH:mm"
        mask="__-__-____ __:__"
        showToolbar
        value={value}
        onChange={(value) => {
          setValue(value)
          if (props.onChange) props.onChange(value)
        }}
        minDate={props.minDate}
        defaultCalendarMonth={props.minDate}
        slotProps={{
          textField: {
            variant: props.variant || 'standard',
            required: props.required,
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
