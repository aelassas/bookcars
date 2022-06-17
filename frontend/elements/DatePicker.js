import React, { Component } from 'react';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker as MuiDatePicker } from '@mui/x-date-pickers/DatePicker';
import { TextField, IconButton, InputAdornment } from '@mui/material';
import { Clear as ClearIcon } from '@mui/icons-material';
import { fr, enUS } from "date-fns/locale";

class DatePicker extends Component {

    constructor(props) {
        super(props);
        this.state = { value: null };
    }

    componentDidMount() {
        if (this.props.value) this.setState({ value: this.props.value });
    }

    render() {
        const { value } = this.state;

        return (
            <LocalizationProvider adapterLocale={this.props.language === 'fr' ? fr : enUS} dateAdapter={AdapterDateFns}>
                <MuiDatePicker
                    label={this.props.label}
                    views={['year', 'month', 'day']}
                    inputFormat='dd-MM-yyyy'
                    mask='__-__-____'
                    value={value}
                    onChange={(value) => {
                        this.setState({ value }, () => {
                            if (this.props.onChange) this.props.onChange(value);
                        });
                    }}
                    minDate={this.props.minDate}
                    defaultCalendarMonth={this.props.minDate}
                    required={this.props.required}
                    renderInput={(params) =>
                        <TextField {...params}
                            variant={this.props.variant || 'standard'}
                            fullWidth
                            required={this.props.required}
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
                                                            this.setState({ value: null });
                                                            if (this.props.onChange) this.props.onChange(null);
                                                        }}>
                                                        <ClearIcon className='d-adornment-icon' />
                                                    </IconButton>
                                                </InputAdornment>
                                            )
                                        }
                                        {params.InputProps.endAdornment}
                                    </>
                            }} />
                    }
                />
            </LocalizationProvider>
        );
    }
}

export default DatePicker;