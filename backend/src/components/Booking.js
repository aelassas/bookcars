import React, { Component } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings as blStrings } from '../lang/booking-list';
import { strings as bfStrings } from '../lang/booking-filter';
import { strings as csStrings } from '../lang/cars';
import { strings } from '../lang/booking';
import Helper from '../common/Helper';
import Master from '../elements/Master';
import UserService from '../services/UserService';
import BookingService from '../services/BookingService';
import CarService from '../services/CarService';
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
            isCompany: false,
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
            openDeleteDialog: false,
            minDate: null,
            _fullName: '',
            _email: '',
            _phone: '',
            _birthDate: null,
            _emailValid: true,
            _phoneValid: true,
            _birthDateValid: true
        };
    }

    handleCompanyChange = (values) => {
        this.setState({ company: values.length > 0 ? values[0] : null, companyId: values.length > 0 ? values[0]._id : '-1' });
    };

    handleDriverChange = (values) => {
        this.setState({ driver: values.length > 0 ? values[0] : null });
    };

    handlePickupLocationChange = (values) => {
        this.setState({ pickupLocation: values.length > 0 ? values[0] : null, pickupLocationId: values.length > 0 ? values[0]._id : '-1' });
    };

    handleDropOffLocationChange = (values) => {
        this.setState({ dropOffLocation: values.length > 0 ? values[0] : null });
    };

    handleCarSelectListChange = (values) => {
        const { booking, car } = this.state, newCar = values.length > 0 ? values[0] : null;

        if ((car === null && newCar !== null) || (car && newCar && car._id !== newCar._id)) { // car changed
            CarService.getCar(newCar._id)
                .then(car => {
                    if (car) {
                        booking.car = car;

                        Helper.price(
                            booking,
                            booking.car,
                            (price) => {
                                booking.price = price;

                                this.setState({ booking, price, car: newCar });
                            },
                            (err) => {
                                this.error();
                            });
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

        Helper.price(
            booking,
            booking.car,
            (price) => {
                this.setState({ booking, price, cancellation: booking.cancellation });
            },
            (err) => {
                UserService.signout();
            });
    };

    handleAmendmentsChange = (e) => {
        const { booking } = this.state;
        booking.amendments = e.target.checked;

        Helper.price(
            booking,
            booking.car,
            (price) => {
                this.setState({ booking, price, amendments: booking.amendments });
            },
            (err) => {
                UserService.signout();
            });
    };

    handleTheftProtectionChange = (e) => {
        const { booking } = this.state;
        booking.theftProtection = e.target.checked;

        Helper.price(
            booking,
            booking.car,
            (price) => {
                this.setState({ booking, price, theftProtection: booking.theftProtection });
            },
            (err) => {
                UserService.signout();
            });
    };

    handleCollisionDamageWaiverChange = (e) => {
        const { booking } = this.state;
        booking.collisionDamageWaiver = e.target.checked;

        Helper.price(
            booking,
            booking.car,
            (price) => {
                this.setState({ booking, price, collisionDamageWaiver: booking.collisionDamageWaiver });
            },
            (err) => {
                UserService.signout();
            });
    };

    handleFullInsuranceChange = (e) => {
        const { booking } = this.state;
        booking.fullInsurance = e.target.checked;

        Helper.price(
            booking,
            booking.car,
            (price) => {
                this.setState({ booking, price, fullInsurance: booking.fullInsurance });
            },
            (err) => {
                UserService.signout();
            });
    };

    handleAdditionalDriverChange = (e) => {
        const { booking } = this.state;
        booking.additionalDriver = e.target.checked;

        Helper.price(
            booking,
            booking.car,
            (price) => {
                this.setState({ booking, price, additionalDriver: booking.additionalDriver });
            },
            (err) => {
                UserService.signout();
            });
    };

    error = (hideLoading) => {
        Helper.error();
        if (hideLoading) this.setState({ loading: false });
    };

    handleDelete = () => {
        this.setState({ openDeleteDialog: true });
    };

    handleCancelDelete = () => {
        this.setState({ openDeleteDialog: false });
    };

    handleConfirmDelete = () => {
        const { booking } = this.state;

        this.setState({ loading: true, openDeleteDialog: false }, () => {
            BookingService.delete([booking._id])
                .then(status => {
                    if (status === 200) {
                        window.location.href = '/';
                    } else {
                        this.error(true);
                    }
                }).catch(() => {
                    UserService.signout();
                });
        });
    };

    _validateEmail = (email) => {
        if (email) {
            if (validator.isEmail(email)) {
                this.setState({ _emailValid: true });
                return true;
            } else {
                this.setState({ _emailValid: false });
                return false;
            }
        } else {
            this.setState({ _emailValid: true });
            return false;
        }
    };

    _validatePhone = (phone) => {
        if (phone) {
            const _phoneValid = validator.isMobilePhone(phone);
            this.setState({ _phoneValid });

            return _phoneValid;
        } else {
            this.setState({ phoneValid: true });

            return true;
        }
    };

    _validateBirthDate = (date) => {
        if (date) {
            const now = new Date();
            const sub = intervalToDuration({ start: date, end: now }).years;
            const _birthDateValid = sub >= Env.MINIMUM_AGE;

            this.setState({ birthDateValid: _birthDateValid });
            return _birthDateValid;
        } else {
            this.setState({ _birthDateValid: true });
            return true;
        }
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
            price,
            _fullName,
            _email,
            _phone,
            _birthDate
        } = this.state;

        if (additionalDriver) {
            const emailValid = this._validateEmail(_email);
            if (!emailValid) {
                return;
            }

            const phoneValid = this._validatePhone(_phone);
            if (!phoneValid) {
                return;
            }

            const birthDateValid = this._validateBirthDate(_birthDate);
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
                        this.setState({
                            _fullName: '',
                            _email: '',
                            _phone: '',
                            _birthDate: null
                        });
                    }
                    Helper.info(commonStrings.UPDATED);
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

                                if (!Helper.admin(user) && booking.company._id !== user._id) {
                                    return this.setState({ loading: false, noMatch: true });
                                }

                                this.setState({
                                    booking,
                                    price: booking.price,
                                    loading: false,
                                    visible: true,
                                    isCompany: user.type === Env.RECORD_TYPE.COMPANY,
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
                                    additionalDriver: booking.additionalDriver,
                                });

                                if (booking.additionalDriver && booking._additionalDriver) {
                                    this.setState({
                                        _fullName: booking._additionalDriver.fullName,
                                        _email: booking._additionalDriver.email,
                                        _phone: booking._additionalDriver.phone,
                                        _birthDate: new Date(booking._additionalDriver.birthDate)
                                    });
                                }

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

    render() {
        const {
            visible,
            loading,
            noMatch,
            error,
            user,
            booking,
            isCompany,
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
            price,
            openDeleteDialog,
            minDate,
            _fullName,
            _email,
            _phone,
            _birthDate,
            _emailValid,
            _phoneValid,
            _birthDateValid
        } = this.state, days = Helper.days(from, to);

        return (
            <Master onLoad={this.onLoad} strict={true}>
                {visible && booking &&
                    <div className='booking'>
                        <div className='col-1'>
                            <form onSubmit={this.handleSubmit}>

                                {!isCompany &&
                                    <FormControl fullWidth margin="dense">
                                        <CompanySelectList
                                            label={blStrings.COMPANY}
                                            required

                                            variant='standard'
                                            onChange={this.handleCompanyChange}
                                            value={company}
                                        />
                                    </FormControl>
                                }

                                <UserSelectList
                                    label={blStrings.DRIVER}
                                    required
                                    variant='standard'
                                    onChange={this.handleDriverChange}
                                    value={driver}
                                />

                                <FormControl fullWidth margin="dense">
                                    <LocationSelectList
                                        label={bfStrings.PICKUP_LOCATION}
                                        required
                                        variant='standard'
                                        onChange={this.handlePickupLocationChange}
                                        value={pickupLocation}
                                    />
                                </FormControl>

                                <FormControl fullWidth margin="dense">
                                    <LocationSelectList
                                        label={bfStrings.DROP_OFF_LOCATION}
                                        required
                                        variant='standard'
                                        onChange={this.handleDropOffLocationChange}
                                        value={dropOffLocation}
                                    />
                                </FormControl>

                                <CarSelectList
                                    label={blStrings.CAR}
                                    company={company._id}
                                    pickupLocation={pickupLocation._id}
                                    onChange={this.handleCarSelectListChange}
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
                                                onChange={this.handleCancellationChange}
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
                                                onChange={this.handleAmendmentsChange}
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
                                                onChange={this.handleCollisionDamageWaiverChange}
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
                                                onChange={this.handleTheftProtectionChange}
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
                                                onChange={this.handleFullInsuranceChange}
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
                                                onChange={this.handleAdditionalDriverChange}
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
                                                    this.setState({ _fullName: e.target.value });
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
                                                    this._validateEmail(e.target.value);
                                                }}
                                                onChange={(e) => {
                                                    this.setState({ _email: e.target.value });

                                                    if (!e.target.value) {
                                                        this.setState({ _emailValid: true });
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
                                                    this._validatePhone(e.target.value);
                                                }}
                                                onChange={(e) => {
                                                    this.setState({ _phone: e.target.value });

                                                    if (!e.target.value) {
                                                        this.setState({ _phoneValid: true });
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
                                                    const _birthDateValid = this._validateBirthDate(_birthDate);
                                                    this.setState({ _birthDate, _birthDateValid });
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
                                            onClick={this.handleDelete}
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
                                cars={[booking.car]}
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
                                <Button onClick={this.handleCancelDelete} variant='contained' className='btn-secondary'>{commonStrings.CANCEL}</Button>
                                <Button onClick={this.handleConfirmDelete} variant='contained' color='error'>{commonStrings.DELETE}</Button>
                            </DialogActions>
                        </Dialog>
                    </div>
                }

                {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
                {noMatch && <NoMatch hideHeader />}
                {error && <Error />}
            </Master>
        );
    }
}