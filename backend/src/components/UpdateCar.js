import React, { Component } from 'react';
import Master from '../elements/Master';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings as csStrings } from '../lang/cars';
import { strings } from '../lang/create-car';
import CarService from '../services/CarService';
import Helper from '../common/Helper';
import Error from './Error';
import ErrorMessage from '../elements/Error';
import Backdrop from '../elements/SimpleBackdrop';
import NoMatch from './NoMatch';
import { Avatar } from '../elements/Avatar';
import CompanySelectList from '../elements/CompanySelectList';
import LocationSelectList from '../elements/LocationSelectList';
import CarTypeList from '../elements/CarTypeList';
import GearboxList from '../elements/GearboxList';
import SeatsList from '../elements/SeatsList';
import DoorsList from '../elements/DoorsList';
import FuelPolicyList from '../elements/FuelPolicyList';
import { toast } from 'react-toastify';
import {
    Input,
    InputLabel,
    FormControl,
    Button,
    Paper,
    FormControlLabel,
    Switch,
    TextField
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';

import '../assets/css/create-car.css';
import '../assets/css/update-car.css';

export default class CreateCar extends Component {

    constructor(props) {
        super(props);
        this.state = {
            user: null,
            car: null,
            noMatch: false,
            loading: false,
            visible: false,
            error: false,
            imageRequired: false,
            imageSizeError: false,
            image: null,
            companies: [],
            name: '',
            company: null,
            location: null,
            available: false,
            type: '',
            gearbox: '',
            price: '',
            seats: '',
            doors: '',
            aircon: false,
            mileage: '',
            fuelPolicy: '',
            cancellation: '',
            amendments: '',
            theftProtection: '',
            collisionDamageWaiver: '',
            fullInsurance: '',
            additionalDriver: ''
        };
    }

    handleBeforeUpload = () => {
        this.setState({ loading: true });
    };

    handleImageChange = (image) => {
        this.setState({ loading: false, image });
        if (image !== null) {
            this.setState({ imageRequired: false });
        }
    };

    handleImageValidate = (valid) => {
        if (!valid) {
            this.setState({
                imageSizeError: true,
                imageRequired: false,
                error: false,
                loading: false,
            });
        } else {
            this.setState({
                imageSizeError: false,
                imageRequired: false,
                error: false,
            });
        }
    };

    handleNameChange = (e) => {
        this.setState({ name: e.target.value });
    }

    handleCompanyChange = (values) => {
        this.setState({ company: values.length > 0 ? values[0] : null });
    };

    handleLocationChange = (values) => {
        this.setState({ location: values.length > 0 ? values[0] : null });
    };

    handleAvailableChange = (e) => {
        this.setState({ available: e.target.checked });
    };

    handleCarTypeChange = (value) => {
        this.setState({ type: value });
    };

    handleGearboxChange = (value) => {
        this.setState({ gearbox: value });
    };

    handleAirconChange = (e) => {
        this.setState({ aircon: e.target.checked });
    };

    handlePriceChange = (e) => {
        this.setState({ price: Helper.isNumber(e.target.value) ? parseFloat(e.target.value) : e.target.value });
    };

    handleSeatsChange = (value) => {
        this.setState({ seats: value });
    };

    handleDoorsChange = (value) => {
        this.setState({ doors: value });
    };

    handleMileageChange = (e) => {
        this.setState({ mileage: Helper.isNumber(e.target.value) ? parseFloat(e.target.value) : e.target.value });
    };

    handleFuelPolicyChange = (value) => {
        this.setState({ fuelPolicy: value });
    };

    handleCancellationChange = (e) => {
        this.setState({ cancellation: Helper.isNumber(e.target.value) ? parseFloat(e.target.value) : e.target.value });
    };

    handleAmendmentsChange = (e) => {
        this.setState({ amendments: Helper.isNumber(e.target.value) ? parseFloat(e.target.value) : e.target.value });
    };

    handleTheftProtectionChange = (e) => {
        this.setState({ theftProtection: Helper.isNumber(e.target.value) ? parseFloat(e.target.value) : e.target.value });
    };

    handleCollisionDamageWaiverChange = (e) => {
        this.setState({ collisionDamageWaiver: Helper.isNumber(e.target.value) ? parseFloat(e.target.value) : e.target.value });
    };

    handleFullinsuranceChange = (e) => {
        this.setState({ fullInsurance: Helper.isNumber(e.target.value) ? parseFloat(e.target.value) : e.target.value });
    };

    handleAdditionalDriverChange = (e) => {
        this.setState({ additionalDriver: Helper.isNumber(e.target.value) ? parseFloat(e.target.value) : e.target.value });
    };

    getCarExtra = (extra) => (
        extra === -1 ? '' : extra
    );

    getExtra = (extra) => (
        extra === '' ? -1 : extra
    );

    handleSubmit = (e) => {
        e.preventDefault();

        const {
            car,
            name,
            company,
            location,
            price,
            available,
            type,
            gearbox,
            aircon,
            image,
            seats,
            doors,
            fuelPolicy,
            mileage,
            cancellation,
            amendments,
            theftProtection,
            collisionDamageWaiver,
            fullInsurance,
            additionalDriver
        } = this.state;

        const data = {
            _id: car._id,
            name,
            company,
            location,
            price,
            available,
            type,
            gearbox,
            aircon,
            image,
            seats,
            doors,
            fuelPolicy,
            mileage: this.getExtra(mileage),
            cancellation: this.getExtra(cancellation),
            amendments: this.getExtra(amendments),
            theftProtection: this.getExtra(theftProtection),
            collisionDamageWaiver: this.getExtra(collisionDamageWaiver),
            fullInsurance: this.getExtra(fullInsurance),
            additionalDriver: this.getExtra(additionalDriver)
        };

        CarService.update(data)
            .then(status => {
                if (status === 200) {
                    toast(commonStrings.UPDATED, { type: 'info' });
                } else {
                    toast(commonStrings.GENERIC_ERROR, { type: 'error' });
                }
            })
            .catch(() => {
                toast(commonStrings.GENERIC_ERROR, { type: 'error' });
            });
    };

    onLoad = (user) => {

        this.setState({ user, loading: true }, () => {
            const params = new URLSearchParams(window.location.search);
            if (params.has('cr')) {
                const id = params.get('cr');
                if (id && id !== '') {
                    CarService.getCar(id)
                        .then(car => {
                            if (car) {
                                if (user.type === Env.RECORD_TYPE.COMPANY && user._id !== car.company._id) {
                                    this.setState({ loading: false, noMatch: true });
                                    return;
                                }

                                const company = { _id: car.company._id, name: car.company.fullName, image: car.company.avatar };

                                this.setState({
                                    car,
                                    loading: false,
                                    visible: true,

                                    imageRequired: !car.image,
                                    name: car.name,
                                    company,
                                    location: { _id: car.location._id, name: car.location.name },
                                    price: car.price,
                                    available: car.available,
                                    type: car.type,
                                    gearbox: car.gearbox,
                                    aircon: car.aircon,
                                    seats: car.seats,
                                    doors: car.doors,
                                    fuelPolicy: car.fuelPolicy,

                                    mileage: this.getCarExtra(car.mileage),
                                    cancellation: this.getCarExtra(car.cancellation),
                                    amendments: this.getCarExtra(car.amendments),
                                    theftProtection: this.getCarExtra(car.theftProtection),
                                    collisionDamageWaiver: this.getCarExtra(car.collisionDamageWaiver),
                                    fullInsurance: this.getCarExtra(car.fullInsurance),
                                    additionalDriver: this.getCarExtra(car.additionalDriver)
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
    };

    render() {
        const {
            user,
            car,
            visible,
            noMatch,
            error,
            imageRequired,
            imageSizeError,
            loading,

            name,
            company,
            location,
            price,
            available,
            type,
            gearbox,
            aircon,
            seats,
            doors,
            fuelPolicy,
            mileage,
            cancellation,
            amendments,
            theftProtection,
            collisionDamageWaiver,
            fullInsurance,
            additionalDriver
        } = this.state;

        const admin = user && user.type === Env.RECORD_TYPE.ADMIN;

        return (
            <Master onLoad={this.onLoad} strict={true}>
                {!error && !noMatch &&
                    <div className='update-car'>
                        <Paper className="car-form car-form-wrapper" elevation={10} style={visible ? null : { display: 'none' }}>
                            <form onSubmit={this.handleSubmit}>
                                <Avatar
                                    type={Env.RECORD_TYPE.CAR}
                                    mode='update'
                                    record={car}
                                    hideDelete={true}
                                    size='large'
                                    readonly={false}
                                    onBeforeUpload={this.handleBeforeUpload}
                                    onChange={this.handleImageChange}
                                    onValidate={this.handleImageValidate}
                                    color='disabled'
                                    className='avatar-ctn'
                                // width={Env.CAR_IMAGE_WIDTH}
                                // height={Env.CAR_IMAGE_HEIGHT} 
                                />

                                <div className='info'>
                                    <InfoIcon />
                                    <label>
                                        {strings.RECOMMENDED_IMAGE_SIZE}
                                    </label>
                                </div>

                                <FormControl fullWidth margin="dense">
                                    <InputLabel className='required'>{strings.NAME}</InputLabel>
                                    <Input
                                        type="text"
                                        required
                                        value={name}
                                        autoComplete="off"
                                        onChange={this.handleNameChange}
                                    />
                                </FormControl>

                                {admin &&
                                    <FormControl fullWidth margin="dense">
                                        <CompanySelectList
                                            label={strings.COMPANY}
                                            required
                                            value={company}
                                            type={Env.RECORD_TYPE.COMPANY}
                                            variant='standard'
                                            onChange={this.handleCompanyChange}
                                        />
                                    </FormControl>
                                }

                                <FormControl fullWidth margin="dense">
                                    <LocationSelectList
                                        label={strings.LOCATION}
                                        required
                                        variant='standard'
                                        value={location}
                                        onChange={this.handleLocationChange}
                                    />
                                </FormControl>

                                <FormControl fullWidth margin="dense">
                                    <TextField
                                        label={`${strings.PRICE} (${csStrings.CAR_CURRENCY})`}
                                        // eslint-disable-next-line
                                        inputProps={{ inputMode: 'numeric', pattern: '[0-9]+([\.][0-9]+)?' }}
                                        onChange={this.handlePriceChange}
                                        required
                                        variant='standard'
                                        autoComplete='off'
                                        value={price}
                                    />
                                </FormControl>

                                <FormControl fullWidth margin="dense" className='checkbox-fc'>
                                    <FormControlLabel
                                        control={
                                            <Switch checked={available}
                                                onChange={this.handleAvailableChange}
                                                color="primary" />
                                        }
                                        label={strings.AVAILABLE}
                                        className='checkbox-fcl'
                                    />
                                </FormControl>

                                <FormControl fullWidth margin="dense">
                                    <CarTypeList
                                        label={strings.CAR_TYPE}
                                        variant='standard'
                                        required
                                        value={type}
                                        onChange={this.handleCarTypeChange}
                                    />
                                </FormControl>

                                <FormControl fullWidth margin="dense">
                                    <GearboxList
                                        label={strings.GEARBOX}
                                        variant='standard'
                                        required
                                        value={gearbox}
                                        onChange={this.handleGearboxChange}
                                    />
                                </FormControl>

                                <FormControl fullWidth margin="dense">
                                    <SeatsList
                                        label={strings.SEATS}
                                        variant='standard'
                                        required
                                        value={seats}
                                        onChange={this.handleSeatsChange}
                                    />
                                </FormControl>

                                <FormControl fullWidth margin="dense">
                                    <DoorsList
                                        label={strings.DOORS}
                                        variant='standard'
                                        required
                                        value={doors}
                                        onChange={this.handleDoorsChange}
                                    />
                                </FormControl>

                                <FormControl fullWidth margin="dense">
                                    <FuelPolicyList
                                        label={csStrings.FUEL_POLICY}
                                        variant='standard'
                                        required
                                        value={fuelPolicy}
                                        onChange={this.handleFuelPolicyChange}
                                    />
                                </FormControl>

                                <FormControl fullWidth margin="dense">
                                    <div className='info'>
                                        <InfoIcon />
                                        <label>{commonStrings.OPTIONAL}</label>
                                    </div>
                                </FormControl>

                                <FormControl fullWidth margin="dense" className='checkbox-fc'>
                                    <FormControlLabel
                                        control={
                                            <Switch checked={aircon}
                                                onChange={this.handleAirconChange}
                                                color="primary" />
                                        }
                                        label={strings.AIRCON}
                                        className='checkbox-fcl'
                                    />
                                </FormControl>

                                <FormControl fullWidth margin="dense">
                                    <TextField
                                        label={`${csStrings.MILEAGE} (${csStrings.MILEAGE_UNIT})`}
                                        // eslint-disable-next-line
                                        inputProps={{ inputMode: 'numeric', pattern: '[0-9]+([\.][0-9]+)?' }}
                                        onChange={this.handleMileageChange}
                                        variant='standard'
                                        autoComplete='off'
                                        value={mileage}
                                    />
                                </FormControl>

                                <FormControl fullWidth margin="dense">
                                    <TextField
                                        label={`${csStrings.CANCELLATION} (${commonStrings.CURRENCY})`}
                                        // eslint-disable-next-line
                                        inputProps={{ inputMode: 'numeric', pattern: '[0-9]+([\.][0-9]+)?' }}
                                        onChange={this.handleCancellationChange}
                                        variant='standard'
                                        autoComplete='off'
                                        value={cancellation}
                                    />
                                </FormControl>

                                <FormControl fullWidth margin="dense">
                                    <TextField
                                        label={`${csStrings.AMENDMENTS} (${commonStrings.CURRENCY})`}
                                        // eslint-disable-next-line
                                        inputProps={{ inputMode: 'numeric', pattern: '[0-9]+([\.][0-9]+)?' }}
                                        onChange={this.handleAmendmentsChange}
                                        variant='standard'
                                        autoComplete='off'
                                        value={amendments}
                                    />
                                </FormControl>

                                <FormControl fullWidth margin="dense">
                                    <TextField
                                        label={`${csStrings.THEFT_PROTECTION} (${csStrings.CAR_CURRENCY})`}
                                        // eslint-disable-next-line
                                        inputProps={{ inputMode: 'numeric', pattern: '[0-9]+([\.][0-9]+)?' }}
                                        onChange={this.handleTheftProtectionChange}
                                        variant='standard'
                                        autoComplete='off'
                                        value={theftProtection}
                                    />
                                </FormControl>

                                <FormControl fullWidth margin="dense">
                                    <TextField
                                        label={`${csStrings.COLLISION_DAMAGE_WAVER} (${csStrings.CAR_CURRENCY})`}
                                        // eslint-disable-next-line
                                        inputProps={{ inputMode: 'numeric', pattern: '[0-9]+([\.][0-9]+)?' }}
                                        onChange={this.handleCollisionDamageWaiverChange}
                                        variant='standard'
                                        autoComplete='off'
                                        value={collisionDamageWaiver}
                                    />
                                </FormControl>

                                <FormControl fullWidth margin="dense">
                                    <TextField
                                        label={`${csStrings.FULL_INSURANCE} (${csStrings.CAR_CURRENCY})`}
                                        // eslint-disable-next-line
                                        inputProps={{ inputMode: 'numeric', pattern: '[0-9]+([\.][0-9]+)?' }}
                                        onChange={this.handleFullinsuranceChange}
                                        variant='standard'
                                        autoComplete='off'
                                        value={fullInsurance}
                                    />
                                </FormControl>

                                <FormControl fullWidth margin="dense">
                                    <TextField
                                        label={`${csStrings.ADDITIONAL_DRIVER} (${csStrings.CAR_CURRENCY})`}
                                        // eslint-disable-next-line
                                        inputProps={{ inputMode: 'numeric', pattern: '[0-9]+([\.][0-9]+)?' }}
                                        onChange={this.handleAdditionalDriverChange}
                                        variant='standard'
                                        autoComplete='off'
                                        value={additionalDriver}
                                    />
                                </FormControl>

                                <div className="buttons">
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        className='btn-primary btn-margin-bottom'
                                        size="small"
                                    >
                                        {commonStrings.SAVE}
                                    </Button>
                                    <Button
                                        variant="contained"
                                        className='btn-secondary btn-margin-bottom'
                                        size="small"
                                        href='/cars'
                                    >
                                        {commonStrings.CANCEL}
                                    </Button>
                                </div>

                                <div className="form-error">
                                    {imageRequired && <ErrorMessage message={commonStrings.IMAGE_REQUIRED} />}
                                    {imageSizeError && <ErrorMessage message={strings.CAR_IMAGE_SIZE_ERROR} />}
                                </div>
                            </form>

                        </Paper>
                    </div>}
                {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
                {error && <Error />}
                {noMatch && <NoMatch />}
            </Master>
        );
    }
}