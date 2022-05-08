import React, { Component } from 'react';
import Master from '../elements/Master';
import Env from '../config/env.config';
import { strings } from '../config/app.config';
import Helper from '../common/Helper';
import CarService from '../services/CarService';
import CompanyService from '../services/CompanyService';
import Backdrop from '../elements/SimpleBackdrop';
import { Avatar } from '../elements/Avatar';
import { toast } from 'react-toastify';
import {
    IconButton,
    Input,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Tooltip,
} from '@mui/material';
import {
    Search as SearchIcon,
    LocalGasStation as FuelIcon,
    AccountTree as GearboxIcon,
    Person as SeatsIcon,
    AcUnit as AirconIcon,
    DirectionsCar as MileageIcon,
    Check as CheckIcon,
    Clear as UncheckIcon
} from '@mui/icons-material';

import DoorsIcon from '../assets/img/car-door.png';
import '../assets/css/cars.css';

export default class Cars extends Component {

    constructor(props) {
        super(props);
        this.state = {
            user: null,
            companies: [],
            companyIds: [],
            checkedCompanies: [],
            allCompaniesChecked: true,
            cars: [],
            page: 1,
            isLoading: false,
            fetch: false,
            keyword: '',
            openDeleteDialog: false,
            carId: '',
            carIndex: -1
        };
    }

    handleSearchChange = (e) => {
        this.setState({ keyword: e.target.value });
    };

    handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') {
            this.handleSearch();
        }
    }

    handleSearch = (e) => {
        document.querySelector('.col-2').scrollTo(0, 0);
        this.setState({ page: 1 }, () => {
            this.fetch();
        });
    };

    handleDelete = (e) => {
        const carId = e.currentTarget.getAttribute('data-id');
        const carIndex = e.currentTarget.getAttribute('data-index');
        this.setState({ openDeleteDialog: true, carId, carIndex });
    };

    handleConfirmDelete = _ => {
        const { carId, carIndex, cars } = this.state;

        if (carId !== '' && carIndex > -1) {
            this.setState({ isLoading: true, openDeleteDialog: false });
            CarService.delete(carId).then(status => {
                if (status === 200) {
                    const _cars = [...cars];
                    _cars.splice(carIndex, 1);
                    this.setState({ cars: _cars, isLoading: false, carId: '', carIndex: -1 });
                } else {
                    toast(strings.GENERIC_ERROR, { type: 'error' });
                    this.setState({ isLoading: false, carId: '', carIndex: -1 });
                }
            }).catch(() => {
                toast(strings.GENERIC_ERROR, { type: 'error' })
                this.setState({ isLoading: false, carId: '', carIndex: -1 });
            });
        } else {
            toast(strings.GENERIC_ERROR, { type: 'error' });
            this.setState({ openDeleteDialog: false, carId: '', carIndex: -1 });
        }
    };

    handleCancelDelete = _ => {
        this.setState({ openDeleteDialog: false, carId: '' });
    };

    handleCheckCompanyChange = (e) => {
        const { checkedCompanies } = this.state;
        const companyId = e.currentTarget.getAttribute('data-id');

        if (e.currentTarget.checked) {
            checkedCompanies.push(companyId);
        } else {
            const index = checkedCompanies.indexOf(companyId);
            checkedCompanies.splice(index, 1);
        }

        this.setState({ checkedCompanies }, _ => {
            this.handleSearch();
        });

    };

    handleUncheckAllChange = (e) => {
        const { allCompaniesChecked } = this.state;
        const checkboxes = document.querySelectorAll('.company-checkbox');

        if (allCompaniesChecked) { // uncheck all
            this.setState({ allCompaniesChecked: false, checkedCompanies: [] });

            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
        } else { // check all
            this.setState({ allCompaniesChecked: true, checkedCompanies: this.state.companyIds });

            checkboxes.forEach(checkbox => {
                checkbox.checked = true;
            });

            this.handleSearch();
        }
    };

    fetch = _ => {
        const { keyword, page, checkedCompanies, cars } = this.state;
        const payload = checkedCompanies;

        this.setState({ isLoading: true });
        CarService.getCars(keyword, payload, page, Env.PAGE_SIZE)
            .then(data => {
                setTimeout(_ => {
                    const _cars = page === 1 ? data : [...cars, ...data];
                    this.setState({ cars: _cars, isLoading: false, fetch: data.length > 0 });
                }, 500);
            })
            .catch(() => toast(strings.GENERIC_ERROR, { type: 'error' }));
    };

    flattenCompanies = (companies) => {
        const result = [];
        for (const { _id } of companies) {
            result.push(_id);
        }
        return result;
    }

    onLoad = (user) => {
        this.setState({ user }, _ => {

            CompanyService.getCompanies()
                .then(companies => {
                    const companyIds = this.flattenCompanies(companies);
                    this.setState({ companies, companyIds, checkedCompanies: companyIds }, _ => {
                        const checkboxes = document.querySelectorAll('.company-checkbox');
                        checkboxes.forEach(checkbox => {
                            checkbox.checked = true;
                        });

                        this.fetch();
                    });
                })
                .catch(_ => toast(strings.GENERIC_ERROR, { type: 'error' }));


            const div = document.querySelector('.col-2');
            if (div) {
                div.onscroll = (event) => {
                    const { fetch, isLoading, page } = this.state;
                    if (fetch && !isLoading && (((window.innerHeight - Env.PAGE_TOP_OFFSET) + event.target.scrollTop)) >= (event.target.scrollHeight - Env.PAGE_FETCH_OFFSET)) {
                        this.setState({ page: page + 1 }, _ => {
                            this.fetch();
                        });
                    }
                };
            }
        });
    }

    componentDidMount() {
    }

    render() {
        const { user, companies, allCompaniesChecked, cars, isLoading, openDeleteDialog } = this.state;
        const isAdmin = user && user.type === Env.USER_TYPE.ADMIN;
        const fr = user && user.language === 'fr';

        return (
            <Master onLoad={this.onLoad} strict={true}>
                <div className='cars'>
                    <div className='col-1'>
                        <Input
                            type="text"
                            className='search'
                            placeholder={strings.SEARCH_PLACEHOLDER}
                            onKeyDown={this.handleSearchKeyDown}
                            onChange={this.handleSearchChange}
                        />
                        <IconButton onClick={this.handleSearch}>
                            <SearchIcon />
                        </IconButton>
                        {companies.length > 0 &&
                            <div className='companies-filter'>
                                <ul className='companies-list'>
                                    {
                                        companies.map(company => (
                                            <li key={company._id}>
                                                <input type='checkbox' data-id={company._id} className='company-checkbox' onChange={this.handleCheckCompanyChange} />
                                                <label>
                                                    <Avatar
                                                        user={company}
                                                        type={Env.USER_TYPE.COMPANY}
                                                        readonly
                                                    />
                                                </label>
                                            </li>
                                        ))
                                    }
                                </ul>
                                <div className='filter-actions'>
                                    <span onClick={this.handleUncheckAllChange} className='uncheckall'>
                                        {allCompaniesChecked ? strings.UNCHECK_ALL : strings.CHECK_ALL}
                                    </span>
                                </div>
                            </div>}
                        <Button
                            type="submit"
                            variant="contained"
                            className='btn-primary new-car'
                            size="small"
                            href='/create-car'
                        >
                            {strings.NEW_CAR}
                        </Button>
                    </div>
                    <div className='col-2'>
                        <section className='list'>
                            {cars.map((car, index) => {
                                const canEdit = isAdmin || car.company._id === user._id;
                                return (
                                    <article key={car._id}>
                                        <div className='name'><h2>{car.name}</h2></div>
                                        <div className='car'>
                                            <img src={Helper.joinURL(Env.CDN_CARS, car.image)} alt={car.name} className='car-img' />
                                            <div className='car-company'>
                                                <span className='car-company-logo'>
                                                    <img src={Helper.joinURL(Env.CDN_USERS, car.company.avatar)} alt={car.company.fullName} />
                                                </span>
                                                <span className='car-company-info'>
                                                    {car.company.fullName}
                                                </span>
                                            </div>
                                        </div>
                                        <div className='info'>
                                            <ul className='info-list'>
                                                <li className='car-type'>
                                                    <Tooltip title={Helper.getCarTypeTooltip(car.type)} placement='top'>
                                                        <div className='info-list-item'>
                                                            <FuelIcon />
                                                            <span className='info-list-text'>{Helper.getCarTypeShort(car.type)}</span>
                                                        </div>
                                                    </Tooltip>
                                                </li>
                                                <li className='gearbox'>
                                                    <Tooltip title={Helper.getGearboxTooltip(car.gearbox)} placement='top'>
                                                        <div className='info-list-item'>
                                                            <GearboxIcon />
                                                            <span className='info-list-text'>{Helper.getGearboxTypeShort(car.gearbox)}</span>
                                                        </div>
                                                    </Tooltip>
                                                </li>
                                                <li className='seats'>
                                                    <Tooltip title={Helper.getSeatsTooltip(car.seats)} placement='top'>
                                                        <div className='info-list-item'>
                                                            <SeatsIcon />
                                                            <span className='info-list-text'>{car.seats}</span>
                                                        </div>
                                                    </Tooltip>
                                                </li>
                                                <li className='doors'>
                                                    <Tooltip title={Helper.getDoorsTooltip(car.doors)} placement='top'>
                                                        <div className='info-list-item'>
                                                            <img src={DoorsIcon} alt='' className='car-doors' />
                                                            <span className='info-list-text'>{car.doors}</span>
                                                        </div>
                                                    </Tooltip>
                                                </li>
                                                {car.aircon &&
                                                    <li className='aircon'>
                                                        <Tooltip title={strings.AIRCON_TOOLTIP} placement='top'>
                                                            <div className='info-list-item'>
                                                                <AirconIcon />
                                                            </div>
                                                        </Tooltip>
                                                    </li>
                                                }
                                                <li className='mileage'>
                                                    <Tooltip title={Helper.getMileageTooltip(car.mileage, fr)} placement='left'>
                                                        <div className='info-list-item'>
                                                            <MileageIcon />
                                                            <span className='info-list-text'>{`${strings.MILEAGE}${fr ? ' : ' : ': '}${Helper.getMileage(car.mileage)}`}</span>
                                                        </div>
                                                    </Tooltip>
                                                </li>
                                                <li className='fuel-policy'>
                                                    <Tooltip title={Helper.getFuelPolicyTooltip(car.fuelPolicy)} placement='left'>
                                                        <div className='info-list-item'>
                                                            <FuelIcon />
                                                            <span className='info-list-text'>{`${strings.FUEL_POLICY}${fr ? ' : ' : ': '}${Helper.getFuelPolicy(car.fuelPolicy)}`}</span>
                                                        </div>
                                                    </Tooltip>
                                                </li>
                                            </ul>
                                            <ul className='extras-list'>
                                                <li className={car.cancellation > -1 ? 'extra-available' : 'extra-unavailable'}>
                                                    <Tooltip title={car.cancellation > -1 ? strings.CANCELLATION_TOOLTIP : Helper.getCancellation(car.cancellation, fr)} placement='left'>
                                                        <div className='info-list-item'>
                                                            {car.collisionDamageWaiver > -1 ? <CheckIcon /> : <UncheckIcon />}
                                                            <span className='info-list-text'>{Helper.getCancellation(car.cancellation, fr)}</span>
                                                        </div>
                                                    </Tooltip>
                                                </li>
                                                <li className={car.amendments > -1 ? 'extra-available' : 'extra-unavailable'}>
                                                    <Tooltip title={car.amendments > -1 ? strings.AMENDMENTS_TOOLTIP : Helper.getAmendments(car.amendments, fr)} placement='left'>
                                                        <div className='info-list-item'>
                                                            {car.collisionDamageWaiver > -1 ? <CheckIcon /> : <UncheckIcon />}
                                                            <span className='info-list-text'>{Helper.getAmendments(car.amendments, fr)}</span>
                                                        </div>
                                                    </Tooltip>
                                                </li>
                                                <li className={car.theftProtection > -1 ? 'extra-available' : 'extra-unavailable'}>
                                                    <Tooltip title={car.theftProtection > -1 ? strings.THEFT_PROTECTION_TOOLTIP : Helper.getTheftProtection(car.theftProtection, fr)} placement='left'>
                                                        <div className='info-list-item'>
                                                            {car.collisionDamageWaiver > -1 ? <CheckIcon /> : <UncheckIcon />}
                                                            <span className='info-list-text'>{Helper.getTheftProtection(car.theftProtection, fr)}</span>
                                                        </div>
                                                    </Tooltip>
                                                </li>
                                                <li className={car.collisionDamageWaiver > -1 ? 'extra-available' : 'extra-unavailable'}>
                                                    <Tooltip title={car.collisionDamageWaiver > -1 ? strings.COLLISION_DAMAGE_WAVER_TOOLTIP : Helper.getCollisionDamageWaiver(car.collisionDamageWaiver, fr)} placement='left'>
                                                        <div className='info-list-item'>
                                                            {car.collisionDamageWaiver > -1 ? <CheckIcon /> : <UncheckIcon />}
                                                            <span className='info-list-text'>{Helper.getCollisionDamageWaiver(car.collisionDamageWaiver, fr)}</span>
                                                        </div>
                                                    </Tooltip>
                                                </li>
                                                <li className={car.fullInsurance > -1 ? 'extra-available' : 'extra-unavailable'}>
                                                    <Tooltip title={car.fullInsurance > -1 ? strings.FULL_INSURANCE_TOOLTIP : Helper.getFullInsurance(car.fullInsurance, fr)} placement='left'>
                                                        <div className='info-list-item'>
                                                            {car.fullInsurance > -1 ? <CheckIcon /> : <UncheckIcon />}
                                                            <span className='info-list-text'>{Helper.getFullInsurance(car.fullInsurance, fr)}</span>
                                                        </div>
                                                    </Tooltip>
                                                </li>
                                                <li className={car.addionaldriver > -1 ? 'extra-available' : 'extra-unavailable'}>
                                                    <Tooltip title={Helper.getAdditionalDriver(car.addionaldriver, fr)} placement='left'>
                                                        <div className='info-list-item'>
                                                            {car.addionaldriver > -1 ? <CheckIcon /> : <UncheckIcon />}
                                                            <span className='info-list-text'>{Helper.getAdditionalDriver(car.addionaldriver, fr)}</span>
                                                        </div>
                                                    </Tooltip>
                                                </li>
                                            </ul>
                                        </div>
                                        <div className='price'>{`${car.price} ${strings.CAR_CURRENCY}`}</div>
                                        {canEdit &&
                                            <div className='action'>
                                                <Button
                                                    type="submit"
                                                    variant="contained"
                                                    className='btn-primary btn-margin'
                                                    size="small"
                                                    href={`/update-car?c=${car._id}`}
                                                >
                                                    {strings.UPDATE}
                                                </Button>
                                                <Button
                                                    type="submit"
                                                    variant="contained"
                                                    color='error'
                                                    size="small"
                                                    data-id={car._id}
                                                    data-index={index}
                                                    onClick={this.handleDelete}
                                                >
                                                    {strings.DELETE}
                                                </Button>
                                            </div>}
                                    </article>
                                );
                            }
                            )}
                        </section>
                    </div>
                </div>
                <Dialog
                    disableEscapeKeyDown
                    maxWidth="xs"
                    open={openDeleteDialog}
                >
                    <DialogTitle>{strings.CONFIRM_TITLE}</DialogTitle>
                    <DialogContent>{strings.DELETE_CAR}</DialogContent>
                    <DialogActions>
                        <Button onClick={this.handleCancelDelete} variant='contained' className='btn-secondary'>{strings.CANCEL}</Button>
                        <Button onClick={this.handleConfirmDelete} variant='contained' color='error'>{strings.DELETE}</Button>
                    </DialogActions>
                </Dialog>
                {isLoading && <Backdrop text={strings.LOADING} />}
            </Master >
        );
    }
}