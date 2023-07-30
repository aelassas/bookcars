import React, { useState } from 'react'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DatePicker as MuiDatePicker } from '@mui/x-date-pickers/DatePicker'
import { fr, enUS } from "date-fns/locale"

const DatePicker = (props) => {
    const [value, setValue] = useState(props.value || null)

    return (
        <LocalizationProvider adapterLocale={props.language === 'fr' ? fr : enUS} dateAdapter={AdapterDateFns}>
            <MuiDatePicker
                label={props.label}
                inputFormat='dd-MM-yyyy'
                views={['year', 'month', 'day']}
                mask='__-__-____'
                value={value}
                onChange={(value) => {
                    setValue(value)
                    if (props.onChange) props.onChange(value)
                }}
                minDate={props.minDate}
                defaultCalendarMonth={props.minDate}
                slotProps={{
                    textField: {
                        variant: 'standard',
                        required: props.required
                    },
                    actionBar: {
                        actions: ['accept', 'cancel', 'today', 'clear']
                    }
                }}
            />
        </LocalizationProvider>
    )
}

export default DatePicker