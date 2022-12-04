import React, { useState } from 'react';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker as MuiDateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { TextField, IconButton, InputAdornment } from '@mui/material';
import { Clear as ClearIcon } from '@mui/icons-material';
import { fr, enUS } from "date-fns/locale";

const DateTimePicker = (props) => {
    const [value, setValue] = useState(props.value || null);

    return (
        <LocalizationProvider adapterLocale={props.language === 'fr' ? fr : enUS} dateAdapter={AdapterDateFns}>
            <MuiDateTimePicker
                label={props.label}
                inputFormat='dd-MM-yyyy HH:mm'
                mask='__-__-____ __:__'
                showToolbar
                value={value}
                onChange={(value) => {
                    setValue(value);
                    if (props.onChange) props.onChange(value);
                }}
                minDate={props.minDate}
                defaultCalendarMonth={props.minDate}
                required={props.required}

                renderInput={(params) =>
                    <TextField
                        {...params}
                        variant={props.variant || 'standard'}
                        fullWidth
                        required={props.required}
                        autoComplete='off'
                        InputProps={{
                            ...params.InputProps,
                            endAdornment:
                                <>
                                    {
                                        value && (
                                            <InputAdornment position='end' className='d-adornment'>
                                                <IconButton
                                                    size='small'
                                                    onClick={() => {
                                                        setValue(null);
                                                        if (props.onChange) props.onChange(null);
                                                    }}>
                                                    <ClearIcon className='d-adornment-icon' />
                                                </IconButton>
                                            </InputAdornment>
                                        )
                                    }
                                    {params.InputProps.endAdornment}
                                </>
                        }}
                    />
                }

            />
        </LocalizationProvider>
    );
}

export default DateTimePicker;