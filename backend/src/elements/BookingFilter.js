import React, { useState } from 'react';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/booking-filter'
import LocationSelectList from './LocationSelectList';
import DatePicker from './DatePicker';
import { FormControl, TextField, Button, IconButton } from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';
import Accordion from '../elements/Accordion';

import '../assets/css/booking-filter.css';

const BookingFilter = (props) => {
    const [from, setFrom] = useState(null);
    const [to, setTo] = useState(null);
    const [pickupLocation, setPickupLocation] = useState(null);
    const [dropOffLocation, setDropOffLocation] = useState(null);
    const [keyword, setKeyword] = useState('');
    const [minDate, setMinDate] = useState(null);

    const handleSearchChange = (e) => {
        setKeyword(e.target.value);
    };

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSubmit(e);
        }
    }

    const handlePickupLocationChange = (locations) => {
        setPickupLocation(locations.length > 0 ? locations[0]._id : null);
    };

    const handleDropOffLocationChange = (locations) => {
        setDropOffLocation(locations.length > 0 ? locations[0]._id : null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        let filter = { from, to, pickupLocation, dropOffLocation, keyword };

        if (!from && !to && !pickupLocation && !dropOffLocation && !keyword) filter = null;
        if (props.onSubmit) props.onSubmit(filter);
    }

    return (
        <Accordion
            title={commonStrings.SEARCH}
            collapse={props.collapse}
            className={`${props.className ? `${props.className} ` : ''}booking-filter`}
        >
            <form onSubmit={handleSubmit}>
                <FormControl fullWidth margin="dense">
                    <DatePicker
                        label={commonStrings.FROM}
                        onChange={(from) => {
                            setFrom(from);
                            setMinDate(from)
                        }}
                        language={props.language}
                        variant='standard'
                    />
                </FormControl>
                <FormControl fullWidth margin="dense">
                    <DatePicker
                        label={commonStrings.TO}
                        minDate={minDate}
                        onChange={(to) => {
                            setTo(to);
                        }}
                        language={props.language}
                        variant='standard'
                    />
                </FormControl>
                <FormControl fullWidth margin="dense">
                    <LocationSelectList
                        label={strings.PICKUP_LOCATION}
                        variant='standard'
                        onChange={handlePickupLocationChange}
                        hidePopupIcon
                        customOpen
                    />
                </FormControl>
                <FormControl fullWidth margin="dense">
                    <LocationSelectList
                        label={strings.DROP_OFF_LOCATION}
                        variant='standard'
                        onChange={handleDropOffLocationChange}
                        hidePopupIcon
                        customOpen
                    />
                </FormControl>
                <FormControl fullWidth margin="dense">
                    <TextField
                        variant='standard'
                        value={keyword}
                        onKeyDown={handleSearchKeyDown}
                        onChange={handleSearchChange}
                        placeholder={commonStrings.SEARCH_PLACEHOLDER}
                        InputProps={{
                            endAdornment: keyword ? (
                                <IconButton
                                    size='small'
                                    onClick={() => {
                                        setKeyword('')
                                    }}>
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
};

export default BookingFilter;