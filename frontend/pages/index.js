import React, { Component } from 'react';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/home';
import UserService from '../services/UserService';
import Master from '../elements/Master';
import LocationSelectList from '../elements/LocationSelectList';
import DateTimePicker from '../elements/DateTimePicker'
import { FormControl, Button } from '@mui/material';
import Helper from '../common/Helper';
import Image from 'next/image';

import styles from '../styles/index.module.css';

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
        } else {
            this.setState({ dropOffLocation: null });
        }
    };

    handleSameLocationClick = (e) => {
        const { sameLocation, pickupLocation } = this.state, checked = !sameLocation;

        this.setState({ sameLocation: checked }, () => {
            e.target.previousSibling.checked = checked;
        });

        if (checked) {
            this.setState({ dropOffLocation: pickupLocation });
        } else {
            this.setState({ dropOffLocation: null });
        }
    };

    handleDropOffLocationChange = (values) => {
        this.setState({ dropOffLocation: ((values.length > 0 && values[0]._id) || null) });
    };

    handleSubmit = (e) => {
        e.preventDefault();

        const { pickupLocation, dropOffLocation, from, to } = this.state;

        if (!pickupLocation || !dropOffLocation) {
            return;
        }

        window.location.href = `/cars?p=${pickupLocation}&d=${dropOffLocation}&f=${from.getTime()}&t=${to.getTime()}`;
    };

    onLoad = (user) => {
        this.setState({ user });
    }

    componentDidMount() {
        Helper.setLanguage(commonStrings);
        Helper.setLanguage(strings);
    }

    render() {
        const { minDate, from, to, sameLocation } = this.state;

        return (
            <Master onLoad={this.onLoad} strict={false}>
                <div className={styles.home}>
                    <div className={styles.homeContent}>
                        <div className={styles.homeLogo}>
                            <label className={styles.homeLogoMain} />
                            <label className={styles.homeLogoRegistered} />
                        </div>
                        <div className={styles.homeSearch}>
                            <form onSubmit={this.handleSubmit} className={styles.homeSearchForm} >
                                <FormControl className={styles.pickupLocation}>
                                    <LocationSelectList
                                        label={commonStrings.PICKUP_LOCATION}
                                        hidePopupIcon
                                        customOpen
                                        required
                                        variant='outlined'
                                        onChange={this.handlePickupLocationChange}
                                    />
                                </FormControl>
                                <FormControl className={styles.from}>
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
                                <FormControl className={styles.to} >
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
                                    className={styles.btnSearch}
                                >
                                    {commonStrings.SEARCH}
                                </Button>
                                {!sameLocation &&
                                    <FormControl className={styles.dropOffLocation}>
                                        <LocationSelectList
                                            label={commonStrings.DROP_OFF_LOCATION}
                                            // overflowHidden
                                            hidePopupIcon
                                            customOpen
                                            required
                                            variant='outlined'
                                            onChange={this.handleDropOffLocationChange}
                                        />
                                    </FormControl>
                                }
                                <FormControl className={styles.chkSameLocation}>
                                    <input type='checkbox' checked={sameLocation} onChange={this.handleSameLocationChange} />
                                    <label onClick={this.handleSameLocationClick}>{strings.DROP_OFF}</label>
                                </FormControl>
                            </form>
                        </div>
                    </div>
                    <footer>
                        <div className={styles.copyright}>
                            <span className={styles.part1}>{strings.COPYRIGHT_PART1}</span>
                            <span className={styles.part2}>{strings.COPYRIGHT_PART2}</span>
                            <span className={styles.part3}>{strings.COPYRIGHT_PART3}</span>
                        </div>
                        <div className={styles.securePayment}>
                            <Image
                                src='/img/secure-payment.png'
                                alt=''
                                layout='fill'
                                objectFit='contain'
                            />
                        </div>
                    </footer>
                </div>
            </Master>
        );
    }
}