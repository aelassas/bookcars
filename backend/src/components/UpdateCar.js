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
import CompanyList from '../elements/CompanyList';
import LocationList from '../elements/LocationList';
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
            isLoading: false,
            visible: false,
            error: false,
            imageRequired: false,
            imageSizeError: false,
            image: null,
            companies: [],
            name: '',
            company: null,
            locations: [],
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
        this.setState({ isLoading: true });
    };

    handleImageChange = (image) => {
        this.setState({ isLoading: false, image });
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
                isLoading: false,
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

    handleLocationsChange = (values) => {
        this.setState({ locations: values });
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
            locations,
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
            locations,
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
            .catch(_ => {
                toast(commonStrings.GENERIC_ERROR, { type: 'error' });
            });
    };

    onLoad = (user) => {

        this.setState({ user, isLoading: true }, _ => {
            const params = new URLSearchParams(window.location.search);
            if (params.has('c')) {
                const id = params.get('c');
                if (id && id !== '') {
                    CarService.getCar(id)
                        .then(car => {
                            if (car) {
                                if (user.type === Env.RECORD_TYPE.COMPANY && user._id !== car.company._id) {
                                    this.setState({ isLoading: false, noMatch: true });
                                    return;
                                }

                                const company = { _id: car.company._id, name: car.company.fullName, image: car.company.avatar };

                                const locations = [];
                                for (const { _id, name } of car.locations) {
                                    locations.push({ _id, name });
                                }

                                this.setState({
                                    car,
                                    isLoading: false,
                                    visible: true,

                                    imageRequired: !car.image,
                                    name: car.name,
                                    company,
                                    locations,
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
                                }, _ => {
                                    console.log(this.state.imageRequired)
                                });
                            } else {
                                this.setState({ isLoading: false, noMatch: true });
                            }
                        })
                        .catch(_ => {
                            this.setState({ isLoading: false, error: true, visible: false });
                        });
                } else {
                    this.setState({ isLoading: false, noMatch: true });
                }
            } else {
                this.setState({ isLoading: false, noMatch: true });
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
            isLoading,

            name,
            company,
            locations,
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
                            <h1 className="car-form-title"> {strings.NEW_CAR_HEADING} </h1>
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
                                        <CompanyList
                                            label={strings.COMPANY}
                                            required={true}
                                            multiple={false}
                                            value={company}
                                            type={Env.RECORD_TYPE.COMPANY}
                                            variant='standard'
                                            onChange={this.handleCompanyChange}
                                        />
                                    </FormControl>
                                }

                                <FormControl fullWidth margin="dense">
                                    <LocationList
                                        label={strings.LOCATIONS}
                                        required={true}
                                        multiple={true}
                                        value={locations}
                                        variant='standard'
                                        onChange={this.handleLocationsChange}
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
                                        required={true}
                                        value={type}
                                        onChange={this.handleCarTypeChange}
                                    />
                                </FormControl>

                                <FormControl fullWidth margin="dense">
                                    <GearboxList
                                        label={strings.GEARBOX}
                                        variant='standard'
                                        required={true}
                                        value={gearbox}
                                        onChange={this.handleGearboxChange}
                                    />
                                </FormControl>

                                <FormControl fullWidth margin="dense">
                                    <SeatsList
                                        label={strings.SEATS}
                                        variant='standard'
                                        required={true}
                                        value={seats}
                                        onChange={this.handleSeatsChange}
                                    />
                                </FormControl>

                                <FormControl fullWidth margin="dense">
                                    <DoorsList
                                        label={strings.DOORS}
                                        variant='standard'
                                        required={true}
                                        value={doors}
                                        onChange={this.handleDoorsChange}
                                    />
                                </FormControl>

                                <FormControl fullWidth margin="dense">
                                    <FuelPolicyList
                                        label={csStrings.FUEL_POLICY}
                                        variant='standard'
                                        required={true}
                                        value={fuelPolicy}
                                        onChange={this.handleFuelPolicyChange}
                                    />
                                </FormControl>

                                <FormControl fullWidth margin="dense">
                                    <div className='info'>
                                        <InfoIcon />
                                        <label>{strings.OPTIONAL}</label>
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
                                        className='btn-primary'
                                        size="small"
                                    >
                                        {commonStrings.UPDATE}
                                    </Button>
                                    <Button
                                        variant="contained"
                                        className='btn-secondary'
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
                {isLoading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
                {error && <Error />}
                {noMatch && <NoMatch />}
            </Master>
        );
    }
}