import React, { useState, useCallback } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings as blStrings } from '../lang/booking-list';
import { strings as bfStrings } from '../lang/booking-filter';
import { strings as csStrings } from '../lang/cars';
import { strings } from '../lang/booking';
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
import UserSelectList from '../elements/UserSelectList';
import LocationSelectList from '../elements/LocationSelectList';
import CarSelectList from '../elements/CarSelectList';
import StatusList from '../elements/StatusList';
import DateTimePicker from '../elements/DateTimePicker';
import DatePicker from '../elements/DatePicker';
import {
    FormControl,
    FormControlLabel,
    Switch,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormHelperText,
    InputLabel,
    Input,
} from '@mui/material';
import {
    Info as InfoIcon,
    Person as DriverIcon,
} from '@mui/icons-material';
import validator from 'validator';
import { intervalToDuration } from 'date-fns';

import '../assets/css/booking.css';

const Booking = () => {
    const [user, setUser] = useState();
    const [loading, setLoading] = useState(false);
    const [noMatch, setNoMatch] = useState(false);
    const [error, setError] = useState(false);
    const [booking, setBooking] = useState();
    const [visible, setVisible] = useState(false);
    const [isCompany, setIsCompany] = useState(false);
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
    const [_fullName, set_FullName] = useState('');
    const [_email, set_Email] = useState('');
    const [_phone, set_Phone] = useState('');
    const [_birthDate, set_BirthDate] = useState();
    const [_emailValid, set_EmailValid] = useState(true);
    const [_phoneValid, set_PhoneValid] = useState(true);
    const [_birthDateValid, set_BirthDateValid] = useState(true);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

    const handleCompanyChange = (values) => {
        setCompany(values.length > 0 ? values[0] : null);
    };

    const handleDriverChange = (values) => {
        setDriver(values.length > 0 ? values[0] : null);
    };

    const handlePickupLocationChange = (values) => {
        setPickupLocation(values.length > 0 ? values[0] : null);
    };

    const handleDropOffLocationChange = (values) => {
        setDropOffLocation(values.length > 0 ? values[0] : null);
    };

    const handleCarSelectListChange = useCallback((values) => {
        const newCar = values.length > 0 ? values[0] : null;

        if ((car === null && newCar !== null) || (car && newCar && car._id !== newCar._id)) { // car changed
            CarService.getCar(newCar._id)
                .then(car => {
                    if (car) {
                        const _booking = Helper.clone(booking);
                        _booking.car = car;
                        Helper.price(
                            _booking
                            , car
                            , (price) => {
                                setPrice(price);
                            }
                            , (err) => {
                                Helper.error();
                            }
                        );

                        setBooking(_booking);
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
    }, [car, booking]);

    const handleStatusChange = (value) => {
        setStatus(value);
    };

    const handleCancellationChange = (e) => {
        booking.cancellation = e.target.checked;

        Helper.price(
            booking,
            booking.car,
            (price) => {
                setBooking(booking);
                setPrice(price);
                setCancellation(booking.cancellation);
            },
            (err) => {
                UserService.signout();
            });
    };

    const handleAmendmentsChange = (e) => {
        booking.amendments = e.target.checked;

        Helper.price(
            booking,
            booking.car,
            (price) => {
                setBooking(booking);
                setPrice(price);
                setAmendments(booking.amendments)
            },
            (err) => {
                UserService.signout();
            });
    };

    const handleCollisionDamageWaiverChange = (e) => {
        booking.collisionDamageWaiver = e.target.checked;

        Helper.price(
            booking,
            booking.car,
            (price) => {
                setBooking(booking);
                setPrice(price);
                setCollisionDamageWaiver(booking.collisionDamageWaiver);
            },
            (err) => {
                UserService.signout();
            });
    };

    const handleTheftProtectionChange = (e) => {
        booking.theftProtection = e.target.checked;

        Helper.price(
            booking,
            booking.car,
            (price) => {
                setBooking(booking);
                setPrice(price);
                setTheftProtection(booking.theftProtection);
            },
            (err) => {
                UserService.signout();
            });
    };

    const handleFullInsuranceChange = (e) => {
        booking.fullInsurance = e.target.checked;

        Helper.price(
            booking,
            booking.car,
            (price) => {
                setBooking(booking);
                setPrice(price);
                setFullInsurance(booking.fullInsurance);
            },
            (err) => {
                UserService.signout();
            });
    };

    const handleAdditionalDriverChange = (e) => {
        booking.additionalDriver = e.target.checked;

        Helper.price(
            booking,
            booking.car,
            (price) => {
                setBooking(booking);
                setPrice(price);
                setAdditionalDriver(booking.additionalDriver);
            },
            (err) => {
                UserService.signout();
            });
    };

    const err = (hideLoading) => {
        Helper.error();
        if (hideLoading) {
            setLoading(false);
        }
    };

    const handleDelete = () => {
        setOpenDeleteDialog(true);
    };

    const handleCancelDelete = () => {
        setOpenDeleteDialog(false);
    };

    const handleConfirmDelete = () => {
        setLoading(true);
        setOpenDeleteDialog(false);

        BookingService.deleteBookings([booking._id])
            .then(status => {
                if (status === 200) {
                    window.location.href = '/';
                } else {
                    err(true);
                }
            }).catch(() => {
                UserService.signout();
            });
    };

    const _validateEmail = (email) => {
        if (email) {
            if (validator.isEmail(email)) {
                set_EmailValid(true);
                return true;
            } else {
                set_EmailValid(false);
                return false;
            }
        } else {
            set_EmailValid(true);
            return false;
        }
    };

    const _validatePhone = (phone) => {
        if (phone) {
            const _phoneValid = validator.isMobilePhone(phone);
            set_PhoneValid(_phoneValid);

            return _phoneValid;
        } else {
            set_PhoneValid(true);

            return true;
        }
    };

    const _validateBirthDate = (date) => {
        if (date) {
            const now = new Date();
            const sub = intervalToDuration({ start: date, end: now }).years;
            const _birthDateValid = sub >= Env.MINIMUM_AGE;

            set_BirthDateValid(_birthDateValid);
            return _birthDateValid;
        } else {
            set_BirthDateValid(true);
            return true;
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (additionalDriver) {
            const emailValid = _validateEmail(_email);
            if (!emailValid) {
                return;
            }

            const phoneValid = _validatePhone(_phone);
            if (!phoneValid) {
                return;
            }

            const birthDateValid = _validateBirthDate(_birthDate);
            if (!birthDateValid) {
                return;
            }
        }

        const _booking = {
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

        let _additionalDriver;
        if (additionalDriver) {
            _additionalDriver = {
                fullName: _fullName,
                email: _email,
                phone: _phone,
                birthDate: _birthDate
            };
        }

        BookingService.update({ booking: _booking, additionalDriver: _additionalDriver })
            .then(status => {
                if (status === 200) {
                    if (!additionalDriver) {
                        set_FullName('');
                        set_Email('');
                        set_Phone('');
                        set_BirthDate(null);
                    }
                    Helper.info(commonStrings.UPDATED);
                } else {
                    err();
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

                            if (!Helper.admin(user) && booking.company._id !== user._id) {
                                setLoading(false);
                                setNoMatch(true);
                                return;
                            }

                            setBooking(booking);
                            setPrice(booking.price);
                            setLoading(false);
                            setVisible(true);
                            setIsCompany(user.type === Env.RECORD_TYPE.COMPANY);
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

                            if (booking.additionalDriver && booking._additionalDriver) {
                                set_FullName(booking._additionalDriver.fullName);
                                set_Email(booking._additionalDriver.email);
                                set_Phone(booking._additionalDriver.phone);
                                set_BirthDate(new Date(booking._additionalDriver.birthDate))
                            }

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

                            {!isCompany &&
                                <FormControl fullWidth margin="dense">
                                    <CompanySelectList
                                        label={blStrings.COMPANY}
                                        required

                                        variant='standard'
                                        onChange={handleCompanyChange}
                                        value={company}
                                    />
                                </FormControl>
                            }

                            <UserSelectList
                                label={blStrings.DRIVER}
                                required
                                variant='standard'
                                onChange={handleDriverChange}
                                value={driver}
                            />

                            <FormControl fullWidth margin="dense">
                                <LocationSelectList
                                    label={bfStrings.PICKUP_LOCATION}
                                    required
                                    variant='standard'
                                    onChange={handlePickupLocationChange}
                                    value={pickupLocation}
                                />
                            </FormControl>

                            <FormControl fullWidth margin="dense">
                                <LocationSelectList
                                    label={bfStrings.DROP_OFF_LOCATION}
                                    required
                                    variant='standard'
                                    onChange={handleDropOffLocationChange}
                                    value={dropOffLocation}
                                />
                            </FormControl>

                            <CarSelectList
                                label={blStrings.CAR}
                                company={company._id}
                                pickupLocation={pickupLocation._id}
                                onChange={handleCarSelectListChange}
                                required
                                value={car}
                            />

                            <FormControl fullWidth margin="dense">
                                <DateTimePicker
                                    label={commonStrings.FROM}
                                    value={from}
                                    required
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
                                                    err();
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
                                                    err();
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
                                    value={status}
                                />
                            </FormControl>

                            <div className='info'>
                                <InfoIcon />
                                <label>{commonStrings.OPTIONAL}</label>
                            </div>

                            <FormControl fullWidth margin="dense" className='checkbox-fc'>
                                <FormControlLabel
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
                                    control={
                                        <Switch checked={additionalDriver}
                                            onChange={handleAdditionalDriverChange}
                                            color="primary" />
                                    }
                                    label={csStrings.ADDITIONAL_DRIVER}
                                    className='checkbox-fcl'
                                />
                            </FormControl>

                            {
                                additionalDriver &&
                                <>
                                    <div className='info'>
                                        <DriverIcon />
                                        <label>{csStrings.ADDITIONAL_DRIVER}</label>
                                    </div>
                                    <FormControl fullWidth margin="dense">
                                        <InputLabel className='required'>{commonStrings.FULL_NAME}</InputLabel>
                                        <Input
                                            type="text"
                                            label={commonStrings.FULL_NAME}
                                            value={_fullName}
                                            required
                                            onChange={(e) => {
                                                set_FullName(e.target.value);
                                            }}
                                            autoComplete="off"
                                        />
                                    </FormControl>
                                    <FormControl fullWidth margin="dense">
                                        <InputLabel className='required'>{commonStrings.EMAIL}</InputLabel>
                                        <Input
                                            type="text"
                                            label={commonStrings.EMAIL}
                                            value={_email}
                                            error={!_emailValid}
                                            onBlur={(e) => {
                                                _validateEmail(e.target.value);
                                            }}
                                            onChange={(e) => {
                                                set_Email(e.target.value);

                                                if (!e.target.value) {
                                                    set_EmailValid(true);
                                                }
                                            }}
                                            required
                                            autoComplete="off"
                                        />
                                        <FormHelperText error={!_emailValid}>
                                            {(!_emailValid && commonStrings.EMAIL_NOT_VALID) || ''}
                                        </FormHelperText>
                                    </FormControl>
                                    <FormControl fullWidth margin="dense">
                                        <InputLabel className='required'>{commonStrings.PHONE}</InputLabel>
                                        <Input
                                            type="text"
                                            label={commonStrings.PHONE}
                                            value={_phone}
                                            error={!_phoneValid}
                                            onBlur={(e) => {
                                                _validatePhone(e.target.value);
                                            }}
                                            onChange={(e) => {
                                                set_Phone(e.target.value);

                                                if (!e.target.value) {
                                                    set_PhoneValid(true);
                                                }
                                            }}
                                            required
                                            autoComplete="off"
                                        />
                                        <FormHelperText error={!_phoneValid}>
                                            {(!_phoneValid && commonStrings.PHONE_NOT_VALID) || ''}
                                        </FormHelperText>
                                    </FormControl>
                                    <FormControl fullWidth margin="dense">
                                        <DatePicker
                                            label={commonStrings.BIRTH_DATE}
                                            value={_birthDate}
                                            error={!_birthDateValid}
                                            required
                                            onChange={(_birthDate) => {
                                                const _birthDateValid = _validateBirthDate(_birthDate);
                                                set_BirthDate(_birthDate);
                                                set_BirthDateValid(_birthDateValid);
                                            }}
                                            language={UserService.getLanguage()}
                                        />
                                        <FormHelperText error={!_birthDateValid}>
                                            {(!_birthDateValid && Helper.getBirthDateError(Env.MINIMUM_AGE)) || ''}
                                        </FormHelperText>
                                    </FormControl>
                                </>
                            }

                            <div>
                                <div className="buttons">
                                    <Button
                                        variant="contained"
                                        className='btn-primary btn-margin-bottom'
                                        size="small"
                                        type="submit"
                                    >
                                        {commonStrings.SAVE}
                                    </Button>
                                    <Button
                                        variant="contained"
                                        className='btn-margin-bottom'
                                        color='error'
                                        size="small"
                                        onClick={handleDelete}
                                    >
                                        {commonStrings.DELETE}
                                    </Button>
                                    <Button
                                        variant="contained"
                                        className='btn-secondary btn-margin-bottom'
                                        size="small"
                                        href='/'
                                    >
                                        {commonStrings.CANCEL}
                                    </Button>
                                </div>
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
                            cars={(car && [booking.car]) || []}
                            hidePrice
                        />
                    </div>

                    <Dialog
                        disableEscapeKeyDown
                        maxWidth="xs"
                        open={openDeleteDialog}
                    >
                        <DialogTitle className='dialog-header'>{commonStrings.CONFIRM_TITLE}</DialogTitle>
                        <DialogContent>{strings.DELETE_BOOKING}</DialogContent>
                        <DialogActions className='dialog-actions'>
                            <Button onClick={handleCancelDelete} variant='contained' className='btn-secondary'>{commonStrings.CANCEL}</Button>
                            <Button onClick={handleConfirmDelete} variant='contained' color='error'>{commonStrings.DELETE}</Button>
                        </DialogActions>
                    </Dialog>
                </div>
            }

            {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
            {noMatch && <NoMatch hideHeader />}
            {error && <Error />}
        </Master>
    );
};

export default Booking;