import React, { Component } from 'react';
import Master from '../elements/Master';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings as blStrings } from '../lang/booking-list';
import { strings as bfStrings } from '../lang/booking-filter';
import { strings as csStrings } from '../lang/cars';
import { strings } from '../lang/create-booking';
import BookingService from '../services/BookingService';
import Helper from '../common/Helper';
import Backdrop from '../elements/SimpleBackdrop';
import CompanySelectList from '../elements/CompanySelectList';
import UserSelectList from '../elements/UserSelectList';
import LocationSelectList from '../elements/LocationSelectList';
import CarSelectList from '../elements/CarSelectList';
import StatusList from '../elements/StatusList';
import { toast } from 'react-toastify';
import {
    FormControl,
    Button,
    Paper,
    FormControlLabel,
    Switch,
    TextField,
    InputAdornment,
    IconButton
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Info as InfoIcon, Clear as ClearIcon } from '@mui/icons-material';

import '../assets/css/create-booking.css';

export default class CreateBooking extends Component {

    constructor(props) {
        super(props);
        this.state = {
            user: null,
            isCompany: false,
            loading: false,
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
            additionalDriver: false
        };
    }

    handleCompanyChange = (values) => {
        this.setState({ company: values.length > 0 ? values[0]._id : '-1' });
    };

    handleDriverChange = (values) => {
        this.setState({ driver: values.length > 0 ? values[0]._id : null });
    };

    handlePickupLocationChange = (values) => {
        this.setState({ pickupLocation: values.length > 0 ? values[0]._id : '-1' });
    };

    handleDropOffLocationChange = (values) => {
        this.setState({ dropOffLocation: values.length > 0 ? values[0]._id : null });
    };

    handleCarSelectListChange = (values) => {
        this.setState({ car: values.length > 0 ? values[0]._id : null });
    };

    handleStatusChange = (value) => {
        this.setState({ status: value });
    };

    handleCancellationChange = (e) => {
        this.setState({ cancellation: e.target.checked });
    };

    handleAmendmentsChange = (e) => {
        this.setState({ amendments: e.target.checked });
    };

    handleTheftProtectionChange = (e) => {
        this.setState({ theftProtection: e.target.checked });
    };

    handleCollisionDamageWaiverChange = (e) => {
        this.setState({ collisionDamageWaiver: e.target.checked });
    };

    handleFullInsuranceChange = (e) => {
        this.setState({ fullInsurance: e.target.checked });
    };

    handleAdditionalDriverChange = (e) => {
        this.setState({ additionalDriver: e.target.checked });
    };

    handleSubmit = (e) => {
        e.preventDefault();
        const {
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
            additionalDriver
        } = this.state;

        const data = {
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
            additionalDriver
        };

        Helper.calculateBookingPrice(
            data,
            null,
            (price) => {
                data.price = price;

                BookingService.create(data)
                    .then(booking => {
                        if (booking && booking._id) {
                            window.location = `/booking?b=${booking._id}`;
                        } else {
                            toast(commonStrings.GENERIC_ERROR, { type: 'error' });
                        }
                    })
                    .catch(() => {
                        toast(commonStrings.GENERIC_ERROR, { type: 'error' });
                    });
            },
            () => {
                toast(commonStrings.GENERIC_ERROR, { type: 'error' });
            });
    };

    onLoad = (user) => {
        this.setState({ user, visible: true }, () => {
            if (user.type === Env.RECORD_TYPE.COMPANY) {
                this.setState({ company: user._id, isCompany: true });
            }
        });
    };

    render() {
        const {
            user,
            loading,
            isCompany,
            company,
            pickupLocation,
            visible,

            from,
            to,
            cancellation,
            amendments,
            theftProtection,
            collisionDamageWaiver,
            fullInsurance,
            additionalDriver
        } = this.state;

        return (
            <Master onLoad={this.onLoad} strict={true}>
                <div className='create-booking'>
                    <Paper className="booking-form booking-form-wrapper" elevation={10} style={visible ? null : { display: 'none' }}>
                        <h1 className="booking-form-title"> {strings.NEW_BOOKING_HEADING} </h1>
                        <form onSubmit={this.handleSubmit}>

                            {!isCompany &&
                                <FormControl fullWidth margin="dense">
                                    <CompanySelectList
                                        label={blStrings.COMPANY}
                                        required

                                        variant='standard'
                                        onChange={this.handleCompanyChange}
                                    />
                                </FormControl>
                            }

                            <UserSelectList
                                label={blStrings.DRIVER}
                                required
                                variant='standard'
                                user={user}
                                onChange={this.handleDriverChange} />

                            <FormControl fullWidth margin="dense">
                                <LocationSelectList
                                    label={bfStrings.PICKUP_LOCATION}
                                    required
                                    variant='standard'
                                    onChange={this.handlePickupLocationChange}
                                />
                            </FormControl>

                            <FormControl fullWidth margin="dense">
                                <LocationSelectList
                                    label={bfStrings.DROP_OFF_LOCATION}
                                    required
                                    variant='standard'
                                    onChange={this.handleDropOffLocationChange}
                                />
                            </FormControl>

                            <CarSelectList
                                label={blStrings.CAR}
                                company={company}
                                pickupLocation={pickupLocation}
                                onChange={this.handleCarSelectListChange}
                                required
                            />

                            <FormControl fullWidth margin="dense">
                                <LocalizationProvider dateAdapter={AdapterDateFns}>
                                    <DatePicker
                                        label={commonStrings.FROM}
                                        inputFormat='dd-MM-yyyy'
                                        mask='__-__-____'
                                        required
                                        value={from}
                                        onChange={(from) => {
                                            this.setState({ from });
                                        }}
                                        renderInput={(params) =>
                                            <TextField {...params}
                                                variant='standard'
                                                fullWidth
                                                required
                                                autoComplete='off'
                                                InputProps={{
                                                    ...params.InputProps,
                                                    endAdornment:
                                                        <>
                                                            {
                                                                from && (
                                                                    <InputAdornment position='end' className='d-adornment'>
                                                                        <IconButton size='small' onClick={() => this.setState({ from: null })}>
                                                                            <ClearIcon className='d-adornment-icon' />
                                                                        </IconButton>
                                                                    </InputAdornment>
                                                                )
                                                            }
                                                            {params.InputProps.endAdornment}
                                                        </>
                                                }} />
                                        }
                                    />
                                </LocalizationProvider>
                            </FormControl>
                            <FormControl fullWidth margin="dense">
                                <LocalizationProvider dateAdapter={AdapterDateFns}>
                                    <DatePicker
                                        label={commonStrings.TO}
                                        inputFormat='dd-MM-yyyy'
                                        mask='__-__-____'
                                        required
                                        value={to}
                                        onChange={(to) => {
                                            this.setState({ to });
                                        }}
                                        renderInput={(params) =>
                                            <TextField {...params}
                                                variant='standard'
                                                fullWidth
                                                required
                                                autoComplete='off'
                                                InputProps={{
                                                    ...params.InputProps,
                                                    endAdornment:
                                                        <>
                                                            {
                                                                to && (
                                                                    <InputAdornment position='end' className='d-adornment'>
                                                                        <IconButton size='small' onClick={() => this.setState({ to: null })}>
                                                                            <ClearIcon className='d-adornment-icon' />
                                                                        </IconButton>
                                                                    </InputAdornment>
                                                                )
                                                            }
                                                            {params.InputProps.endAdornment}
                                                        </>
                                                }} />
                                        }
                                    />
                                </LocalizationProvider>
                            </FormControl>

                            <FormControl fullWidth margin="dense">
                                <StatusList
                                    label={blStrings.STATUS}
                                    onChange={this.handleStatusChange}
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
                {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
            </Master>
        );
    }
}