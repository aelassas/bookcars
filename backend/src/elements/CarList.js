import React, { Component } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/cars';
import Helper from '../common/Helper';
import CarService from '../services/CarService';
import { toast } from 'react-toastify';
import Backdrop from './SimpleBackdrop';
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
            user: props.user,
            keyword: props.keyword,
            companies: props.companies,
            loading: true,
            fetch: false,
            reload: false,
            rows: [],
            rowCount: 0,
            page: 1,
            size: Env.CARS_PAGE_SIZE,
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
        const { carId, carIndex, rows, rowCount } = this.state;

        if (carId !== '' && carIndex > -1) {
            this.setState({ loading: true, openDeleteDialog: false });

            CarService.delete(carId)
                .then(status => {
                    if (status === 200) {
                        rows.splice(carIndex, 1);
                        this.setState({ rows, rowCount: rowCount - 1, loading: false, carId: '', carIndex: -1 }, () => {
                            if (this.props.onDelete) {
                                this.props.onDelete(this.state.rowCount);
                            }
                        });
                    } else {
                        toast(commonStrings.GENERIC_ERROR, { type: 'error' });
                        this.setState({ loading: false, carId: '', carIndex: -1 });
                    }
                }).catch((err) => {
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

    fetch = () => {
        const { keyword, page, size, companies, rows } = this.state;

        this.setState({ loading: true });

        CarService.getCars(keyword, companies, page, size)
            .then(data => {
                const _data = data.length > 0 ? data[0] : {};
                if (_data.length === 0) _data.resultData = [];
                const totalRecords = _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0;
                const _rows = page === 1 ? _data.resultData : [...rows, ..._data.resultData];
                this.setState({ rows: _rows, rowCount: totalRecords, loading: false, fetch: _data.resultData.length > 0 }, () => {
                    if (page === 1) {
                        document.querySelector('section.car-list').scrollTo(0, 0);
                    }
                    if (this.props.onLoad) {
                        this.props.onLoad({ rows: _data.resultData, rowCount: totalRecords });
                    }
                });
            })
            .catch(() => toast(commonStrings.GENERIC_ERROR, { type: 'error' }));
    };

    static getDerivedStateFromProps(nextProps, prevState) {
        const { keyword, companies, reload } = prevState;

        if (keyword !== nextProps.keyword) {
            return { keyword: nextProps.keyword };
        }

        if (nextProps.companies && !Helper.arrayEqual(companies, nextProps.companies)) {
            return { companies: Helper.clone(nextProps.companies) };
        }

        if (reload !== nextProps.reload) {
            return { reload: nextProps.reload };
        }

        return null;
    }

    componentDidUpdate(prevProps, prevState) {
        const { keyword, companies, reload } = this.state;

        if (keyword !== prevState.keyword) {
            return this.setState({ page: 1 }, () => this.fetch());
        }

        if (!Helper.arrayEqual(companies, prevState.companies)) {
            return this.setState({ page: 1 }, () => this.fetch());
        }

        if (reload && !prevState.reload) {
            return this.setState({ page: 1 }, () => this.fetch());
        }
    }

    componentDidMount() {
        const section = document.querySelector('section.car-list');
        if (section) {
            section.onscroll = (event) => {
                const { fetch, loading, page } = this.state;
                if (fetch
                    && !loading
                    && event.target.scrollTop > 0
                    && (event.target.offsetHeight + event.target.scrollTop) >= (event.target.scrollHeight - Env.CAR_PAGE_OFFSET)) {
                    this.setState({ page: page + 1 }, () => {
                        this.fetch();
                    });
                }
            };
        }

        const { companies, cars } = this.props;

        if (companies) {
            if (companies.length > 0) {
                this.fetch();
            } else {
                this.setState({ rows: [], rowCount: 0, loading: false, fetch: false }, () => {
                    if (this.props.onLoad) {
                        this.props.onLoad({ rows: [], rowCount: 0 });
                    }
                });
            }
        } else if (cars) {
            this.setState({ rows: cars, rowCount: cars.length, loading: false, fetch: false }, () => {
                if (this.props.onLoad) {
                    this.props.onLoad({ rows: cars, rowCount: cars.length });
                }
            });
        }
    }

    render() {
        const { user, rows, loading, openDeleteDialog } = this.state;
        const admin = Helper.admin(user);
        const fr = user && user.language === 'fr';

        return (
            user &&
            <section className='car-list'>
                {rows.length === 0 ?
                    !loading && <Card variant="outlined" className="empty-list">
                        <CardContent>
                            <Typography color="textSecondary">{strings.EMPTY_LIST}</Typography>
                        </CardContent>
                    </Card>
                    :
                    rows.map((car, index) => {
                        const edit = admin || car.company._id === user._id;
                        return (
                            <article key={car._id}>
                                <div className='name'><h2>{car.name}</h2></div>
                                <div className='car'>
                                    <img src={Helper.joinURL(Env.CDN_CARS, car.image)}
                                        alt={car.name} className='car-img'
                                        style={{
                                            maxWidth: Env.CAR_IMAGE_WIDTH,
                                        }} />
                                    {!this.props.hideCompany && <div className='car-company'>
                                        <span className='car-company-logo'>
                                            <img src={Helper.joinURL(Env.CDN_USERS, car.company.avatar)}
                                                alt={car.company.fullName}
                                                style={{
                                                    width: Env.COMPANY_IMAGE_WIDTH,
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

                                    {edit &&
                                        <Tooltip title={commonStrings.UPDATE}>
                                            <IconButton href={`/update-car?cr=${car._id}`}>
                                                <EditIcon />
                                            </IconButton>
                                        </Tooltip>
                                    }

                                    {edit &&
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
                    })
                }
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
                {loading && <Backdrop text={commonStrings.LOADING} />}
            </section>
        );
    }
}

export default CarList;