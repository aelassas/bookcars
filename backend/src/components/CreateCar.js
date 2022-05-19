import React, { Component } from 'react';
import Master from '../elements/Master';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings as csStrings } from '../lang/cars';
import { strings } from '../lang/create-car';
import CarService from '../services/CarService';
import Helper from '../common/Helper';
import Error from '../elements/Error';
import Backdrop from '../elements/SimpleBackdrop';
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

export default class CreateCar extends Component {

    constructor(props) {
        super(props);
        this.state = {
            user: null,
            isCompany: false,
            loading: false,
            visible: false,
            imageError: false,
            imageSizeError: false,
            image: null,
            name: '',
            company: '',
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
            this.setState({ imageError: false });
        }
    };

    handleImageValidate = (valid) => {
        if (!valid) {
            this.setState({
                imageSizeError: true,
                imageError: false,
                error: false,
                loading: false,
            });
        } else {
            this.setState({
                imageSizeError: false,
                imageError: false,
                error: false,
            });
        }
    };

    handleNameChange = (e) => {
        this.setState({ name: e.target.value });
    }

    handleCompanyChange = (values) => {
        this.setState({ company: values.length > 0 ? values[0]._id : null });
    };

    handleLocationChange = (values) => {
        this.setState({ location: values.length > 0 ? values[0]._id : null });
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

    getExtra = (extra) => (
        extra === '' ? -1 : extra
    );

    handleSubmit = (e) => {
        e.preventDefault();

        if (!this.state.image) {
            this.setState({
                imageError: true,
                imageSizeError: false,
                error: false
            });
            return;
        }

        const {
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

        CarService.create(data)
            .then(car => {
                if (car && car._id) {
                    window.location = `/car?cr=${car._id}`;
                } else {
                    toast(commonStrings.GENERIC_ERROR, { type: 'error' });
                }
            })
            .catch(() => {
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
            isCompany,
            visible,
            imageError,
            imageSizeError,
            loading,
            name,
            available,
            price,
            aircon,
            mileage,
            cancellation,
            amendments,
            theftProtection,
            collisionDamageWaiver,
            fullInsurance,
            additionalDriver
        } = this.state;

        return (
            <Master onLoad={this.onLoad} strict={true}>
                <div className='create-car'>
                    <Paper className="car-form car-form-wrapper" elevation={10} style={visible ? null : { display: 'none' }}>
                        <h1 className="car-form-title"> {strings.NEW_CAR_HEADING} </h1>
                        <form onSubmit={this.handleSubmit}>
                            <Avatar
                                type={Env.RECORD_TYPE.CAR}
                                mode='create'
                                record={null}
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

                            {!isCompany &&
                                <FormControl fullWidth margin="dense">
                                    <CompanySelectList
                                        label={strings.COMPANY}
                                        required
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
                                    onChange={this.handleCarTypeChange}
                                />
                            </FormControl>

                            <FormControl fullWidth margin="dense">
                                <GearboxList
                                    label={strings.GEARBOX}
                                    variant='standard'
                                    required
                                    onChange={this.handleGearboxChange}
                                />
                            </FormControl>

                            <FormControl fullWidth margin="dense">
                                <SeatsList
                                    label={strings.SEATS}
                                    variant='standard'
                                    required
                                    onChange={this.handleSeatsChange}
                                />
                            </FormControl>

                            <FormControl fullWidth margin="dense">
                                <DoorsList
                                    label={strings.DOORS}
                                    variant='standard'
                                    required
                                    onChange={this.handleDoorsChange}
                                />
                            </FormControl>

                            <FormControl fullWidth margin="dense">
                                <FuelPolicyList
                                    label={csStrings.FUEL_POLICY}
                                    variant='standard'
                                    required
                                    onChange={this.handleFuelPolicyChange}
                                />
                            </FormControl>

                            <div className='info'>
                                <InfoIcon />
                                <label>{commonStrings.OPTIONAL}</label>
                            </div>

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
                                    {commonStrings.CREATE}
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
                                {imageError && <Error message={commonStrings.IMAGE_REQUIRED} />}
                                {imageSizeError && <Error message={strings.CAR_IMAGE_SIZE_ERROR} />}
                            </div>
                        </form>

                    </Paper>
                </div>
                {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
            </Master>
        );
    }
}