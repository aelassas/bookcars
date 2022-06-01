import React, { Component } from 'react';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/home';
import UserService from '../services/UserService';
import LocationSelectList from './LocationSelectListNoScroll';
import DateTimePicker from './DateTimePicker'
import { FormControl, Button } from '@mui/material';

import '../assets/css/car-filter.css';

class CarFilter extends Component {

    constructor(props) {
        super(props);

        this.state = {
            pickupLocation: this.props.pickupLocation,
            dropOffLocation: this.props.dropOffLocation,
            minDate: this.props.from,
            from: this.props.from,
            to: this.props.to,
            sameLocation: this.props.pickupLocation === this.props.dropOffLocation
        };
    }

    handlePickupLocationChange = (values) => {
        const { sameLocation } = this.state;
        const pickupLocation = ((values.length > 0 && values[0]) || null);

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
        this.setState({ dropOffLocation: ((values.length > 0 && values[0]) || null) });
    };

    handleSubmit = (e) => {
        e.preventDefault();

        const { pickupLocation, dropOffLocation, from, to } = this.state;

        if (!pickupLocation || !dropOffLocation) {
            return;
        }

        if (this.props.onSubmit) {
            this.props.onSubmit({ pickupLocation, dropOffLocation, from, to });
        }
    };

    render() {
        const { pickupLocation, dropOffLocation, sameLocation, from, to, minDate } = this.state;

        return (
            <div className={`${this.props.className ? `${this.props.className} ` : ''}car-filter`}>
                <form onSubmit={this.handleSubmit} className='home-search-form'>
                    <FormControl fullWidth className='pickup-location'>
                        <LocationSelectList
                            label={commonStrings.PICKUP_LOCATION}
                            hidePopupIcon
                            customOpen
                            hidePopupOnload
                            required
                            variant='standard'
                            value={pickupLocation}
                            onChange={this.handlePickupLocationChange}
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
                                onChange={this.handleDropOffLocationChange}
                            />
                        </FormControl>
                    }
                    <FormControl fullWidth className='from'>
                        <DateTimePicker
                            label={commonStrings.FROM}
                            value={from}
                            minDate={minDate}
                            variant='standard'
                            required
                            onChange={(from) => {
                                this.setState({ from });
                            }}
                            language={UserService.getLanguage()}
                        />
                    </FormControl>
                    <FormControl fullWidth className='to'>
                        <DateTimePicker
                            label={commonStrings.TO}
                            value={to}
                            minDate={from}
                            variant='standard'
                            required
                            onChange={(to) => {
                                this.setState({ to });
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
                        <input type='checkbox' checked={sameLocation} onChange={this.handleSameLocationChange} />
                        <label onClick={this.handleSameLocationClick}>{strings.DROP_OFF}</label>
                    </FormControl>
                </form>
            </div>
        );
    }
}

export default CarFilter;