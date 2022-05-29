import React, { Component } from 'react';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker as MuiDateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { TextField } from '@mui/material';
import { fr, enUS } from "date-fns/locale";

class DateTimePicker extends Component {

    constructor(props) {
        super(props);
        this.state = { value: null };
    }

    componentDidMount() {
        if (this.props.value) this.setState({ value: this.props.value });
    }

    render() {
        const { value } = this.state;
        const locale = this.props.language === 'fr' ? 'fr-FR' : 'en-US';
        const options = { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' };

        return (
            <LocalizationProvider adapterLocale={this.props.language === 'fr' ? fr : enUS} dateAdapter={AdapterDateFns}>
                <MuiDateTimePicker
                    label={this.props.label}
                    showToolbar
                    value={value}
                    readOnly={this.props.readOnly}
                    onChange={(value) => {
                        this.setState({ value }, () => {
                            if (this.props.onChange) this.props.onChange(value);
                        });
                    }}
                    minDate={this.props.minDate}
                    defaultCalendarMonth={this.props.minDate}
                    required={this.props.required}

                    renderInput={(params) => <TextField
                        {...params}
                        variant={this.props.variant || 'standard'}
                        fullWidth
                        autoComplete='off'
                        inputProps={{
                            ...params.inputProps,
                            value: ((value && value.toLocaleString(locale, options)) || ''),
                            readOnly: true
                        }}
                    />
                    }

                />
            </LocalizationProvider>
        );
    }
}

export default DateTimePicker;