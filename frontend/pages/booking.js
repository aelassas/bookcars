import React, { Component } from 'react';
import { strings as commonStrings } from '../lang/common';
import { strings as blStrings } from '../lang/booking-list';
import { strings as bfStrings } from '../lang/booking-filter';
import { strings as csStrings } from '../lang/cars';
import Helper from '../common/Helper';
import Master from '../elements/Master';
import UserService from '../services/UserService';
import BookingService from '../services/BookingService';
import CarService from '../services/CarService';
import Backdrop from '../elements/SimpleBackdrop';
import NoMatch from '../elements/NoMatch';
import Error from '../elements/Error';
import CarList from '../elements/CarList';
import CompanySelectList from '../elements/CompanySelectList';
import LocationSelectList from '../elements/LocationSelectList';
import CarSelectList from '../elements/CarSelectList';
import StatusList from '../elements/StatusList';
import DateTimePicker from '../elements/DateTimePicker';
import {
    FormControl,
    FormControlLabel,
    Switch,
    Button
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';

import styles from '../styles/booking.module.css';

export default class Booking extends Component {

    constructor(props) {
        super(props);
        this.state = {
            user: null,
            loading: false,
            noMatch: false,
            error: false,
            booking: null,
            visible: false,
            company: null,
            car: null,
            driver: null,
            pickupLocation: null,
            dropOffLocation: null,
            from: null,
            to: null,
            status: null,
            cancellation: false,
            amendments: false,
            theftProtection: false,
            collisionDamageWaiver: false,
            fullInsurance: false,
            additionalDriver: false,
            minDate: null,
            edit: false
        };
    }

    handleCompanyChange = (values) => {
        this.setState({ company: values.length > 0 ? values[0] : null, companyId: values.length > 0 ? values[0]._id : '-1' });
    };

    handlePickupLocationChange = (values) => {
        this.setState({ pickupLocation: values.length > 0 ? values[0] : null, pickupLocationId: values.length > 0 ? values[0]._id : '-1' });
    };

    handleDropOffLocationChange = (values) => {
        this.setState({ dropOffLocation: values.length > 0 ? values[0] : null });
    };

    handleCarSelectListChange = (values) => {
        const { booking, car, from, to } = this.state, newCar = values.length > 0 ? values[0] : null;

        if ((car === null && newCar !== null) || (car && newCar && car._id !== newCar._id)) { // car changed
            CarService.getCar(newCar._id)
                .then(car => {
                    if (car) {
                        booking.car = car;
                        const price = Helper.price(car, from, to, booking);

                        this.setState({ booking, price, car: newCar });
                    } else {
                        this.error();
                    }
                })
                .catch((err) => {
                    UserService.signout();
                });
        } else if (!newCar) {
            this.setState({ car: newCar, price: 0 });
        } else {
            this.setState({ car: newCar });
        }
    };

    handleStatusChange = (value) => {
        this.setState({ status: value });
    };

    handleCancellationChange = (e) => {
        const { booking } = this.state;
        booking.cancellation = e.target.checked;

        const price = Helper.price(booking.car, new Date(booking.from), new Date(booking.to), booking);
        this.setState({ booking, price, cancellation: booking.cancellation });
    };

    handleAmendmentsChange = (e) => {
        const { booking } = this.state;
        booking.amendments = e.target.checked;

        const price = Helper.price(booking.car, new Date(booking.from), new Date(booking.to), booking);
        this.setState({ booking, price, amendments: booking.amendments });
    };

    handleTheftProtectionChange = (e) => {
        const { booking } = this.state;
        booking.theftProtection = e.target.checked;

        const price = Helper.price(booking.car, new Date(booking.from), new Date(booking.to), booking);
        this.setState({ booking, price, theftProtection: booking.theftProtection });
    };

    handleCollisionDamageWaiverChange = (e) => {
        const { booking } = this.state;
        booking.collisionDamageWaiver = e.target.checked;

        const price = Helper.price(booking.car, new Date(booking.from), new Date(booking.to), booking);
        this.setState({ booking, price, collisionDamageWaiver: booking.collisionDamageWaiver });
    };

    handleFullInsuranceChange = (e) => {
        const { booking } = this.state;
        booking.fullInsurance = e.target.checked;

        const price = Helper.price(booking.car, new Date(booking.from), new Date(booking.to), booking);
        this.setState({ booking, price, fullInsurance: booking.fullInsurance });
    };

    handleAdditionalDriverChange = (e) => {
        const { booking } = this.state;
        booking.additionalDriver = e.target.checked;

        const price = Helper.price(booking.car, new Date(booking.from), new Date(booking.to), booking);
        this.setState({ booking, price, additionalDriver: booking.additionalDriver });
    };

    error = (hideLoading) => {
        toast(commonStrings.GENERIC_ERROR, { type: 'error' });
        if (hideLoading) this.setState({ loading: false });
    };

    handleSubmit = (e) => {
        e.preventDefault();

        const {
            booking,
            company,
            car,
            driver,
            pickupLocation,
            dropOffLocation,
            from,
            to,
            status,
            cancellation,
            amendments,
            theftProtection,
            collisionDamageWaiver,
            fullInsurance,
            additionalDriver,
            price
        } = this.state;

        const data = {
            _id: booking._id,
            company: company._id,
            car: car._id,
            driver: driver._id,
            pickupLocation: pickupLocation._id,
            dropOffLocation: dropOffLocation._id,
            from,
            to,
            status,
            cancellation,
            amendments,
            theftProtection,
            collisionDamageWaiver,
            fullInsurance,
            additionalDriver,
            price
        };

        BookingService.update(data)
            .then(status => {
                if (status === 200) {
                    toast(commonStrings.UPDATED, { type: 'info' });
                } else {
                    this.error();
                }
            })
            .catch((err) => {
                UserService.signout();
            });
    };

    onLoad = (user) => {
        this.setState({ user, loading: true }, () => {
            const params = new URLSearchParams(window.location.search);
            if (params.has('b')) {
                const id = params.get('b');
                if (id && id !== '') {
                    BookingService.getBooking(id)
                        .then(booking => {
                            if (booking) {

                                this.setState({
                                    booking,
                                    price: booking.price,
                                    loading: false,
                                    visible: true,
                                    company: { _id: booking.company._id, name: booking.company.fullName, image: booking.company.avatar },
                                    car: { _id: booking.car._id, name: booking.car.name, image: booking.car.image },
                                    driver: { _id: booking.driver._id, name: booking.driver.fullName, image: booking.driver.avatar },
                                    pickupLocation: { _id: booking.pickupLocation._id, name: booking.pickupLocation.name },
                                    dropOffLocation: { _id: booking.dropOffLocation._id, name: booking.dropOffLocation.name },
                                    from: new Date(booking.from),
                                    minDate: new Date(booking.from),
                                    to: new Date(booking.to),
                                    status: booking.status,
                                    cancellation: booking.cancellation,
                                    amendments: booking.amendments,
                                    theftProtection: booking.theftProtection,
                                    collisionDamageWaiver: booking.collisionDamageWaiver,
                                    fullInsurance: booking.fullInsurance,
                                    additionalDriver: booking.additionalDriver
                                });
                            } else {
                                this.setState({ loading: false, noMatch: true });
                            }
                        })
                        .catch(() => {
                            this.setState({ loading: false, error: true, visible: false });
                        });
                } else {
                    this.setState({ loading: false, noMatch: true });
                }
            } else {
                this.setState({ loading: false, noMatch: true });
            }
        });
    }

    componentDidMount() {
        Helper.setLanguage(commonStrings);
        Helper.setLanguage(blStrings);
        Helper.setLanguage(bfStrings);
        Helper.setLanguage(csStrings);
    }

    render() {
        const {
            visible,
            loading,
            noMatch,
            error,
            user,
            booking,
            company,
            car,
            pickupLocation,
            dropOffLocation,
            from,
            to,
            status,
            cancellation,
            amendments,
            theftProtection,
            collisionDamageWaiver,
            fullInsurance,
            additionalDriver,
            price,
            minDate,
            edit
        } = this.state, days = Helper.days(from, to);

        return (
            <Master onLoad={this.onLoad} strict={true}>
                {visible && booking &&
                    <div className={styles.booking}>
                        <div className={styles.col1}>
                            <form onSubmit={this.handleSubmit}>

                                <FormControl fullWidth margin="dense">
                                    <CompanySelectList
                                        label={blStrings.COMPANY}
                                        required
                                        variant='standard'
                                        onChange={this.handleCompanyChange}
                                        value={company}
                                        readOnly={!edit}
                                    />
                                </FormControl>

                                <FormControl fullWidth margin="dense">
                                    <LocationSelectList
                                        label={bfStrings.PICKUP_LOCATION}
                                        required
                                        variant='standard'
                                        onChange={this.handlePickupLocationChange}
                                        value={pickupLocation}
                                        init
                                        readOnly={!edit}
                                    />
                                </FormControl>

                                <FormControl fullWidth margin="dense">
                                    <LocationSelectList
                                        label={bfStrings.DROP_OFF_LOCATION}
                                        required
                                        variant='standard'
                                        onChange={this.handleDropOffLocationChange}
                                        value={dropOffLocation}
                                        init
                                        readOnly={!edit}
                                    />
                                </FormControl>

                                <CarSelectList
                                    label={blStrings.CAR}
                                    company={company && company._id}
                                    pickupLocation={pickupLocation && pickupLocation._id}
                                    onChange={this.handleCarSelectListChange}
                                    required
                                    value={car}
                                    readOnly={!edit}
                                />

                                <FormControl fullWidth margin="dense">
                                    <DateTimePicker
                                        label={commonStrings.FROM}
                                        value={from}
                                        required
                                        readOnly={!edit}
                                        onChange={(from) => {
                                            if (from) {
                                                const { booking } = this.state;
                                                booking.from = from;

                                                Helper.price(
                                                    booking,
                                                    booking.car,
                                                    (price) => {
                                                        this.setState({ booking, price, from, minDate: from });
                                                    },
                                                    (err) => {
                                                        this.error();
                                                    });
                                            }
                                        }}
                                        language={UserService.getLanguage()}
                                    />
                                </FormControl>
                                <FormControl fullWidth margin="dense">
                                    <DateTimePicker
                                        label={commonStrings.TO}
                                        value={to}
                                        minDate={minDate}
                                        required
                                        readOnly={!edit}
                                        onChange={(to) => {
                                            if (to) {
                                                const { booking } = this.state;
                                                booking.to = to;

                                                Helper.price(
                                                    booking,
                                                    booking.car,
                                                    (price) => {
                                                        this.setState({ booking, price, to });
                                                    },
                                                    (err) => {
                                                        this.error();
                                                    });
                                            }
                                        }}
                                        language={UserService.getLanguage()}
                                    />
                                </FormControl>

                                <FormControl fullWidth margin="dense">
                                    <StatusList
                                        label={blStrings.STATUS}
                                        onChange={this.handleStatusChange}
                                        required
                                        disabled
                                        value={status}
                                    />
                                </FormControl>

                                <div className='info'>
                                    <InfoIcon />
                                    <label>{commonStrings.OPTIONAL}</label>
                                </div>

                                <FormControl fullWidth margin="dense" className='checkbox-fc'>
                                    <FormControlLabel
                                        disabled={!edit || booking.car.cancellation === -1 || booking.car.cancellation === 0}
                                        control={
                                            <Switch checked={cancellation}
                                                onChange={this.handleCancellationChange}
                                                color="primary" />
                                        }
                                        label={csStrings.CANCELLATION}
                                        className='checkbox-fcl'
                                    />
                                </FormControl>

                                <FormControl fullWidth margin="dense" className='checkbox-fc'>
                                    <FormControlLabel
                                        disabled={!edit || booking.car.amendments === -1 || booking.car.amendments === 0}
                                        control={
                                            <Switch checked={amendments}
                                                onChange={this.handleAmendmentsChange}
                                                color="primary" />
                                        }
                                        label={csStrings.AMENDMENTS}
                                        className='checkbox-fcl'
                                    />
                                </FormControl>

                                <FormControl fullWidth margin="dense" className='checkbox-fc'>
                                    <FormControlLabel
                                        disabled={!edit || booking.car.theftProtection === -1 || booking.car.theftProtection === 0}
                                        control={
                                            <Switch checked={theftProtection}
                                                onChange={this.handleTheftProtectionChange}
                                                color="primary" />
                                        }
                                        label={csStrings.THEFT_PROTECTION}
                                        className='checkbox-fcl'
                                    />
                                </FormControl>

                                <FormControl fullWidth margin="dense" className='checkbox-fc'>
                                    <FormControlLabel
                                        disabled={!edit || booking.car.collisionDamageWaiver === -1 || booking.car.collisionDamageWaiver === 0}
                                        control={
                                            <Switch checked={collisionDamageWaiver}
                                                onChange={this.handleCollisionDamageWaiverChange}
                                                color="primary" />
                                        }
                                        label={csStrings.COLLISION_DAMAGE_WAVER}
                                        className='checkbox-fcl'
                                    />
                                </FormControl>

                                <FormControl fullWidth margin="dense" className='checkbox-fc'>
                                    <FormControlLabel
                                        disabled={!edit || booking.car.fullInsurance === -1 || booking.car.fullInsurance === 0}
                                        control={
                                            <Switch checked={fullInsurance}
                                                onChange={this.handleFullInsuranceChange}
                                                color="primary" />
                                        }
                                        label={csStrings.FULL_INSURANCE}
                                        className='checkbox-fcl'
                                    />
                                </FormControl>

                                <FormControl fullWidth margin="dense" className='checkbox-fc'>
                                    <FormControlLabel
                                        disabled={!edit || booking.car.additionalDriver === -1 || booking.car.additionalDriver === 0}
                                        control={
                                            <Switch checked={additionalDriver}
                                                onChange={this.handleAdditionalDriverChange}
                                                color="primary" />
                                        }
                                        label={csStrings.ADDITIONAL_DRIVER}
                                        className='checkbox-fcl'
                                    />
                                </FormControl>

                                <div>
                                    {edit &&
                                        <div className={styles.bookingButtons}>
                                            <Button
                                                variant="contained"
                                                className='btn-primary btn-margin-bottom'
                                                size="small"
                                                type="submit"
                                            >
                                                {commonStrings.SAVE}
                                            </Button>
                                        </div>
                                    }
                                </div>
                            </form>
                        </div>
                        <div className={styles.col2}>
                            <div className={styles.col2Header}>
                                <div className={styles.price}>
                                    <label className={styles.priceDays}>
                                        {Helper.getDays(days)}
                                    </label>
                                    <label className={styles.priceMain}>
                                        {`${price} ${commonStrings.CURRENCY}`}
                                    </label>
                                    <label className={styles.priceDay}>
                                        {`${csStrings.PRICE_PER_DAY} ${Math.floor(price / days)} ${commonStrings.CURRENCY}`}
                                    </label>
                                </div>
                            </div>
                            <CarList
                                className={styles.car}
                                user={user}
                                booking={booking}
                                cars={[booking.car]}
                                hidePrice
                            />
                        </div>

                    </div>
                }

                {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
                {noMatch && <NoMatch />}
                {error && <Error homeLink />}
            </Master>
        );
    }
}