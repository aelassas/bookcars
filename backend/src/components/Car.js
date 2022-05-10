import React, { Component } from 'react';
import Master from '../elements/Master';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/cars';
import CarService from '../services/CarService';
import Error from './Error';
import Backdrop from '../elements/SimpleBackdrop';
import NoMatch from './NoMatch';
import { Avatar } from '../elements/Avatar';
import { toast } from 'react-toastify';
import Helper from '../common/Helper';
import {
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Tooltip,
} from '@mui/material';
import {
    LocalGasStation as FuelIcon,
    AccountTree as GearboxIcon,
    Person as SeatsIcon,
    AcUnit as AirconIcon,
    DirectionsCar as MileageIcon,
    Check as CheckIcon,
    Clear as UncheckIcon
} from '@mui/icons-material';

import DoorsIcon from '../assets/img/car-door.png';
import '../assets/css/car.css';

export default class Car extends Component {

    constructor(props) {
        super(props);
        this.state = {
            user: null,
            car: null,
            error: false,
            visible: false,
            isLoading: false,
            noMatch: false,
            openDeleteDialog: false
        };
    }

    onBeforeUpload = () => {
        this.setState({ isLoading: true });
    };

    onImageChange = _ => {
        this.setState({ isLoading: false });
    };

    handleDelete = _ => {
        this.setState({ openDeleteDialog: true });
    };

    handleCancelDelete = _ => {
        this.setState({ openDeleteDialog: false });
    };

    handleConfirmDelete = _ => {
        const { car } = this.state;

        this.setState({ isLoading: true, openDeleteDialog: false }, _ => {
            CarService.delete(car._id).then(status => {
                console.log(status);
                if (status === 200) {
                    window.location.href = '/cars';
                } else {
                    toast(commonStrings.GENERIC_ERROR, { type: 'error' });
                    this.setState({ isLoading: false });
                }
            }).catch(_ => {
                toast(commonStrings.GENERIC_ERROR, { type: 'error' })
                this.setState({ isLoading: false });
            });
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
                                this.setState({
                                    car,
                                    isLoading: false,
                                    visible: true
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

    componentDidMount() {
    }

    render() {
        const { visible, isLoading, error, noMatch, user, car, openDeleteDialog } = this.state;
        const edit = (user && car && car.company) && (user.type === Env.RECORD_TYPE.ADMIN || user._id === car.company._id);
        const fr = user && user.language === 'fr';

        return (
            <Master onLoad={this.onLoad} strict={true}>
                {visible && car && car.company &&
                    <div className='car'>
                        <div className='col-1'>
                            <section className='car-sec'>
                                <div className='name'><h2>{car.name}</h2></div>
                                <div className='car-img'>
                                    <Avatar
                                        type={Env.RECORD_TYPE.CAR}
                                        mode='update'
                                        record={car}
                                        size='large'
                                        readonly={!edit}
                                        hideDelete={true}
                                        onBeforeUpload={this.handleBeforeUpload}
                                        onChange={this.handleImageChange}
                                        // onValidate={this.handleImageValidate}
                                        color='disabled'
                                        className='avatar-ctn'
                                    // width={Env.CAR_IMAGE_WIDTH}
                                    // height={Env.CAR_IMAGE_HEIGHT} 
                                    />
                                    <div className='car-company'>
                                        <span className='car-company-logo'>
                                            <img src={Helper.joinURL(Env.CDN_USERS, car.company.avatar)}
                                                alt={car.company.fullName}
                                                style={{
                                                    width: Env.COMPANY_IMAGE_WIDTH,
                                                    // height: Env.COMPANY_IMAGE_HEIGHT
                                                }}
                                            />
                                        </span>
                                        <span className='car-company-info'>
                                            {car.company.fullName}
                                        </span>
                                    </div>
                                </div>
                                <div className='price'>{`${car.price} ${strings.CAR_CURRENCY}`}</div>
                                <div className='car-info'>
                                    <ul className='car-info-list'>
                                        <li className='car-type'>
                                            <Tooltip title={Helper.getCarTypeTooltip(car.type)} placement='top'>
                                                <div className='car-info-list-item'>
                                                    <FuelIcon />
                                                    <span className='car-info-list-text'>{Helper.getCarTypeShort(car.type)}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                        <li className='gearbox'>
                                            <Tooltip title={Helper.getGearboxTooltip(car.gearbox)} placement='top'>
                                                <div className='car-info-list-item'>
                                                    <GearboxIcon />
                                                    <span className='car-info-list-text'>{Helper.getGearboxTypeShort(car.gearbox)}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                        <li className='seats'>
                                            <Tooltip title={Helper.getSeatsTooltip(car.seats)} placement='top'>
                                                <div className='car-info-list-item'>
                                                    <SeatsIcon />
                                                    <span className='car-info-list-text'>{car.seats}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                        <li className='doors'>
                                            <Tooltip title={Helper.getDoorsTooltip(car.doors)} placement='top'>
                                                <div className='car-info-list-item'>
                                                    <img src={DoorsIcon} alt='' className='car-doors' />
                                                    <span className='car-info-list-text'>{car.doors}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                        {car.aircon &&
                                            <li className='aircon'>
                                                <Tooltip title={strings.AIRCON_TOOLTIP} placement='top'>
                                                    <div className='car-info-list-item'>
                                                        <AirconIcon />
                                                    </div>
                                                </Tooltip>
                                            </li>
                                        }
                                        <li className='mileage'>
                                            <Tooltip title={Helper.getMileageTooltip(car.mileage, fr)} placement='left'>
                                                <div className='car-info-list-item'>
                                                    <MileageIcon />
                                                    <span className='car-info-list-text'>{`${strings.MILEAGE}${fr ? ' : ' : ': '}${Helper.getMileage(car.mileage)}`}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                        <li className='fuel-policy'>
                                            <Tooltip title={Helper.getFuelPolicyTooltip(car.fuelPolicy)} placement='left'>
                                                <div className='car-info-list-item'>
                                                    <FuelIcon />
                                                    <span className='car-info-list-text'>{`${strings.FUEL_POLICY}${fr ? ' : ' : ': '}${Helper.getFuelPolicy(car.fuelPolicy)}`}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                    </ul>
                                    <ul className='extras-list'>
                                        <li className={car.cancellation > -1 ? 'extra-available' : 'extra-unavailable'}>
                                            <Tooltip title={car.cancellation > -1 ? strings.CANCELLATION_TOOLTIP : Helper.getCancellation(car.cancellation, fr)} placement='left'>
                                                <div className='car-info-list-item'>
                                                    {car.collisionDamageWaiver > -1 ? <CheckIcon /> : <UncheckIcon />}
                                                    <span className='car-info-list-text'>{Helper.getCancellation(car.cancellation, fr)}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                        <li className={car.amendments > -1 ? 'extra-available' : 'extra-unavailable'}>
                                            <Tooltip title={car.amendments > -1 ? strings.AMENDMENTS_TOOLTIP : Helper.getAmendments(car.amendments, fr)} placement='left'>
                                                <div className='car-info-list-item'>
                                                    {car.collisionDamageWaiver > -1 ? <CheckIcon /> : <UncheckIcon />}
                                                    <span className='car-info-list-text'>{Helper.getAmendments(car.amendments, fr)}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                        <li className={car.theftProtection > -1 ? 'extra-available' : 'extra-unavailable'}>
                                            <Tooltip title={car.theftProtection > -1 ? strings.THEFT_PROTECTION_TOOLTIP : Helper.getTheftProtection(car.theftProtection, fr)} placement='left'>
                                                <div className='car-info-list-item'>
                                                    {car.collisionDamageWaiver > -1 ? <CheckIcon /> : <UncheckIcon />}
                                                    <span className='car-info-list-text'>{Helper.getTheftProtection(car.theftProtection, fr)}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                        <li className={car.collisionDamageWaiver > -1 ? 'extra-available' : 'extra-unavailable'}>
                                            <Tooltip title={car.collisionDamageWaiver > -1 ? strings.COLLISION_DAMAGE_WAVER_TOOLTIP : Helper.getCollisionDamageWaiver(car.collisionDamageWaiver, fr)} placement='left'>
                                                <div className='car-info-list-item'>
                                                    {car.collisionDamageWaiver > -1 ? <CheckIcon /> : <UncheckIcon />}
                                                    <span className='car-info-list-text'>{Helper.getCollisionDamageWaiver(car.collisionDamageWaiver, fr)}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                        <li className={car.fullInsurance > -1 ? 'extra-available' : 'extra-unavailable'}>
                                            <Tooltip title={car.fullInsurance > -1 ? strings.FULL_INSURANCE_TOOLTIP : Helper.getFullInsurance(car.fullInsurance, fr)} placement='left'>
                                                <div className='car-info-list-item'>
                                                    {car.fullInsurance > -1 ? <CheckIcon /> : <UncheckIcon />}
                                                    <span className='car-info-list-text'>{Helper.getFullInsurance(car.fullInsurance, fr)}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                        <li className={car.addionaldriver > -1 ? 'extra-available' : 'extra-unavailable'}>
                                            <Tooltip title={Helper.getAdditionalDriver(car.addionaldriver, fr)} placement='left'>
                                                <div className='car-info-list-item'>
                                                    {car.addionaldriver > -1 ? <CheckIcon /> : <UncheckIcon />}
                                                    <span className='car-info-list-text'>{Helper.getAdditionalDriver(car.addionaldriver, fr)}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                    </ul>
                                </div>
                            </section>
                            {edit &&
                                <section className='action'>
                                    <Button
                                        variant="contained"
                                        className='btn-primary btn-margin'
                                        size="small"
                                        href={`/update-car?c=${car._id}`}
                                    >
                                        {commonStrings.UPDATE}
                                    </Button>
                                    <Button
                                        variant="contained"
                                        color='error'
                                        size="small"
                                        onClick={this.handleDelete}
                                    >
                                        {commonStrings.DELETE}
                                    </Button>
                                </section>}
                        </div>
                        <div className='col-2'>
                            <section className='reservations-sec'>
                                TODO
                            </section>
                        </div>
                    </div>
                }
                <Dialog
                    disableEscapeKeyDown
                    maxWidth="xs"
                    open={openDeleteDialog}
                >
                    <DialogTitle>{commonStrings.CONFIRM_TITLE}</DialogTitle>
                    <DialogContent>{strings.DELETE_CAR}</DialogContent>
                    <DialogActions>
                        <Button onClick={this.handleCancelDelete} variant='contained' className='btn-secondary'>{commonStrings.CANCEL}</Button>
                        <Button onClick={this.handleConfirmDelete} variant='contained' color='error'>{commonStrings.DELETE}</Button>
                    </DialogActions>
                </Dialog>
                {isLoading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
                {error && <Error />}
                {noMatch && <NoMatch />}
            </Master>
        );
    }
}