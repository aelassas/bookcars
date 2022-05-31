import React, { Component } from 'react';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/home';
import UserService from '../services/UserService';
import Master from '../elements/Master';
import LocationSelectList from '../elements/LocationSelectList';
import DateTimePicker from '../elements/DateTimePicker'
import { FormControl, Button } from '@mui/material';

import SecurePayment from '../assets/img/secure-payment.png';
import '../assets/css/home.css';

export default class Home extends Component {

    constructor(props) {
        super(props);

        const from = new Date();
        from.setDate(from.getDate() + 1);
        from.setHours(10);
        from.setMinutes(0);
        from.setSeconds(0);
        from.setMilliseconds(0);

        const to = new Date(from);
        to.setDate(to.getDate() + 3);

        this.state = {
            user: null,
            pickupLocation: null,
            dropOffLocation: null,
            minDate: from,
            from,
            to,
            sameLocation: true
        };
    }

    handlePickupLocationChange = (values) => {
        const { sameLocation } = this.state;
        const pickupLocation = ((values.length > 0 && values[0]._id) || null);

        this.setState({ pickupLocation });

        if (sameLocation) {
            this.setState({ dropOffLocation: pickupLocation });
        }
    };

    handleSameLocationChange = (e) => {
        const { pickupLocation } = this.state;

        this.setState({ sameLocation: e.target.checked });

        if (e.target.checked) {
            this.setState({ dropOffLocation: pickupLocation });
        }
    };

    handleSameLocationClick = (e) => {
        const { sameLocation, pickupLocation } = this.state, checked = !sameLocation;

        this.setState({ sameLocation: checked }, () => {
            e.target.previousSibling.checked = checked;
        });

        if (checked) {
            this.setState({ dropOffLocation: pickupLocation });
        }
    };

    handleDropOffLocationChange = (values) => {
        this.setState({ dropOffLocation: ((values.length > 0 && values[0]._id) || null) });
    };

    handleSubmit = (e) => {
        e.preventDefault();

        const { pickupLocation, dropOffLocation, from, to } = this.state;

        window.location.href = `/cars?p=${pickupLocation}&d=${dropOffLocation}&f=${from.getTime()}&t=${to.getTime()}`;
    };

    onLoad = (user) => {
        this.setState({ user });
    }

    componentDidMount() {
    }

    render() {
        const { minDate, from, to, sameLocation } = this.state;

        return (
            <Master onLoad={this.onLoad} strict={false}>
                <div className='home'>
                    <div className='home-content'>
                        <div className='home-logo'>
                            <label className='home-logo-main' />
                            <label className='home-logo-registered' />
                        </div>
                        <div className='home-search'>
                            <form onSubmit={this.handleSubmit} className='home-search-form'>
                                <FormControl className='pickup-location'>
                                    <LocationSelectList
                                        label={commonStrings.PICKUP_LOCATION}
                                        freeSolo
                                        overflowHidden
                                        required
                                        variant='outlined'
                                        onChange={this.handlePickupLocationChange}
                                    />
                                </FormControl>
                                <FormControl className='from'>
                                    <DateTimePicker
                                        label={commonStrings.FROM}
                                        value={from}
                                        minDate={minDate}
                                        variant='outlined'
                                        required
                                        onChange={(from) => {
                                            this.setState({ from });
                                        }}
                                        language={UserService.getLanguage()}
                                    />
                                </FormControl>
                                <FormControl className='to'>
                                    <DateTimePicker
                                        label={commonStrings.TO}
                                        value={to}
                                        minDate={from}
                                        variant='outlined'
                                        required
                                        onChange={(to) => {
                                            this.setState({ to });
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
                                            freeSolo
                                            overflowHidden
                                            required
                                            variant='outlined'
                                            onChange={this.handleDropOffLocationChange}
                                        />
                                    </FormControl>
                                }
                                <FormControl className='chk-same-location'>
                                    <input type='checkbox' checked={sameLocation} onChange={this.handleSameLocationChange} />
                                    <label onClick={this.handleSameLocationClick}>{strings.DROP_OFF}</label>
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
    }
}