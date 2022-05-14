import React, { Component } from 'react';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/booking-filter'
import LocationList from '../elements/LocationList';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { FormControl, TextField, Button } from '@mui/material';

import '../assets/css/booking-filter.css';

class BookingFilter extends Component {

    constructor(props) {
        super(props);

        this.state = {
            from: null,
            to: null,
            pickupLocation: null,
            dropOffLocation: null
        };
    }

    handlePickupLocationChange = (locations) => {
        this.setState({ pickupLocation: locations.length > 0 ? locations[0]._id : null });
    };

    handleDropOffLocationChange = (locations) => {
        this.setState({ dropOffLocation: locations.length > 0 ? locations[0]._id : null });
    };

    handleSubmit = (e) => {
        e.preventDefault();

        const { from, to, pickupLocation, dropOffLocation } = this.state;
        const filter = { from, to, pickupLocation, dropOffLocation };

        if (this.props.onSubmit) {
            this.props.onSubmit(filter);
        }
    }

    render() {
        const { from, to } = this.state;

        return (
            <div className={`${this.props.className ? `${this.props.className} ` : ''}booking-filter`}>
                <form onSubmit={this.handleSubmit}>
                    <FormControl fullWidth margin="dense">
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                            <DatePicker
                                label={commonStrings.FROM}
                                inputFormat='dd-MM-yyyy'
                                mask='__-__-____'
                                value={from}
                                onChange={(from) => {
                                    this.setState({ from })
                                }}
                                renderInput={(params) => <TextField {...params} fullWidth />}
                            />
                        </LocalizationProvider>
                    </FormControl>
                    <FormControl fullWidth margin="dense">
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                            <DatePicker
                                label={commonStrings.TO}
                                inputFormat='dd-MM-yyyy'
                                mask='__-__-____'
                                value={to}
                                onChange={(to) => {
                                    this.setState({ to })
                                }}
                                renderInput={(params) => <TextField {...params} fullWidth />}
                            />
                        </LocalizationProvider>
                    </FormControl>
                    <FormControl fullWidth margin="dense">
                        <LocationList
                            label={strings.PICKUP_LOCATION}
                            required={false}
                            multiple={false}
                            variant='standard'
                            onChange={this.handlePickupLocationChange}
                        />
                    </FormControl>
                    <FormControl fullWidth margin="dense">
                        <LocationList
                            label={strings.DROP_OFF_LOCATION}
                            required={false}
                            multiple={false}
                            variant='standard'
                            onChange={this.handleDropOffLocationChange}
                        />
                    </FormControl>
                    <Button
                        type="submit"
                        variant="contained"
                        className='btn-primary btn-search'
                        fullWidth
                    >
                        {commonStrings.SEARCH}
                    </Button>
                </form>
            </div >
        );
    }
}

export default BookingFilter;