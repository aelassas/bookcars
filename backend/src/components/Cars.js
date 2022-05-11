import React, { Component } from 'react';
import Master from '../elements/Master';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/cars';
import Helper from '../common/Helper';
import CarService from '../services/CarService';
import CompanyService from '../services/CompanyService';
import Backdrop from '../elements/SimpleBackdrop';
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
    Clear as UncheckIcon,
    Visibility as ViewIcon,
    Edit as EditIcon,
    Delete as DeleteIcon
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
                    toast(commonStrings.GENERIC_ERROR, { type: 'error' });
                    this.setState({ isLoading: false, carId: '', carIndex: -1 });
                }
            }).catch(() => {
                toast(commonStrings.GENERIC_ERROR, { type: 'error' })
                this.setState({ isLoading: false, carId: '', carIndex: -1 });
            });
        } else {
            toast(commonStrings.GENERIC_ERROR, { type: 'error' });
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

    handleCompanyClick = (e) => {
        const checkbox = e.currentTarget.previousSibling;
        checkbox.checked = !checkbox.checked;
        const event = e;
        event.currentTarget = checkbox;
        this.handleCheckCompanyChange(event);
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
        CarService.getCars(keyword, payload, page, Env.CARS_PAGE_SIZE)
            .then(data => {
                const _cars = page === 1 ? data : [...cars, ...data];
                this.setState({ cars: _cars, isLoading: false, fetch: data.length > 0 });
            })
            .catch(() => toast(commonStrings.GENERIC_ERROR, { type: 'error' }));
    };

    flattenCompanies = (companies) => {
        const result = [];
        for (const { _id } of companies) {
            result.push(_id);
        }
        return result;
    };

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
                .catch(_ => toast(commonStrings.GENERIC_ERROR, { type: 'error' }));

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
        const isAdmin = user && user.type === Env.RECORD_TYPE.ADMIN;
        const fr = user && user.language === 'fr';

        return (
            <Master onLoad={this.onLoad} strict={true}>
                <div className='cars'>
                    <div className='col-1'>
                        <Input
                            type="text"
                            className='search'
                            placeholder={commonStrings.SEARCH_PLACEHOLDER}
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
                                                <label onClick={this.handleCompanyClick}>
                                                    <img src={Helper.joinURL(Env.CDN_USERS, company.avatar)}
                                                        alt={company.fullName}
                                                        style={{
                                                            width: Env.COMPANY_IMAGE_WIDTH,
                                                            // height: Env.COMPANY_IMAGE_HEIGHT
                                                        }} />
                                                </label>
                                            </li>
                                        ))
                                    }
                                </ul>
                                <div className='filter-actions'>
                                    <span onClick={this.handleUncheckAllChange} className='uncheckall'>
                                        {allCompaniesChecked ? commonStrings.UNCHECK_ALL : commonStrings.CHECK_ALL}
                                    </span>
                                </div>
                            </div>
                        }
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
                                            <img src={Helper.joinURL(Env.CDN_CARS, car.image)}
                                                alt={car.name} className='car-img'
                                                style={{
                                                    maxWidth: Env.CAR_IMAGE_WIDTH,
                                                    // maxHeight: Env.CAR_IMAGE_HEIGHT
                                                }} />
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
                                                <a href={`/company?c=${car.company.id}`} className='car-company-info'>
                                                    {car.company.fullName}
                                                </a>
                                            </div>
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
                                                    <Tooltip title={car.available ? strings.CAR_AVAILABLE_TOOLTIP : strings.CAR_UNAVAILABLE_TOOLTIP}>
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
                                                    <Tooltip title={Helper.getAdditionalDriver(car.addionaldriver, fr)} placement='left'>
                                                        <div className='car-info-list-item'>
                                                            {car.addionaldriver > -1 ? <CheckIcon /> : <UncheckIcon />}
                                                            <span className='car-info-list-text'>{Helper.getAdditionalDriver(car.addionaldriver, fr)}</span>
                                                        </div>
                                                    </Tooltip>
                                                </li>
                                            </ul>
                                        </div>
                                        <div className='price'>{`${car.price} ${strings.CAR_CURRENCY}`}</div>
                                        <div className='action'>
                                            <Tooltip title={strings.VIEW_CAR_TOOLTIP}>
                                                <IconButton href={`/car?c=${car._id}`}>
                                                    <ViewIcon />
                                                </IconButton>
                                            </Tooltip>

                                            {canEdit &&
                                                <Tooltip title={strings.UPDATE_CAR_TOOLTIP}>
                                                    <IconButton href={`/update-car?c=${car._id}`}>
                                                        <EditIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            }

                                            {canEdit &&
                                                <Tooltip title={strings.DELETE_CAR_TOOLTIP}>
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
                        </section>
                    </div>
                </div>
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
                {isLoading && <Backdrop text={commonStrings.LOADING} />}
            </Master >
        );
    }
}