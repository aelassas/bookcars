import React, { useState, useEffect } from 'react';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/home';
import * as UserService from '../services/UserService';
import LocationSelectList from './LocationSelectList';
import DateTimePicker from './DateTimePicker'
import { FormControl, Button } from '@mui/material';

import '../assets/css/car-filter.css';

const CarFilter = (props) => {
    const [from, setFrom] = useState(props.from);
    const [to, setTo] = useState(props.to);
    const [minDate, setMinDate] = useState(null);
    const [pickupLocation, setPickupLocation] = useState(props.pickupLocation);
    const [dropOffLocation, setDropOffLocation] = useState(props.dropOffLocation);
    const [sameLocation, setSameLocation] = useState(props.pickupLocation === props.dropOffLocation);

    useEffect(() => {
        if (props.from) {
            const minDate = new Date(props.from);
            minDate.setDate(props.from.getDate() + 1);
            setMinDate(minDate);
        }
    }, [props.from]);

    const handlePickupLocationChange = (values) => {
        const pickupLocation = ((values.length > 0 && values[0]) || null);

        setPickupLocation(pickupLocation);

        if (sameLocation) {
            setDropOffLocation(pickupLocation);
        }
    };

    const handleSameLocationChange = (e) => {

        setSameLocation(e.target.checked);

        if (e.target.checked) {
            setDropOffLocation(pickupLocation);
        }
    };

    const handleSameLocationClick = (e) => {
        const checked = !sameLocation;

        setSameLocation(checked);
        e.target.previousSibling.checked = checked;

        if (checked) {
            setDropOffLocation(pickupLocation);
        }
    };

    const handleDropOffLocationChange = (values) => {
        setDropOffLocation((values.length > 0 && values[0]) || null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!pickupLocation || !dropOffLocation) {
            return;
        }

        if (props.onSubmit) {
            props.onSubmit({ pickupLocation, dropOffLocation, from, to });
        }
    };

    return (
        <div className={`${props.className ? `${props.className} ` : ''}car-filter`}>
            <form onSubmit={handleSubmit} className='home-search-form'>
                <FormControl fullWidth className='pickup-location'>
                    <LocationSelectList
                        label={commonStrings.PICKUP_LOCATION}
                        hidePopupIcon
                        customOpen
                        hidePopupOnload
                        required
                        variant='standard'
                        value={pickupLocation}
                        onChange={handlePickupLocationChange}
                    />
                </FormControl>
                {!sameLocation &&
                    <FormControl fullWidth className='drop-off-location'>
                        <LocationSelectList
                            label={commonStrings.DROP_OFF_LOCATION}
                            value={dropOffLocation}
                            hidePopupIcon
                            customOpen
                            hidePopupOnload
                            required
                            variant='standard'
                            onChange={handleDropOffLocationChange}
                        />
                    </FormControl>
                }
                <FormControl fullWidth className='from'>
                    <DateTimePicker
                        label={commonStrings.FROM}
                        value={from}
                        minDate={new Date()}
                        variant='standard'
                        required
                        onChange={(from) => {
                            const minDate = new Date(from);
                            minDate.setDate(from.getDate() + 1);

                            setFrom(from);
                            setMinDate(minDate);
                        }}
                        language={UserService.getLanguage()}
                    />
                </FormControl>
                <FormControl fullWidth className='to'>
                    <DateTimePicker
                        label={commonStrings.TO}
                        value={to}
                        minDate={minDate}
                        variant='standard'
                        required
                        onChange={(to) => {
                            setTo(to);
                        }}
                        language={UserService.getLanguage()}
                    />
                </FormControl>
                <FormControl fullWidth className='search'>
                    <Button
                        type="submit"
                        variant="contained"
                        className='btn-search'
                    >
                        {commonStrings.SEARCH}
                    </Button>
                </FormControl>
                <FormControl fullWidth className='chk-same-location'>
                    <input type='checkbox' checked={sameLocation} onChange={handleSameLocationChange} />
                    <label onClick={handleSameLocationClick}>{strings.DROP_OFF}</label>
                </FormControl>
            </form>
        </div>
    );
};

export default CarFilter;