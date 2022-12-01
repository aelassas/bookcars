import React, { useState } from 'react';
import { strings as commonStrings } from '../lang/common';
import { strings as blStrings } from '../lang/booking-list';
import { strings as bfStrings } from '../lang/booking-filter';
import { strings as csStrings } from '../lang/cars';
import * as Helper from '../common/Helper';
import Master from '../elements/Master';
import * as UserService from '../services/UserService';
import * as BookingService from '../services/BookingService';
import * as CarService from '../services/CarService';
import Backdrop from '../elements/SimpleBackdrop';
import NoMatch from './NoMatch';
import Error from './Error';
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

import '../assets/css/booking.css';

const Booking = () => {
    const [user, setUser] = useState();
    const [loading, setLoading] = useState(false);
    const [noMatch, setNoMatch] = useState(false);
    const [error, setError] = useState(false);
    const [booking, setBooking] = useState();
    const [visible, setVisible] = useState(false);
    const [company, setCompany] = useState();
    const [car, setCar] = useState();
    const [price, setPrice] = useState();
    const [driver, setDriver] = useState();
    const [pickupLocation, setPickupLocation] = useState();
    const [dropOffLocation, setDropOffLocation] = useState();
    const [from, setFrom] = useState();
    const [to, setTo] = useState();
    const [status, setStatus] = useState();
    const [cancellation, setCancellation] = useState(false);
    const [amendments, setAmendments] = useState(false);
    const [theftProtection, setTheftProtection] = useState(false);
    const [collisionDamageWaiver, setCollisionDamageWaiver] = useState(false);
    const [fullInsurance, setFullInsurance] = useState(false);
    const [additionalDriver, setAdditionalDriver] = useState(false);
    const [minDate, setMinDate] = useState();
    const edit = false;

    const handleCompanyChange = (values) => {
        setCompany(values.length > 0 ? values[0] : null);
    };

    const handlePickupLocationChange = (values) => {
        setPickupLocation(values.length > 0 ? values[0] : null);
    };

    const handleDropOffLocationChange = (values) => {
        setDropOffLocation(values.length > 0 ? values[0] : null);
    };

    const handleCarSelectListChange = (values) => {
        const newCar = values.length > 0 ? values[0] : null;

        if ((car === null && newCar !== null) || (car && newCar && car._id !== newCar._id)) { // car changed
            CarService.getCar(newCar._id)
                .then(car => {
                    if (car) {
                        const _booking = Helper.clone(booking);
                        _booking.car = car;
                        const price = Helper.price(car, from, to, _booking);

                        setBooking(_booking);
                        setPrice(price);
                        setCar(newCar);
                    } else {
                        Helper.error();
                    }
                })
                .catch((err) => {
                    UserService.signout();
                });
        } else if (!newCar) {
            setPrice(0);
            setCar(newCar);
        } else {
            setCar(newCar);
        }
    };

    const handleStatusChange = (value) => {
        setStatus(value);
    };

    const handleCancellationChange = (e) => {
        booking.cancellation = e.target.checked;

        const price = Helper.price(booking.car, new Date(booking.from), new Date(booking.to), booking);
        setBooking(booking);
        setPrice(price);
        setCancellation(booking.cancellation);
    };

    const handleAmendmentsChange = (e) => {
        booking.amendments = e.target.checked;

        const price = Helper.price(booking.car, new Date(booking.from), new Date(booking.to), booking);
        setBooking(booking);
        setPrice(price);
        setAmendments(booking.amendments)
    };

    const handleCollisionDamageWaiverChange = (e) => {
        booking.collisionDamageWaiver = e.target.checked;

        const price = Helper.price(booking.car, new Date(booking.from), new Date(booking.to), booking);
        setBooking(booking);
        setPrice(price);
        setCollisionDamageWaiver(booking.collisionDamageWaiver);
    };

    const handleTheftProtectionChange = (e) => {
        booking.theftProtection = e.target.checked;

        const price = Helper.price(booking.car, new Date(booking.from), new Date(booking.to), booking);
        setBooking(booking);
        setPrice(price);
        setTheftProtection(booking.theftProtection);
    };

    const handleFullInsuranceChange = (e) => {
        booking.fullInsurance = e.target.checked;

        const price = Helper.price(booking.car, new Date(booking.from), new Date(booking.to), booking);
        setBooking(booking);
        setPrice(price);
        setFullInsurance(booking.fullInsurance);
    };

    const handleAdditionalDriverChange = (e) => {
        booking.additionalDriver = e.target.checked;

        const price = Helper.price(booking.car, new Date(booking.from), new Date(booking.to), booking);
        setBooking(booking);
        setPrice(price);
        setAdditionalDriver(booking.additionalDriver);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

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
                    Helper.info(commonStrings.UPDATED);
                } else {
                    Helper.error();
                }
            })
            .catch((err) => {
                UserService.signout();
            });
    };

    const onLoad = (user) => {
        setUser(user);
        setLoading(true);

        const params = new URLSearchParams(window.location.search);
        if (params.has('b')) {
            const id = params.get('b');
            if (id && id !== '') {
                BookingService.getBooking(id)
                    .then(booking => {
                        if (booking) {
                            setBooking(booking);
                            setPrice(booking.price);
                            setLoading(false);
                            setVisible(true);
                            setCompany({ _id: booking.company._id, name: booking.company.fullName, image: booking.company.avatar });
                            setCar({ _id: booking.car._id, name: booking.car.name, image: booking.car.image });
                            setDriver({ _id: booking.driver._id, name: booking.driver.fullName, image: booking.driver.avatar });
                            setPickupLocation({ _id: booking.pickupLocation._id, name: booking.pickupLocation.name });
                            setDropOffLocation({ _id: booking.dropOffLocation._id, name: booking.dropOffLocation.name });
                            setFrom(new Date(booking.from));
                            setMinDate(new Date(booking.from));
                            setTo(new Date(booking.to));
                            setStatus(booking.status);
                            setCancellation(booking.cancellation);
                            setAmendments(booking.amendments);
                            setTheftProtection(booking.theftProtection);
                            setCollisionDamageWaiver(booking.collisionDamageWaiver);
                            setFullInsurance(booking.fullInsurance);
                            setAdditionalDriver(booking.additionalDriver);
                        } else {
                            setLoading(false);
                            setNoMatch(true);
                        }
                    })
                    .catch(() => {
                        setLoading(false);
                        setError(true);
                        setVisible(false);
                    });
            } else {
                setLoading(false);
                setNoMatch(true);
            }
        } else {
            setLoading(false);
            setNoMatch(true);
        }
    }


    const days = Helper.days(from, to);

    return (
        <Master onLoad={onLoad} strict={true}>
            {visible && booking &&
                <div className='booking'>
                    <div className='col-1'>
                        <form onSubmit={handleSubmit}>

                            <FormControl fullWidth margin="dense">
                                <CompanySelectList
                                    label={blStrings.COMPANY}
                                    required
                                    variant='standard'
                                    onChange={handleCompanyChange}
                                    value={company}
                                    readOnly={!edit}
                                />
                            </FormControl>

                            <FormControl fullWidth margin="dense">
                                <LocationSelectList
                                    label={bfStrings.PICKUP_LOCATION}
                                    required
                                    variant='standard'
                                    onChange={handlePickupLocationChange}
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
                                    onChange={handleDropOffLocationChange}
                                    value={dropOffLocation}
                                    init
                                    readOnly={!edit}
                                />
                            </FormControl>

                            <CarSelectList
                                label={blStrings.CAR}
                                company={company && company._id}
                                pickupLocation={pickupLocation && pickupLocation._id}
                                onChange={handleCarSelectListChange}
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
                                            booking.from = from;

                                            Helper.price(
                                                booking,
                                                booking.car,
                                                (price) => {
                                                    setBooking(booking);
                                                    setPrice(price);
                                                    setFrom(from);
                                                    setMinDate(from);
                                                },
                                                (err) => {
                                                    Helper.error(err);
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
                                            booking.to = to;

                                            Helper.price(
                                                booking,
                                                booking.car,
                                                (price) => {
                                                    setBooking(booking);
                                                    setPrice(price);
                                                    setTo(to);
                                                },
                                                (err) => {
                                                    Helper.error(err);
                                                });
                                        }
                                    }}
                                    language={UserService.getLanguage()}
                                />
                            </FormControl>

                            <FormControl fullWidth margin="dense">
                                <StatusList
                                    label={blStrings.STATUS}
                                    onChange={handleStatusChange}
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
                                            onChange={handleCancellationChange}
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
                                            onChange={handleAmendmentsChange}
                                            color="primary" />
                                    }
                                    label={csStrings.AMENDMENTS}
                                    className='checkbox-fcl'
                                />
                            </FormControl>

                            <FormControl fullWidth margin="dense" className='checkbox-fc'>
                                <FormControlLabel
                                    disabled={!edit || booking.car.collisionDamageWaiver === -1 || booking.car.collisionDamageWaiver === 0}
                                    control={
                                        <Switch checked={collisionDamageWaiver}
                                            onChange={handleCollisionDamageWaiverChange}
                                            color="primary" />
                                    }
                                    label={csStrings.COLLISION_DAMAGE_WAVER}
                                    className='checkbox-fcl'
                                />
                            </FormControl>

                            <FormControl fullWidth margin="dense" className='checkbox-fc'>
                                <FormControlLabel
                                    disabled={!edit || booking.car.theftProtection === -1 || booking.car.theftProtection === 0}
                                    control={
                                        <Switch checked={theftProtection}
                                            onChange={handleTheftProtectionChange}
                                            color="primary" />
                                    }
                                    label={csStrings.THEFT_PROTECTION}
                                    className='checkbox-fcl'
                                />
                            </FormControl>

                            <FormControl fullWidth margin="dense" className='checkbox-fc'>
                                <FormControlLabel
                                    disabled={!edit || booking.car.fullInsurance === -1 || booking.car.fullInsurance === 0}
                                    control={
                                        <Switch checked={fullInsurance}
                                            onChange={handleFullInsuranceChange}
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
                                            onChange={handleAdditionalDriverChange}
                                            color="primary" />
                                    }
                                    label={csStrings.ADDITIONAL_DRIVER}
                                    className='checkbox-fcl'
                                />
                            </FormControl>

                            <div>
                                {edit &&
                                    <div className="booking-buttons">
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
                    <div className='col-2'>
                        <div className='col-2-header'>
                            <div className='price'>
                                <label className='price-days'>
                                    {Helper.getDays(days)}
                                </label>
                                <label className='price-main'>
                                    {`${price} ${commonStrings.CURRENCY}`}
                                </label>
                                <label className='price-day'>
                                    {`${csStrings.PRICE_PER_DAY} ${Math.floor(price / days)} ${commonStrings.CURRENCY}`}
                                </label>
                            </div>
                        </div>
                        <CarList
                            className='car'
                            user={user}
                            booking={booking}
                            cars={[booking.car]}
                            hidePrice
                        />
                    </div>

                </div>
            }

            {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
            {noMatch && <NoMatch hideHeader />}
            {error && <Error />}
        </Master>
    );
};

export default Booking;