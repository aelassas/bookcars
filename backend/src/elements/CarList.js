import React, { Component } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/cars';
import Helper from '../common/Helper';
import CarService from '../services/CarService';
import { toast } from 'react-toastify';
import {
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Tooltip,
    Card,
    CardContent,
    Typography
} from '@mui/material';
import {
    LocalGasStation as FuelIcon,
    AccountTree as GearboxIcon,
    Person as SeatsIcon,
    AcUnit as AirconIcon,
    DirectionsCar as MileageIcon,
    Check as CheckIcon,
    Clear as UncheckIcon,
    Visibility as ViewIcon,
    Edit as EditIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';

import DoorsIcon from '../assets/img/car-door.png';

import '../assets/css/car-list.css';

class CarList extends Component {

    constructor(props) {
        super(props);
        this.state = {
            cars: [],
            openDeleteDialog: false,
            carId: '',
            carIndex: -1
        };
    }

    handleDelete = (e) => {
        const carId = e.currentTarget.getAttribute('data-id');
        const carIndex = e.currentTarget.getAttribute('data-index');
        this.setState({ openDeleteDialog: true, carId, carIndex });
    };

    handleConfirmDelete = () => {
        const { carId, carIndex, cars } = this.state;

        if (carId !== '' && carIndex > -1) {
            this.setState({ loading: true, openDeleteDialog: false });
            CarService.delete(carId).then(status => {
                if (status === 200) {
                    const _cars = [...cars];
                    _cars.splice(carIndex, 1);
                    this.setState({ cars: _cars, loading: false, carId: '', carIndex: -1 });
                } else {
                    toast(commonStrings.GENERIC_ERROR, { type: 'error' });
                    this.setState({ loading: false, carId: '', carIndex: -1 });
                }
            }).catch(() => {
                toast(commonStrings.GENERIC_ERROR, { type: 'error' })
                this.setState({ loading: false, carId: '', carIndex: -1 });
            });
        } else {
            toast(commonStrings.GENERIC_ERROR, { type: 'error' });
            this.setState({ openDeleteDialog: false, carId: '', carIndex: -1 });
        }
    };

    handleCancelDelete = () => {
        this.setState({ openDeleteDialog: false, carId: '' });
    };


    render() {
        const { openDeleteDialog } = this.state;
        const user = this.props.user;
        const cars = this.props.cars;
        const admin = user && user.type === Env.RECORD_TYPE.ADMIN;
        const fr = user && user.language === 'fr';

        return (
            cars && cars.length > 0 ?
                <section className='cars-list'>
                    {cars.map((car, index) => {
                        const canEdit = admin || car.company._id === user._id;
                        return (
                            <article key={car._id}>
                                <div className='name'><h2>{car.name}</h2></div>
                                <div className='car'>
                                    <img src={Helper.joinURL(Env.CDN_CARS, car.image)}
                                        alt={car.name} className='car-img'
                                        style={{
                                            maxWidth: Env.CAR_IMAGE_WIDTH,
                                            // maxHeight: Env.CAR_IMAGE_HEIGHT
                                        }} />
                                    {!this.props.hideCompany && <div className='car-company'>
                                        <span className='car-company-logo'>
                                            <img src={Helper.joinURL(Env.CDN_USERS, car.company.avatar)}
                                                alt={car.company.fullName}
                                                style={{
                                                    width: Env.COMPANY_IMAGE_WIDTH,
                                                    // height: Env.COMPANY_IMAGE_HEIGHT
                                                }}
                                            />
                                        </span>
                                        <a href={`/company?c=${car.company._id}`} className='car-company-info'>
                                            {car.company.fullName}
                                        </a>
                                    </div>}
                                </div>
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
                                        <li className={car.available ? 'car-available' : 'car-unavailable'}>
                                            <Tooltip title={car.available ? strings.CAR_AVAILABLE_TOOLTIP : strings.CAR_UNAVAILABLE_TOOLTIP} placement='left'>
                                                <div className='car-info-list-item'>
                                                    {car.available ? <CheckIcon /> : <UncheckIcon />}
                                                    {car.available ?
                                                        <span className='car-info-list-text'>{strings.CAR_AVAILABLE}</span>
                                                        :
                                                        <span className='car-info-list-text'>{strings.CAR_UNAVAILABLE}</span>
                                                    }
                                                </div>
                                            </Tooltip>
                                        </li>
                                        <li>
                                            <Tooltip title={car.cancellation > -1 ? strings.CANCELLATION_TOOLTIP : Helper.getCancellation(car.cancellation, fr)} placement='left'>
                                                <div className='car-info-list-item'>
                                                    {car.collisionDamageWaiver > -1 ? <CheckIcon /> : <UncheckIcon />}
                                                    <span className='car-info-list-text'>{Helper.getCancellation(car.cancellation, fr)}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                        <li>
                                            <Tooltip title={car.amendments > -1 ? strings.AMENDMENTS_TOOLTIP : Helper.getAmendments(car.amendments, fr)} placement='left'>
                                                <div className='car-info-list-item'>
                                                    {car.collisionDamageWaiver > -1 ? <CheckIcon /> : <UncheckIcon />}
                                                    <span className='car-info-list-text'>{Helper.getAmendments(car.amendments, fr)}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                        <li>
                                            <Tooltip title={car.theftProtection > -1 ? strings.THEFT_PROTECTION_TOOLTIP : Helper.getTheftProtection(car.theftProtection, fr)} placement='left'>
                                                <div className='car-info-list-item'>
                                                    {car.collisionDamageWaiver > -1 ? <CheckIcon /> : <UncheckIcon />}
                                                    <span className='car-info-list-text'>{Helper.getTheftProtection(car.theftProtection, fr)}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                        <li>
                                            <Tooltip title={car.collisionDamageWaiver > -1 ? strings.COLLISION_DAMAGE_WAVER_TOOLTIP : Helper.getCollisionDamageWaiver(car.collisionDamageWaiver, fr)} placement='left'>
                                                <div className='car-info-list-item'>
                                                    {car.collisionDamageWaiver > -1 ? <CheckIcon /> : <UncheckIcon />}
                                                    <span className='car-info-list-text'>{Helper.getCollisionDamageWaiver(car.collisionDamageWaiver, fr)}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                        <li>
                                            <Tooltip title={car.fullInsurance > -1 ? strings.FULL_INSURANCE_TOOLTIP : Helper.getFullInsurance(car.fullInsurance, fr)} placement='left'>
                                                <div className='car-info-list-item'>
                                                    {car.fullInsurance > -1 ? <CheckIcon /> : <UncheckIcon />}
                                                    <span className='car-info-list-text'>{Helper.getFullInsurance(car.fullInsurance, fr)}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                        <li>
                                            <Tooltip title={Helper.getAdditionalDriver(car.additionalDriver, fr)} placement='left'>
                                                <div className='car-info-list-item'>
                                                    {car.additionalDriver > -1 ? <CheckIcon /> : <UncheckIcon />}
                                                    <span className='car-info-list-text'>{Helper.getAdditionalDriver(car.additionalDriver, fr)}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                    </ul>
                                </div>
                                <div className='price'>{`${car.price} ${strings.CAR_CURRENCY}`}</div>
                                <div className='action'>
                                    <Tooltip title={strings.VIEW_CAR}>
                                        <IconButton href={`/car?cr=${car._id}`}>
                                            <ViewIcon />
                                        </IconButton>
                                    </Tooltip>

                                    {canEdit &&
                                        <Tooltip title={commonStrings.UPDATE}>
                                            <IconButton href={`/update-car?cr=${car._id}`}>
                                                <EditIcon />
                                            </IconButton>
                                        </Tooltip>
                                    }

                                    {canEdit &&
                                        <Tooltip title={commonStrings.DELETE}>
                                            <IconButton data-id={car._id}
                                                data-index={index}
                                                onClick={this.handleDelete}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </Tooltip>
                                    }
                                </div>
                            </article>
                        );
                    }
                    )}
                    <Dialog
                        disableEscapeKeyDown
                        maxWidth="xs"
                        open={openDeleteDialog}
                    >
                        <DialogTitle className='dialog-header'>{commonStrings.CONFIRM_TITLE}</DialogTitle>
                        <DialogContent>{strings.DELETE_CAR}</DialogContent>
                        <DialogActions className='dialog-actions'>
                            <Button onClick={this.handleCancelDelete} variant='contained' className='btn-secondary'>{commonStrings.CANCEL}</Button>
                            <Button onClick={this.handleConfirmDelete} variant='contained' color='error'>{commonStrings.DELETE}</Button>
                        </DialogActions>
                    </Dialog>
                </section>
                :
                this.props.loading ?
                    <></>
                    :
                    <Card variant="outlined" className="cars-card">
                        <CardContent>
                            <Typography color="textSecondary">
                                {strings.EMPTY_CARS_LIST}
                            </Typography>
                        </CardContent>
                    </Card>
        );
    }
}

export default CarList;