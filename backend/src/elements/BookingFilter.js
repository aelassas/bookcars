import React, { Component } from 'react';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/booking-filter'
import LocationSelectList from './LocationSelectList';
import DatePicker from './DatePicker';
import { FormControl, TextField, Button, IconButton } from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';

import '../assets/css/booking-filter.css';
import Accordion from './Accordion';

class BookingFilter extends Component {

    constructor(props) {
        super(props);

        this.state = {
            from: null,
            to: null,
            pickupLocation: null,
            dropOffLocation: null,
            keyword: '',
            minDate: null
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
        const { keyword, minDate } = this.state;

        return (
            <Accordion
                title={commonStrings.SEARCH}
                collapse={this.props.collapse}
                className={`${this.props.className ? `${this.props.className} ` : ''}booking-filter`}
            >
                <form onSubmit={this.handleSubmit}>
                    <FormControl fullWidth margin="dense">
                        <DatePicker
                            label={commonStrings.FROM}
                            onChange={(from) => {
                                this.setState({ from, minDate: from });
                            }}
                            language={this.props.language}
                        />
                    </FormControl>
                    <FormControl fullWidth margin="dense">
                        <DatePicker
                            label={commonStrings.TO}
                            minDate={minDate}
                            onChange={(to) => {
                                this.setState({ to });
                            }}
                            language={this.props.language}
                        />
                    </FormControl>
                    <FormControl fullWidth margin="dense">
                        <LocationSelectList
                            label={strings.PICKUP_LOCATION}
                            required={false}

                            variant='standard'
                            onChange={this.handlePickupLocationChange}
                        />
                    </FormControl>
                    <FormControl fullWidth margin="dense">
                        <LocationSelectList
                            label={strings.DROP_OFF_LOCATION}
                            required={false}

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
                                        <ClearIcon className='d-adornment-icon' />
                                    </IconButton>
                                ) : <SearchIcon className='d-adornment-icon' />
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
            </Accordion>
        );
    }
}

export default BookingFilter;