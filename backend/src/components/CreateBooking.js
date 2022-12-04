import React, { useState, useCallback } from 'react';
import Master from '../elements/Master';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings as blStrings } from '../lang/booking-list';
import { strings as bfStrings } from '../lang/booking-filter';
import { strings as csStrings } from '../lang/cars';
import { strings } from '../lang/create-booking';
import * as UserService from '../services/UserService';
import * as BookingService from '../services/BookingService';
import * as Helper from '../common/Helper';
import CompanySelectList from '../elements/CompanySelectList';
import UserSelectList from '../elements/UserSelectList';
import LocationSelectList from '../elements/LocationSelectList';
import CarSelectList from '../elements/CarSelectList';
import StatusList from '../elements/StatusList';
import DateTimePicker from '../elements/DateTimePicker';
import DatePicker from '../elements/DatePicker';
import {
    FormControl,
    Button,
    Paper,
    FormControlLabel,
    Switch,
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

import '../assets/css/create-booking.css';

const CreateBooking = () => {
    const [user, setUser] = useState();
    const [isCompany, setIsCompany] = useState();
    const [visible, setVisible] = useState(false);
    const [company, setCompany] = useState();
    const [car, setCar] = useState();
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
    const [minDate, setMinDate] = useState(new Date());
    const [_fullName, set_FullName] = useState('');
    const [_email, set_Email] = useState('');
    const [_phone, set_Phone] = useState('');
    const [_birthDate, set_BirthDate] = useState();
    const [_emailValid, set_EmailValid] = useState(true);
    const [_phoneValid, set_PhoneValid] = useState(true);
    const [_birthDateValid, set_BirthDateValid] = useState(true);

    const handleCompanyChange = (values) => {
        setCompany(values.length > 0 ? values[0]._id : '-1');
    };

    const handleDriverChange = (values) => {
        setDriver(values.length > 0 ? values[0]._id : null);
    };

    const handlePickupLocationChange = (values) => {
        setPickupLocation(values.length > 0 ? values[0]._id : '-1');
    };

    const handleDropOffLocationChange = (values) => {
        setDropOffLocation(values.length > 0 ? values[0]._id : null);
    };

    const handleCarSelectListChange = useCallback((values) => {
        setCar(values.length > 0 ? values[0]._id : null);
    }, []);

    const handleStatusChange = (value) => {
        setStatus(value);
    };

    const handleCancellationChange = (e) => {
        setCancellation(e.target.checked);
    };

    const handleAmendmentsChange = (e) => {
        setAmendments(e.target.checked);
    };

    const handleTheftProtectionChange = (e) => {
        setTheftProtection(e.target.checked);
    };

    const handleCollisionDamageWaiverChange = (e) => {
        setCollisionDamageWaiver(e.target.checked);
    };

    const handleFullInsuranceChange = (e) => {
        setFullInsurance(e.target.checked);
    };

    const handleAdditionalDriverChange = (e) => {
        setAdditionalDriver(e.target.checked);
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
        if (Helper.isDate(date)) {
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

        const booking = {
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

        Helper.price(
            booking,
            null,
            (price) => {
                booking.price = price;

                BookingService.create({ booking, additionalDriver: _additionalDriver })
                    .then(booking => {
                        if (booking && booking._id) {
                            window.location = '/';
                        } else {
                            Helper.error();
                        }
                    })
                    .catch(() => {
                        UserService.signout();
                    });
            },
            () => {
                UserService.signout();
            });
    };

    const onLoad = (user) => {
        setUser(user);
        setVisible(true);

        if (user.type === Env.RECORD_TYPE.COMPANY) {
            setCompany(user._id);
            setIsCompany(true);
        }
    };

    return (
        <Master onLoad={onLoad} strict={true}>
            <div className='create-booking'>
                <Paper className="booking-form booking-form-wrapper" elevation={10} style={visible ? null : { display: 'none' }}>
                    <h1 className="booking-form-title"> {strings.NEW_BOOKING_HEADING} </h1>
                    <form onSubmit={handleSubmit}>

                        {!isCompany &&
                            <FormControl fullWidth margin="dense">
                                <CompanySelectList
                                    label={blStrings.COMPANY}
                                    required

                                    variant='standard'
                                    onChange={handleCompanyChange}
                                />
                            </FormControl>
                        }

                        <UserSelectList
                            label={blStrings.DRIVER}
                            required
                            variant='standard'
                            user={user}
                            onChange={handleDriverChange} />

                        <FormControl fullWidth margin="dense">
                            <LocationSelectList
                                label={bfStrings.PICKUP_LOCATION}
                                required
                                variant='standard'
                                onChange={handlePickupLocationChange}
                            />
                        </FormControl>

                        <FormControl fullWidth margin="dense">
                            <LocationSelectList
                                label={bfStrings.DROP_OFF_LOCATION}
                                required
                                variant='standard'
                                onChange={handleDropOffLocationChange}
                            />
                        </FormControl>

                        <CarSelectList
                            label={blStrings.CAR}
                            company={company}
                            pickupLocation={pickupLocation}
                            onChange={handleCarSelectListChange}
                            required
                        />

                        <FormControl fullWidth margin="dense">
                            <DateTimePicker
                                label={commonStrings.FROM}
                                value={from}
                                minDate={new Date()}
                                required
                                onChange={(from) => {
                                    setFrom(from);

                                    const minDate = new Date(from);
                                    minDate.setDate(minDate.getDate() + 1);
                                    setMinDate(minDate);
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
                                    setTo(to);
                                }}
                                language={UserService.getLanguage()}
                            />
                        </FormControl>

                        <FormControl fullWidth margin="dense">
                            <StatusList
                                label={blStrings.STATUS}
                                onChange={handleStatusChange}
                                required
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
                                    type="submit"
                                    variant="contained"
                                    className='btn-primary btn-margin-bottom'
                                    size="small"
                                >
                                    {commonStrings.CREATE}
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
                </Paper>
            </div>
        </Master>
    );
};

export default CreateBooking;