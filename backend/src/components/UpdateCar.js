import React, { useState } from 'react';
import Master from '../elements/Master';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings as csStrings } from '../lang/cars';
import { strings } from '../lang/create-car';
import * as CarService from '../services/CarService';
import * as Helper from '../common/Helper';
import Error from './Error';
import ErrorMessage from '../elements/Error';
import Backdrop from '../elements/SimpleBackdrop';
import NoMatch from './NoMatch';
import Avatar from '../elements/Avatar';
import CompanySelectList from '../elements/CompanySelectList';
import LocationSelectList from '../elements/LocationSelectList';
import CarTypeList from '../elements/CarTypeList';
import GearboxList from '../elements/GearboxList';
import SeatsList from '../elements/SeatsList';
import DoorsList from '../elements/DoorsList';
import FuelPolicyList from '../elements/FuelPolicyList';
import {
    Input,
    InputLabel,
    FormControl,
    Button,
    Paper,
    FormControlLabel,
    Switch,
    TextField,
    FormHelperText
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
import * as UserService from '../services/UserService';

import '../assets/css/create-car.css';
import '../assets/css/update-car.css';

const UpdateCar = () => {
    const [user, setUser] = useState();
    const [car, setCar] = useState();
    const [noMatch, setNoMatch] = useState(false);
    const [loading, setLoading] = useState(false);
    const [visible, setVisible] = useState(false);
    const [error, setError] = useState(false);
    const [imageRequired, setImageRequired] = useState(false);
    const [imageSizeError, setImageSizeError] = useState(false);
    const [image, setImage] = useState();
    const [name, setName] = useState('');
    const [company, setCompany] = useState('');
    const [locations, setLocations] = useState([]);
    const [available, setAvailable] = useState(false);
    const [type, setType] = useState('');
    const [gearbox, setGearbox] = useState('');
    const [price, setPrice] = useState('');
    const [seats, setSeats] = useState('');
    const [doors, setDoors] = useState('');
    const [aircon, setAircon] = useState(false);
    const [mileage, setMileage] = useState('');
    const [fuelPolicy, setFuelPolicy] = useState('');
    const [cancellation, setCancellation] = useState('');
    const [amendments, setAmendments] = useState('');
    const [theftProtection, setTheftProtection] = useState('');
    const [collisionDamageWaiver, setCollisionDamageWaiver] = useState('');
    const [fullInsurance, setFullInsurance] = useState('');
    const [additionalDriver, setAdditionalDriver] = useState('');
    const [minimumAge, setMinimumAge] = useState(Env.MINIMUM_AGE.toString());
    const [minimumAgeValid, setMinimumAgeValid] = useState(true);
    const [formError, setFormError] = useState(false);
    const [deposit, setDeposit] = useState('');

    const handleBeforeUpload = () => {
        setLoading(true);
    };

    const handleImageChange = (image) => {
        setLoading(false);
        setImage(image);

        if (image !== null) {
            setImageRequired(false);
        }
    };

    const handleImageValidate = (valid) => {
        if (!valid) {
            setImageSizeError(true);
            setImageRequired(false);
            setError(false);
            setLoading(false);
        } else {
            setImageSizeError(false);
            setImageRequired(false);
            setError(false);
        }
    };
    const handleNameChange = (e) => {
        setName(e.target.value);
    }

    const handleCompanyChange = (values) => {
        setCompany(values.length > 0 ? values[0] : null);
    };

    const validateMinimumAge = (age, updateState = true) => {
        if (age) {
            const _age = parseInt(age);
            const minimumAgeValid = _age >= Env.MINIMUM_AGE && _age <= 99;
            if (updateState) setMinimumAgeValid(minimumAgeValid);
            if (minimumAgeValid) setFormError(false);
            return minimumAgeValid;
        } else {
            setMinimumAgeValid(true);
            setFormError(false);
            return true;
        }
    };

    const handleMinimumAgeChange = (e) => {
        setMinimumAge(e.target.value);

        const minimumAgeValid = validateMinimumAge(e.target.value, false);
        if (minimumAgeValid) {
            setMinimumAgeValid(true);
            setFormError(false);
        }
    };

    const handleLocationsChange = (locations) => {
        setLocations(locations);
    };

    const handleAvailableChange = (e) => {
        setAvailable(e.target.checked);
    };

    const handleCarTypeChange = (value) => {
        setType(value);
    };

    const handleGearboxChange = (value) => {
        setGearbox(value);
    };

    const handleAirconChange = (e) => {
        setAircon(e.target.checked);
    };

    const handlePriceChange = (e) => {
        setPrice(Helper.isNumber(e.target.value) ? parseFloat(e.target.value) : e.target.value);
    };

    const handleDepositChange = (e) => {
        setDeposit(Helper.isNumber(e.target.value) ? parseFloat(e.target.value) : e.target.value);
    };

    const handleSeatsChange = (value) => {
        setSeats(value);
    };

    const handleDoorsChange = (value) => {
        setDoors(value);
    };

    const handleMileageChange = (e) => {
        setMileage(Helper.isNumber(e.target.value) ? parseFloat(e.target.value) : e.target.value);
    };

    const handleFuelPolicyChange = (value) => {
        setFuelPolicy(value);
    };

    const handleCancellationChange = (e) => {
        setCancellation(Helper.isNumber(e.target.value) ? parseFloat(e.target.value) : e.target.value);
    };

    const handleAmendmentsChange = (e) => {
        setAmendments(Helper.isNumber(e.target.value) ? parseFloat(e.target.value) : e.target.value);
    };

    const handleTheftProtectionChange = (e) => {
        setTheftProtection(Helper.isNumber(e.target.value) ? parseFloat(e.target.value) : e.target.value);
    };

    const handleCollisionDamageWaiverChange = (e) => {
        setCollisionDamageWaiver(Helper.isNumber(e.target.value) ? parseFloat(e.target.value) : e.target.value);
    };

    const handleFullinsuranceChange = (e) => {
        setFullInsurance(Helper.isNumber(e.target.value) ? parseFloat(e.target.value) : e.target.value);
    };

    const handleAdditionalDriverChange = (e) => {
        setAdditionalDriver(Helper.isNumber(e.target.value) ? parseFloat(e.target.value) : e.target.value);
    };

    const getCarExtra = (extra) => (
        extra === -1 ? '' : extra
    );

    const getExtra = (extra) => (
        extra === '' ? -1 : parseFloat(extra)
    );

    const handleSubmit = (e) => {
        e.preventDefault();

        const minimumAgeValid = validateMinimumAge(minimumAge);
        if (!minimumAgeValid) {
            setFormError(true);
            return;
        }

        const data = {
            _id: car._id,
            name,
            company,
            minimumAge: parseInt(minimumAge),
            locations: locations.map(l => l._id),
            price,
            deposit,
            available,
            type,
            gearbox,
            aircon,
            image,
            seats,
            doors,
            fuelPolicy,
            mileage: getExtra(mileage),
            cancellation: getExtra(cancellation),
            amendments: getExtra(amendments),
            theftProtection: getExtra(theftProtection),
            collisionDamageWaiver: getExtra(collisionDamageWaiver),
            fullInsurance: getExtra(fullInsurance),
            additionalDriver: getExtra(additionalDriver)
        };

        CarService.update(data)
            .then(status => {
                if (status === 200) {
                    Helper.info(commonStrings.UPDATED);
                } else {
                    Helper.error();
                }
            })
            .catch(() => {
                UserService.signout();
            });
    };

    const onLoad = (user) => {
        if (user && user.verified) {
            setLoading(true);
            setUser(user);
            const params = new URLSearchParams(window.location.search);
            if (params.has('cr')) {
                const id = params.get('cr');
                if (id && id !== '') {
                    CarService.getCar(id)
                        .then(car => {
                            if (car) {
                                if (user.type === Env.RECORD_TYPE.COMPANY && user._id !== car.company._id) {
                                    setLoading(false);
                                    setNoMatch(true);
                                    return;
                                }

                                const company = { _id: car.company._id, name: car.company.fullName, image: car.company.avatar };

                                setCar(car);
                                setImageRequired(!car.image);
                                setName(car.name);
                                setCompany(company);
                                setMinimumAge(car.minimumAge);
                                setLocations(car.locations.map(l => {
                                    const { _id, name } = l;
                                    return { _id, name };
                                }));
                                setPrice(car.price);
                                setDeposit(car.deposit);
                                setAvailable(car.available);
                                setType(car.type);
                                setGearbox(car.gearbox);
                                setAircon(car.aircon);
                                setSeats(car.seats);
                                setDoors(car.doors);
                                setFuelPolicy(car.fuelPolicy);
                                setMileage(getCarExtra(car.mileage))
                                setCancellation(getCarExtra(car.cancellation));
                                setAmendments(getCarExtra(car.amendments));
                                setTheftProtection(getCarExtra(car.theftProtection));
                                setCollisionDamageWaiver(getCarExtra(car.collisionDamageWaiver));
                                setFullInsurance(getCarExtra(car.fullInsurance));
                                setAdditionalDriver(getCarExtra(car.additionalDriver));
                                setVisible(true);
                                setLoading(false);
                            } else {
                                setLoading(false);
                                setNoMatch(true);
                            }
                        })
                        .catch((err) => {
                            Helper.error(err);
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
    };

    const admin = user && user.type === Env.RECORD_TYPE.ADMIN;

    return (
        <Master onLoad={onLoad} strict={true}>
            {!error && !noMatch &&
                <div className='update-car'>
                    <Paper className="car-form car-form-wrapper" elevation={10} style={visible ? null : { display: 'none' }}>
                        <form onSubmit={handleSubmit}>
                            <Avatar
                                type={Env.RECORD_TYPE.CAR}
                                mode='update'
                                record={car}
                                hideDelete={true}
                                size='large'
                                readonly={false}
                                onBeforeUpload={handleBeforeUpload}
                                onChange={handleImageChange}
                                onValidate={handleImageValidate}
                                color='disabled'
                                className='avatar-ctn'
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
                                    onChange={handleNameChange}
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
                                        onChange={handleCompanyChange}
                                    />
                                </FormControl>
                            }

                            <FormControl fullWidth margin="dense">
                                <InputLabel className='required'>{strings.MINIMUM_AGE}</InputLabel>
                                <Input
                                    type="text"
                                    required
                                    error={!minimumAgeValid}
                                    value={minimumAge}
                                    autoComplete="off"
                                    onChange={handleMinimumAgeChange}
                                    inputProps={{ inputMode: 'numeric', pattern: '^\\d{2}$' }}
                                />
                                <FormHelperText error={!minimumAgeValid}>
                                    {(!minimumAgeValid && strings.MINIMUM_AGE_NOT_VALID) || ''}
                                </FormHelperText>
                            </FormControl>

                            <FormControl fullWidth margin="dense">
                                <LocationSelectList
                                    label={strings.LOCATIONS}
                                    multiple
                                    required
                                    variant='standard'
                                    value={locations}
                                    onChange={handleLocationsChange}
                                />
                            </FormControl>

                            <FormControl fullWidth margin="dense">
                                <TextField
                                    label={`${strings.PRICE} (${csStrings.CAR_CURRENCY})`}
                                    // eslint-disable-next-line
                                    inputProps={{ inputMode: 'numeric', pattern: '^\\d+(\.\\d+)?$' }}
                                    onChange={handlePriceChange}
                                    required
                                    variant='standard'
                                    autoComplete='off'
                                    value={price}
                                />
                            </FormControl>

                            <FormControl fullWidth margin="dense">
                                <TextField
                                    label={`${csStrings.DEPOSIT} (${commonStrings.CURRENCY})`}
                                    // eslint-disable-next-line
                                    inputProps={{ inputMode: 'numeric', pattern: '^\\d+(\.\\d+)?$' }}
                                    onChange={handleDepositChange}
                                    required
                                    variant='standard'
                                    autoComplete='off'
                                    value={deposit}
                                />
                            </FormControl>

                            <FormControl fullWidth margin="dense" className='checkbox-fc'>
                                <FormControlLabel
                                    control={
                                        <Switch checked={available}
                                            onChange={handleAvailableChange}
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
                                    onChange={handleCarTypeChange}
                                />
                            </FormControl>

                            <FormControl fullWidth margin="dense">
                                <GearboxList
                                    label={strings.GEARBOX}
                                    variant='standard'
                                    required
                                    value={gearbox}
                                    onChange={handleGearboxChange}
                                />
                            </FormControl>

                            <FormControl fullWidth margin="dense">
                                <SeatsList
                                    label={strings.SEATS}
                                    variant='standard'
                                    required
                                    value={seats}
                                    onChange={handleSeatsChange}
                                />
                            </FormControl>

                            <FormControl fullWidth margin="dense">
                                <DoorsList
                                    label={strings.DOORS}
                                    variant='standard'
                                    required
                                    value={doors}
                                    onChange={handleDoorsChange}
                                />
                            </FormControl>

                            <FormControl fullWidth margin="dense">
                                <FuelPolicyList
                                    label={csStrings.FUEL_POLICY}
                                    variant='standard'
                                    required
                                    value={fuelPolicy}
                                    onChange={handleFuelPolicyChange}
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
                                            onChange={handleAirconChange}
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
                                    inputProps={{ inputMode: 'numeric', pattern: '^\\d+(\.\\d+)?$' }}
                                    onChange={handleMileageChange}
                                    variant='standard'
                                    autoComplete='off'
                                    value={mileage}
                                />
                            </FormControl>

                            <FormControl fullWidth margin="dense">
                                <TextField
                                    label={`${csStrings.CANCELLATION} (${commonStrings.CURRENCY})`}
                                    // eslint-disable-next-line
                                    inputProps={{ inputMode: 'numeric', pattern: '^\\d+(\.\\d+)?$' }}
                                    onChange={handleCancellationChange}
                                    variant='standard'
                                    autoComplete='off'
                                    value={cancellation}
                                />
                            </FormControl>

                            <FormControl fullWidth margin="dense">
                                <TextField
                                    label={`${csStrings.AMENDMENTS} (${commonStrings.CURRENCY})`}
                                    // eslint-disable-next-line
                                    inputProps={{ inputMode: 'numeric', pattern: '^\\d+(\.\\d+)?$' }}
                                    onChange={handleAmendmentsChange}
                                    variant='standard'
                                    autoComplete='off'
                                    value={amendments}
                                />
                            </FormControl>

                            <FormControl fullWidth margin="dense">
                                <TextField
                                    label={`${csStrings.THEFT_PROTECTION} (${csStrings.CAR_CURRENCY})`}
                                    // eslint-disable-next-line
                                    inputProps={{ inputMode: 'numeric', pattern: '^\\d+(\.\\d+)?$' }}
                                    onChange={handleTheftProtectionChange}
                                    variant='standard'
                                    autoComplete='off'
                                    value={theftProtection}
                                />
                            </FormControl>

                            <FormControl fullWidth margin="dense">
                                <TextField
                                    label={`${csStrings.COLLISION_DAMAGE_WAVER} (${csStrings.CAR_CURRENCY})`}
                                    // eslint-disable-next-line
                                    inputProps={{ inputMode: 'numeric', pattern: '^\\d+(\.\\d+)?$' }}
                                    onChange={handleCollisionDamageWaiverChange}
                                    variant='standard'
                                    autoComplete='off'
                                    value={collisionDamageWaiver}
                                />
                            </FormControl>

                            <FormControl fullWidth margin="dense">
                                <TextField
                                    label={`${csStrings.FULL_INSURANCE} (${csStrings.CAR_CURRENCY})`}
                                    // eslint-disable-next-line
                                    inputProps={{ inputMode: 'numeric', pattern: '^\\d+(\.\\d+)?$' }}
                                    onChange={handleFullinsuranceChange}
                                    variant='standard'
                                    autoComplete='off'
                                    value={fullInsurance}
                                />
                            </FormControl>

                            <FormControl fullWidth margin="dense">
                                <TextField
                                    label={`${csStrings.ADDITIONAL_DRIVER} (${csStrings.CAR_CURRENCY})`}
                                    // eslint-disable-next-line
                                    inputProps={{ inputMode: 'numeric', pattern: '^\\d+(\.\\d+)?$' }}
                                    onChange={handleAdditionalDriverChange}
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
                                {formError && <ErrorMessage message={commonStrings.FORM_ERROR} />}
                            </div>
                        </form>

                    </Paper>
                </div>}
            {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
            {error && <Error />}
            {noMatch && <NoMatch hideHeader />}
        </Master>
    );
}

export default UpdateCar;