import React, { useState, useEffect } from 'react';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/home';
import * as UserService from '../services/UserService';
import Master from '../elements/Master';
import LocationSelectList from '../elements/LocationSelectList';
import DateTimePicker from '../elements/DateTimePicker'
import { FormControl, Button } from '@mui/material';

import SecurePayment from '../assets/img/secure-payment.png';
import '../assets/css/home.css';

const Home = () => {
    const [pickupLocation, setPickupLocation] = useState();
    const [dropOffLocation, setDropOffLocation] = useState();
    const [minDate, setMinDate] = useState();
    const [from, setFrom] = useState();
    const [to, setTo] = useState();
    const [sameLocation, setSameLocation] = useState(true);

    useEffect(() => {
        const from = new Date();
        from.setDate(from.getDate() + 1);
        from.setHours(10);
        from.setMinutes(0);
        from.setSeconds(0);
        from.setMilliseconds(0);

        const to = new Date(from);
        to.setDate(to.getDate() + 3);

        setMinDate(new Date());
        setFrom(from);
        setTo(to);
    }, []);

    useEffect(() => {
        if (from) {
            const minDate = new Date(from);
            minDate.setDate(from.getDate() + 1);
            setMinDate(minDate);
        }
    }, [from]);

    const handlePickupLocationChange = (values) => {
        const pickupLocation = ((values.length > 0 && values[0]._id) || null);
        setPickupLocation(pickupLocation);

        if (sameLocation) {
            setDropOffLocation(pickupLocation);
        }
    };

    const handleSameLocationChange = (e) => {
        setSameLocation(e.target.checked);

        if (e.target.checked) {
            setDropOffLocation(pickupLocation);
        } else {
            setDropOffLocation(null);
        }
    };

    const handleSameLocationClick = (e) => {
        const checked = !sameLocation;

        setSameLocation(checked);
        e.target.previousSibling.checked = checked;

        if (checked) {
            setDropOffLocation(pickupLocation);
        } else {
            setDropOffLocation(null);
        }
    };

    const handleDropOffLocationChange = (values) => {
        setDropOffLocation((values.length > 0 && values[0]._id) || null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!pickupLocation || !dropOffLocation) {
            return;
        }

        window.location.href = `/cars?p=${pickupLocation}&d=${dropOffLocation}&f=${from.getTime()}&t=${to.getTime()}`;
    };

    const onLoad = (user) => {
    }

    return (
        <Master onLoad={onLoad} strict={false}>
            <div className='home'>
                <div className='home-content'>
                    <div className='home-logo'>
                        <label className='home-logo-main' />
                        <label className='home-logo-registered' />
                    </div>
                    <div className='home-search'>
                        <form onSubmit={handleSubmit} className='home-search-form'>
                            <FormControl className='pickup-location'>
                                <LocationSelectList
                                    label={commonStrings.PICKUP_LOCATION}
                                    hidePopupIcon
                                    customOpen
                                    required
                                    variant='outlined'
                                    onChange={handlePickupLocationChange}
                                />
                            </FormControl>
                            <FormControl className='from'>
                                <DateTimePicker
                                    label={commonStrings.FROM}
                                    value={from}
                                    minDate={new Date()}
                                    variant='outlined'
                                    required
                                    onChange={(from) => {
                                        setFrom(from);
                                    }}
                                    language={UserService.getLanguage()}
                                />
                            </FormControl>
                            <FormControl className='to'>
                                <DateTimePicker
                                    label={commonStrings.TO}
                                    value={to}
                                    minDate={minDate}
                                    variant='outlined'
                                    required
                                    onChange={(to) => {
                                        setTo(to);
                                    }}
                                    language={UserService.getLanguage()}
                                />
                            </FormControl>
                            <Button
                                type="submit"
                                variant="contained"
                                className='btn-search'
                            >
                                {commonStrings.SEARCH}
                            </Button>
                            {!sameLocation &&
                                <FormControl className='drop-off-location'>
                                    <LocationSelectList
                                        label={commonStrings.DROP_OFF_LOCATION}
                                        // overflowHidden
                                        hidePopupIcon
                                        customOpen
                                        required
                                        variant='outlined'
                                        onChange={handleDropOffLocationChange}
                                    />
                                </FormControl>
                            }
                            <FormControl className='chk-same-location'>
                                <input type='checkbox' checked={sameLocation} onChange={handleSameLocationChange} />
                                <label onClick={handleSameLocationClick}>{strings.DROP_OFF}</label>
                            </FormControl>
                        </form>
                    </div>
                </div>
                <footer>
                    <div className='copyright'>
                        <span className='part1'>{strings.COPYRIGHT_PART1}</span>
                        <span className='part2'>{strings.COPYRIGHT_PART2}</span>
                        <span className='part3'>{strings.COPYRIGHT_PART3}</span>
                    </div>
                    <div className='secure-payment'>
                        <img src={SecurePayment} alt='' />
                    </div>
                </footer>
            </div>
        </Master>
    );
};

export default Home;