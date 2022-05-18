import React, { Component } from 'react';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/booking-filter'
import LocationSelectList from './LocationSelectList';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { FormControl, TextField, Button, IconButton, InputAdornment } from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material'

import '../assets/css/booking-filter.css';

class BookingFilter extends Component {

    constructor(props) {
        super(props);

        this.state = {
            from: null,
            to: null,
            pickupLocation: null,
            dropOffLocation: null,
            keyword: ''
        };
    }

    handleSearchChange = (e) => {
        this.setState({ keyword: e.target.value });
    };

    handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') {
            this.handleSubmit(e);
        }
    }

    handlePickupLocationChange = (locations) => {
        this.setState({ pickupLocation: locations.length > 0 ? locations[0]._id : null });
    };

    handleDropOffLocationChange = (locations) => {
        this.setState({ dropOffLocation: locations.length > 0 ? locations[0]._id : null });
    };

    handleSubmit = (e) => {
        e.preventDefault();

        const { from, to, pickupLocation, dropOffLocation, keyword } = this.state;
        let filter = { from, to, pickupLocation, dropOffLocation, keyword };

        if (!from && !to && !pickupLocation && !dropOffLocation && !keyword) filter = null;
        if (this.props.onSubmit) this.props.onSubmit(filter);
    }

    render() {
        const { from, to, keyword } = this.state;
        const inputAdornmentStyle = { marginRight: -13 };
        const iconStyle = { width: 20, height: 20, color: 'rgba(0, 0, 0, 0.54)' };

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
                                renderInput={(params) =>
                                    <TextField {...params}
                                        variant='standard'
                                        fullWidth
                                        autoComplete='off'
                                        InputProps={{
                                            ...params.InputProps,
                                            endAdornment:
                                                <>
                                                    {
                                                        from && (
                                                            <InputAdornment position='end' style={inputAdornmentStyle}>
                                                                <IconButton size='small' onClick={() => this.setState({ from: null })}>
                                                                    <ClearIcon style={iconStyle} />
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
                                renderInput={(params) =>
                                    <TextField {...params}
                                        variant='standard'
                                        fullWidth
                                        autoComplete='off'
                                        InputProps={{
                                            ...params.InputProps,
                                            endAdornment:
                                                <>
                                                    {
                                                        to && (
                                                            <InputAdornment position='end' style={inputAdornmentStyle}>
                                                                <IconButton size='small' onClick={() => this.setState({ to: null })}>
                                                                    <ClearIcon style={iconStyle} />
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
                    </FormControl>
                    <FormControl fullWidth margin="dense">
                        <LocationSelectList
                            label={strings.PICKUP_LOCATION}
                            required={false}
                            multiple={false}
                            variant='standard'
                            onChange={this.handlePickupLocationChange}
                        />
                    </FormControl>
                    <FormControl fullWidth margin="dense">
                        <LocationSelectList
                            label={strings.DROP_OFF_LOCATION}
                            required={false}
                            multiple={false}
                            variant='standard'
                            onChange={this.handleDropOffLocationChange}
                        />
                    </FormControl>
                    <FormControl fullWidth margin="dense">
                        <TextField
                            variant='standard'
                            value={keyword}
                            onKeyDown={this.handleSearchKeyDown}
                            onChange={this.handleSearchChange}
                            placeholder={commonStrings.SEARCH_PLACEHOLDER}
                            InputProps={{
                                endAdornment: keyword ? (
                                    <IconButton size='small' onClick={() => this.setState({ keyword: '' })}>
                                        <ClearIcon style={iconStyle} />
                                    </IconButton>
                                ) : <SearchIcon style={iconStyle} />
                            }}
                            autoComplete='off'
                            className='bf-search'
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