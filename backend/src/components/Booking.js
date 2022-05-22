import React, { Component } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings as blStrings } from '../lang/booking-list';
import { strings as bfStrings } from '../lang/booking-filter';
import { strings as csStrings } from '../lang/cars';
import { strings } from '../lang/booking';
import Helper from '../common/Helper';
import Master from '../elements/Master';
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
import DatePicker from '../elements/DatePicker';
import {
    FormControl,
    FormControlLabel,
    Switch,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';

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
            openDeleteDialog: false
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

                        Helper.calculateBookingPrice(
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
                    this.error();
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

        Helper.calculateBookingPrice(
            booking,
            booking.car,
            (price) => {
                this.setState({ booking, price, cancellation: booking.cancellation });
            },
            (err) => {
                this.error();
            });
    };

    handleAmendmentsChange = (e) => {
        const { booking } = this.state;
        booking.amendments = e.target.checked;

        Helper.calculateBookingPrice(
            booking,
            booking.car,
            (price) => {
                this.setState({ booking, price, amendments: booking.amendments });
            },
            (err) => {
                this.error();
            });
    };

    handleTheftProtectionChange = (e) => {
        const { booking } = this.state;
        booking.theftProtection = e.target.checked;

        Helper.calculateBookingPrice(
            booking,
            booking.car,
            (price) => {
                this.setState({ booking, price, theftProtection: booking.theftProtection });
            },
            (err) => {
                this.error();
            });
    };

    handleCollisionDamageWaiverChange = (e) => {
        const { booking } = this.state;
        booking.collisionDamageWaiver = e.target.checked;

        Helper.calculateBookingPrice(
            booking,
            booking.car,
            (price) => {
                this.setState({ booking, price, collisionDamageWaiver: booking.collisionDamageWaiver });
            },
            (err) => {
                this.error();
            });
    };

    handleFullInsuranceChange = (e) => {
        const { booking } = this.state;
        booking.fullInsurance = e.target.checked;

        Helper.calculateBookingPrice(
            booking,
            booking.car,
            (price) => {
                this.setState({ booking, price, fullInsurance: booking.fullInsurance });
            },
            (err) => {
                this.error();
            });
    };

    handleAdditionalDriverChange = (e) => {
        const { booking } = this.state;
        booking.additionalDriver = e.target.checked;

        Helper.calculateBookingPrice(
            booking,
            booking.car,
            (price) => {
                this.setState({ booking, price, additionalDriver: booking.additionalDriver });
            },
            (err) => {
                this.error();
            });
    };

    error = (hideLoading) => {
        toast(commonStrings.GENERIC_ERROR, { type: 'error' });
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
            BookingService.delete([booking._id]).then(status => {
                if (status === 200) {
                    window.location.href = '/';
                } else {
                    this.error(true);
                }
            }).catch(() => {
                this.error(true);
            });
        });
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
                this.error();
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
            openDeleteDialog
        } = this.state;

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
                                    <DatePicker
                                        label={commonStrings.FROM}
                                        value={from}
                                        required
                                        onChange={(from) => {
                                            if (from) {
                                                const { booking } = this.state;
                                                booking.from = from;

                                                Helper.calculateBookingPrice(
                                                    booking,
                                                    booking.car,
                                                    (price) => {
                                                        this.setState({ booking, price, from });
                                                    },
                                                    (err) => {
                                                        this.error();
                                                    });
                                            }
                                        }}
                                        language={(user && user.language) || Env.DEFAULT_LANGUAGE}
                                    />
                                </FormControl>
                                <FormControl fullWidth margin="dense">
                                    <DatePicker
                                        label={commonStrings.TO}
                                        value={to}
                                        required
                                        onChange={(to) => {
                                            if (to) {
                                                const { booking } = this.state;
                                                booking.to = to;

                                                Helper.calculateBookingPrice(
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
                                        language={(user && user.language) || Env.DEFAULT_LANGUAGE}
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
                                <h2> {`${strings.TOTAL} ${price} ${commonStrings.CURRENCY}`} </h2>
                            </div>
                            <CarList
                                user={user}
                                cars={[booking.car]}
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
                {noMatch && <NoMatch />}
                {error && <Error />}
            </Master>
        );
    }
}