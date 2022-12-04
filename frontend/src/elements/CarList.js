import React, { useState, useEffect } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/cars';
import * as Helper from '../common/Helper';
import * as CarService from '../services/CarService';
import * as UserService from '../services/UserService';
import Backdrop from './SimpleBackdrop';
import {
    Button,
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
    Info as InfoIcon
} from '@mui/icons-material';

import DoorsIcon from '../assets/img/car-door.png';

import '../assets/css/car-list.css';

const CarList = (props) => {
    const [language, setLanguage] = useState(Env.DEFAULT_LANGUAGE);
    const [loading, setLoading] = useState(true);
    const [fetch, setFetch] = useState(false);
    const [rows, setRows] = useState([]);
    const [page, setPage] = useState(1);
    const [offset, setOffset] = useState(0);
    const [days, setDays] = useState(0);

    useEffect(() => {
        setLanguage(UserService.getLanguage());
    }, []);

    useEffect(() => {
        setOffset(props.offset);
    }, [props.offset]);

    useEffect(() => {
        if (props.from && props.to) {
            setDays(Helper.days(props.from, props.to));
        }
    }, [props.from, props.to]);

    useEffect(() => {
        const element = document.querySelector(`.${props.containerClassName}`);

        if (element) {
            element.onscroll = (event) => {
                let _offset = 0;
                if (Env.isMobile()) _offset = offset;

                if (fetch
                    && !loading
                    && event.target.scrollTop > 0
                    && (event.target.offsetHeight + event.target.scrollTop + _offset) >= (event.target.scrollHeight - Env.CAR_PAGE_OFFSET)) {
                    setPage(page + 1);
                }
            };
        }
    }, [props.containerClassName, fetch, loading, page, offset]);

    const _fetch = (page, companies, pickupLocation, fuel, gearbox, mileage, deposit) => {
        setLoading(true);
        const payload = { companies, pickupLocation, fuel, gearbox, mileage, deposit };

        CarService.getCars(payload, page, Env.CARS_PAGE_SIZE)
            .then(data => {
                const _data = data.length > 0 ? data[0] : {};
                if (_data.length === 0) _data.resultData = [];
                const totalRecords = _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0;
                const _rows = page === 1 ? _data.resultData : [...rows, ..._data.resultData];
                setRows(_rows);
                setFetch(_data.resultData.length > 0);
                if (page === 1) {
                    const className = props.containerClassName ? props.containerClassName : 'car-list';
                    document.querySelector(`.${className}`).scrollTo(0, 0);
                }

                if (props.onLoad) {
                    props.onLoad({ rows: _data.resultData, rowCount: totalRecords });
                }
                setLoading(false);
            })
            .catch(() => {
                UserService.signout();
            });
    };

    useEffect(() => {
        if (props.companies) {
            if (props.companies.length > 0) {
                _fetch(page, props.companies, props.pickupLocation, props.fuel, props.gearbox, props.mileage, props.deposit);
            } else {
                setRows([]);
                setFetch(false);
                if (props.onLoad) {
                    props.onLoad({ rows: [], rowCount: 0 });
                }
                setLoading(false);
            }
        }
    }, [page, props.companies, props.pickupLocation, props.fuel, props.gearbox, props.mileage, props.deposit, props.from, props.to]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (props.cars) {
            setRows(props.cars);
            setFetch(false);
            if (props.onLoad) {
                props.onLoad({ rows: props.cars, rowCount: props.cars.length });
            }
            setLoading(false);
        }
    }, [props.cars]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        setPage(1);
    }, [props.companies, props.pickupLocation, props.fuel, props.gearbox, props.mileage, props.deposit, props.from, props.to]);

    useEffect(() => {
        if (props.reload) {
            setPage(1);
            _fetch(1, props.companies, props.pickupLocation, props.fuel, props.gearbox, props.mileage, props.deposit, props.availability);
        }
    }, [props.reload, props.companies, props.pickupLocation, props.fuel, props.gearbox, props.mileage, props.deposit]); // eslint-disable-line react-hooks/exhaustive-deps

    const getExtraIcon = (option, extra) => {
        let available = false;
        if (props.booking) {
            if (option === 'cancellation' && props.booking.cancellation && extra > 0) available = true;
            if (option === 'amendments' && props.booking.amendments && extra > 0) available = true;
            if (option === 'collisionDamageWaiver' && props.booking.collisionDamageWaiver && extra > 0) available = true;
            if (option === 'theftProtection' && props.booking.theftProtection && extra > 0) available = true;
            if (option === 'fullInsurance' && props.booking.fullInsurance && extra > 0) available = true;
            if (option === 'additionalDriver' && props.booking.additionalDriver && extra > 0) available = true;
        }

        return extra === -1 ? <UncheckIcon className='unavailable' />
            : extra === 0 || available ? <CheckIcon className='available' />
                : <InfoIcon className='extra-info' />
    };

    const fr = language === 'fr';

    return (
        <section className={`${props.className ? `${props.className} ` : ''}car-list`}>
            {rows.length === 0 ?
                !loading && !props.loading && <Card variant="outlined" className="empty-list">
                    <CardContent>
                        <Typography color="textSecondary">{strings.EMPTY_LIST}</Typography>
                    </CardContent>
                </Card>
                :
                ((props.from && props.to) || props.hidePrice) && (props.pickupLocation && props.dropOffLocation) &&
                rows.map((car, index) => (
                    <article key={car._id}>
                        <div className='name'><h2>{car.name}</h2></div>
                        <div className='car'>
                            <img src={Helper.joinURL(Env.CDN_CARS, car.image)}
                                alt={car.name} className='car-img'
                                style={{
                                    maxWidth: Env.CAR_IMAGE_WIDTH,
                                }} />
                            {!props.hideCompany &&
                                <div className='car-company'>
                                    <span className='car-company-logo'>
                                        <img src={Helper.joinURL(Env.CDN_USERS, car.company.avatar)}
                                            alt={car.company.fullName}
                                            style={{
                                                width: Env.COMPANY_IMAGE_WIDTH,
                                            }}
                                        />
                                    </span>
                                    <label className='car-company-info'>{car.company.fullName}</label>
                                </div>
                            }
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
                                <li>
                                    <Tooltip title={props.booking ? '' : car.cancellation > -1 ? strings.CANCELLATION_TOOLTIP : Helper.getCancellation(car.cancellation, fr)} placement='left'>
                                        <div className='car-info-list-item'>
                                            {getExtraIcon('cancellation', car.cancellation)}
                                            <span className='car-info-list-text'>{Helper.getCancellation(car.cancellation, fr)}</span>
                                        </div>
                                    </Tooltip>
                                </li>
                                <li>
                                    <Tooltip title={props.booking ? '' : car.amendments > -1 ? strings.AMENDMENTS_TOOLTIP : Helper.getAmendments(car.amendments, fr)} placement='left'>
                                        <div className='car-info-list-item'>
                                            {getExtraIcon('amendments', car.amendments)}
                                            <span className='car-info-list-text'>{Helper.getAmendments(car.amendments, fr)}</span>
                                        </div>
                                    </Tooltip>
                                </li>
                                <li>
                                    <Tooltip title={props.booking ? '' : car.collisionDamageWaiver > -1 ? strings.COLLISION_DAMAGE_WAVER_TOOLTIP : Helper.getCollisionDamageWaiver(car.collisionDamageWaiver, fr)} placement='left'>
                                        <div className='car-info-list-item'>
                                            {getExtraIcon('collisionDamageWaiver', car.collisionDamageWaiver)}
                                            <span className='car-info-list-text'>{Helper.getCollisionDamageWaiver(car.collisionDamageWaiver, fr)}</span>
                                        </div>
                                    </Tooltip>
                                </li>
                                <li>
                                    <Tooltip title={props.booking ? '' : car.theftProtection > -1 ? strings.THEFT_PROTECTION_TOOLTIP : Helper.getTheftProtection(car.theftProtection, fr)} placement='left'>
                                        <div className='car-info-list-item'>
                                            {getExtraIcon('theftProtection', car.theftProtection)}
                                            <span className='car-info-list-text'>{Helper.getTheftProtection(car.theftProtection, fr)}</span>
                                        </div>
                                    </Tooltip>
                                </li>
                                <li>
                                    <Tooltip title={props.booking ? '' : car.fullInsurance > -1 ? strings.FULL_INSURANCE_TOOLTIP : Helper.getFullInsurance(car.fullInsurance, fr)} placement='left'>
                                        <div className='car-info-list-item'>
                                            {getExtraIcon('fullInsurance', car.fullInsurance)}
                                            <span className='car-info-list-text'>{Helper.getFullInsurance(car.fullInsurance, fr)}</span>
                                        </div>
                                    </Tooltip>
                                </li>
                                <li>
                                    <Tooltip title={props.booking ? '' : Helper.getAdditionalDriver(car.additionalDriver, fr)} placement='left'>
                                        <div className='car-info-list-item'>
                                            {getExtraIcon('additionalDriver', car.additionalDriver)}
                                            <span className='car-info-list-text'>{Helper.getAdditionalDriver(car.additionalDriver, fr)}</span>
                                        </div>
                                    </Tooltip>
                                </li>
                            </ul>
                        </div>
                        {!props.hidePrice &&
                            <div className='price'>
                                <label className='price-days'>
                                    {Helper.getDays(days)}
                                </label>
                                <label className='price-main'>
                                    {`${Helper.price(car, props.from, props.to)} ${commonStrings.CURRENCY}`}
                                </label>
                                <label className='price-day'>
                                    {`${strings.PRICE_PER_DAY} ${car.price} ${commonStrings.CURRENCY}`}
                                </label>
                            </div>
                        }
                        {!props.hidePrice &&
                            <div className='action'>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    className='btn-book btn-margin-bottom'
                                    href={`/create-booking?c=${car._id}&p=${props.pickupLocation}&d=${props.dropOffLocation}&f=${props.from.getTime()}&t=${props.to.getTime()}`}
                                >
                                    {strings.BOOK}
                                </Button>
                            </div>}
                    </article>
                ))
            }
            {loading && <Backdrop text={commonStrings.LOADING} />}
        </section>
    );
}

export default CarList;