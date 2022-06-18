import React, { Component } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/cars';
import Helper from '../common/Helper';
import CarService from '../services/CarService';
import UserService from '../services/UserService';
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
import { toast } from 'react-toastify';
import Image from 'next/image';

import styles from '../styles/car-list.module.css';
import carsStyles from '../styles/cars.module.css';

class CarList extends Component {

    constructor(props) {
        super(props);
        this.state = {
            language: Env.DEFAULT_LANGUAGE,
            companies: props.companies,
            loading: true,
            fetch: false,
            reload: false,
            rows: [],
            rowCount: 0,
            page: 1,
            size: Env.CARS_PAGE_SIZE,
            carId: '',
            carIndex: -1,
            from: null,
            to: null,
            days: 0,
            pickupLocation: props.pickupLocation,
            dropOffLocation: props.dropOffLocation,
            fuel: props.fuel,
            gearbox: props.gearbox,
            mileage: props.mileage,
            deposit: props.deposit,
            cars: []
        };
    }

    fetch = () => {
        const { page, size, companies, pickupLocation, rows, fuel, gearbox, mileage, deposit } = this.state;

        this.setState({ loading: true });
        console.log('loading.start', this.state.loading);

        const payload = { companies, pickupLocation, fuel, gearbox, mileage, deposit };

        CarService.getCars(payload, page, size)
            .then(data => {
                const _data = data.length > 0 ? data[0] : {};
                if (_data.length === 0) _data.resultData = [];
                const totalRecords = _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0;
                const _rows = page === 1 ? _data.resultData : [...rows, ..._data.resultData];
                this.setState({ rows: _rows, rowCount: totalRecords, loading: false, fetch: _data.resultData.length > 0 }, () => {
                    if (page === 1) {
                        document.querySelector(`.${carsStyles.cars}`).scrollTo(0, 0);
                    }
                    if (this.props.onLoad) {
                        this.props.onLoad({ rows: _data.resultData, rowCount: totalRecords });
                    }
                    console.log('loading.end', this.state.loading);
                });
            })
            .catch(() => {
                toast(commonStrings.GENERIC_ERROR, { type: 'error' });
            });
    };

    static getDerivedStateFromProps(nextProps, prevState) {
        const { companies, pickupLocation, dropOffLocation, from, to, reload, fuel, gearbox, mileage, deposit, cars } = prevState;

        if (nextProps.companies && !Helper.arrayEqual(companies, nextProps.companies)) {
            return { companies: Helper.clone(nextProps.companies) };
        }

        if (nextProps.fuel && !Helper.arrayEqual(fuel, nextProps.fuel)) {
            return { fuel: Helper.clone(nextProps.fuel) };
        }

        if (nextProps.gearbox && !Helper.arrayEqual(gearbox, nextProps.gearbox)) {
            return { gearbox: Helper.clone(nextProps.gearbox) };
        }

        if (nextProps.mileage && !Helper.arrayEqual(mileage, nextProps.mileage)) {
            return { mileage: nextProps.mileage };
        }

        if (deposit !== nextProps.deposit) {
            return { deposit: nextProps.deposit };
        }

        if (pickupLocation !== nextProps.pickupLocation) {
            return { pickupLocation: nextProps.pickupLocation };
        }

        if (dropOffLocation !== nextProps.dropOffLocation) {
            return { dropOffLocation: nextProps.dropOffLocation };
        }

        if (from !== nextProps.from) {
            return { from: nextProps.from };
        }

        if (to !== nextProps.to) {
            return { to: nextProps.to };
        }

        if (nextProps.cars && !Helper.carsEqual(cars, nextProps.cars)) {
            return { cars: Helper.clone(nextProps.cars) };
        }

        if (reload !== nextProps.reload) {
            return { reload: nextProps.reload };
        }

        return null;
    }

    componentDidUpdate(prevProps, prevState) {
        const { companies, pickupLocation, from, to, reload, fuel, gearbox, mileage, deposit, cars } = this.state;

        if (!Helper.arrayEqual(companies, prevState.companies)) {
            return this.setState({ page: 1 }, () => this.fetch());
        }

        if (!Helper.arrayEqual(fuel, prevState.fuel)) {
            return this.setState({ page: 1 }, () => this.fetch());
        }

        if (!Helper.arrayEqual(gearbox, prevState.gearbox)) {
            return this.setState({ page: 1 }, () => this.fetch());
        }

        if (!Helper.arrayEqual(mileage, prevState.mileage)) {
            return this.setState({ page: 1 }, () => this.fetch());
        }

        if (deposit !== prevState.deposit) {
            return this.setState({ page: 1 }, () => this.fetch());
        }

        if (pickupLocation && pickupLocation !== prevState.pickupLocation) {
            return this.setState({ page: 1 }, () => this.fetch());
        }

        if (from !== prevState.from || to !== prevState.to) {
            return this.setState({ days: Helper.days(from, to) });
        }

        if (!Helper.carsEqual(cars, prevState.cars)) {
            this.setState({ rows: cars, rowCount: cars.length, loading: false, fetch: false }, () => {
                if (this.props.onLoad) {
                    this.props.onLoad({ rows: cars, rowCount: cars.length });
                }
            });
        }

        if (reload && !prevState.reload) {
            return this.setState({ page: 1 }, () => this.fetch());
        }
    }

    getExtraIcon = (option, extra) => {
        let available = false;
        if (this.props.booking) {
            if (option === 'cancellation' && this.props.booking.cancellation && extra > 0) available = true;
            if (option === 'amendments' && this.props.booking.amendments && extra > 0) available = true;
            if (option === 'collisionDamageWaiver' && this.props.booking.collisionDamageWaiver && extra > 0) available = true;
            if (option === 'theftProtection' && this.props.booking.theftProtection && extra > 0) available = true;
            if (option === 'fullInsurance' && this.props.booking.fullInsurance && extra > 0) available = true;
            if (option === 'additionalDriver' && this.props.booking.additionalDriver && extra > 0) available = true;
        }

        return extra === -1 ? <UncheckIcon className={styles.unavailable} />
            : extra === 0 || available ? <CheckIcon className={styles.available} />
                : <InfoIcon className={styles.extraInfo} />
    };

    componentDidMount() {
        Helper.setLanguage(commonStrings);
        Helper.setLanguage(strings);

        const element = document.querySelector(`.${carsStyles.cars}`);
        if (element) {
            element.onscroll = (event) => {
                const { fetch, loading, page } = this.state;
                let offset = 0;
                if (Env.isMobile()) offset = document.querySelector(`.${carsStyles.col1}`).clientHeight;
                if (fetch
                    && !loading
                    && event.target.scrollTop > 0
                    && (event.target.offsetHeight + event.target.scrollTop + offset) >= (event.target.scrollHeight - Env.CAR_PAGE_OFFSET)) {
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

        this.setState({ language: UserService.getLanguage() })
    }

    render() {
        const { rows, loading, language, from, to, days, pickupLocation, dropOffLocation } = this.state;
        const fr = language === 'fr';

        return (
            <>
                <section className={styles.carList}>
                    {rows.length === 0 ?
                        !loading && !this.props.loading &&
                        <Card variant="outlined" className={styles.emptyList}>
                            <CardContent>
                                <Typography color="textSecondary">{strings.EMPTY_LIST}</Typography>
                            </CardContent>
                        </Card>
                        :
                        ((from && to) || this.props.hidePrice) && rows.map((car, index) => (
                            <article key={car._id}>
                                <div className={styles.name}><h2>{car.name}</h2></div>
                                <div className={styles.car}>
                                    <div style={{
                                        position: 'relative',
                                        width: '100%',
                                        maxWidth: Env.CAR_IMAGE_WIDTH,
                                        height: Env.CAR_IMAGE_HEIGHT,
                                    }}>
                                        <Image
                                            src={Helper.joinURL(Env.CDN_CARS, car.image)}
                                            alt={car.name} className={styles.carImg}
                                            layout='fill'
                                            objectFit='contain'
                                        />
                                    </div>
                                    {!this.props.hideCompany &&
                                        <div className={styles.carCompany}>
                                            <div style={{
                                                position: 'relative',
                                                width: Env.COMPANY_IMAGE_WIDTH,
                                                height: Env.COMPANY_IMAGE_HEIGHT
                                            }}>
                                                <Image
                                                    src={Helper.joinURL(Env.CDN_USERS, car.company.avatar)}
                                                    alt={car.company.fullName}
                                                    layout='fill'
                                                    objectFit='contain'
                                                />
                                            </div>
                                            <label className={styles.carCompanyInfo}>{car.company.fullName}</label>
                                        </div>
                                    }
                                </div>
                                <div className={styles.carInfo}>
                                    <ul className={styles.carInfoList}>
                                        <li className={styles.carType}>
                                            <Tooltip title={Helper.getCarTypeTooltip(car.type)} placement='top'>
                                                <div className={styles.carInfoListItem}>
                                                    <FuelIcon />
                                                    <span className={styles.carInfoListText}>{Helper.getCarTypeShort(car.type)}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                        <li className={styles.gearbox}>
                                            <Tooltip title={Helper.getGearboxTooltip(car.gearbox)} placement='top'>
                                                <div className={styles.carInfoListItem}>
                                                    <GearboxIcon />
                                                    <span className={styles.carInfoListText}>{Helper.getGearboxTypeShort(car.gearbox)}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                        <li className={styles.seats}>
                                            <Tooltip title={Helper.getSeatsTooltip(car.seats)} placement='top'>
                                                <div className={styles.carInfoListItem}>
                                                    <SeatsIcon className={styles.icon} />
                                                    <span className={styles.carInfoListText}>{car.seats}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                        <li className={styles.doors}>
                                            <Tooltip title={Helper.getDoorsTooltip(car.doors)} placement='top'>
                                                <div className={styles.carInfoListItem}>
                                                    <div className={styles.carDoors}>
                                                        <Image
                                                            src='/img/car-door.png'
                                                            alt=''
                                                            layout='fill'
                                                            objectFit='contain'
                                                            className={styles.carDoors}
                                                        />
                                                    </div>
                                                    <span className={styles.carInfoListText}>{car.doors}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                        {car.aircon &&
                                            <li className={styles.aircon}>
                                                <Tooltip title={strings.AIRCON_TOOLTIP} placement='top'>
                                                    <div className={styles.carInfoListItem}>
                                                        <AirconIcon />
                                                    </div>
                                                </Tooltip>
                                            </li>
                                        }
                                        <li className={styles.mileage}>
                                            <Tooltip title={Helper.getMileageTooltip(car.mileage, fr)} placement='left'>
                                                <div className={styles.carInfoListItem}>
                                                    <MileageIcon />
                                                    <span className={styles.carInfoListText}>{`${strings.MILEAGE}${fr ? ' : ' : ': '}${Helper.getMileage(car.mileage)}`}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                        <li className={styles.fuelPolicy}>
                                            <Tooltip title={Helper.getFuelPolicyTooltip(car.fuelPolicy)} placement='left'>
                                                <div className={styles.carInfoListItem}>
                                                    <FuelIcon />
                                                    <span className={styles.carInfoListText}>{`${strings.FUEL_POLICY}${fr ? ' : ' : ': '}${Helper.getFuelPolicy(car.fuelPolicy)}`}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                    </ul>

                                    <ul className={styles.extrasList}>
                                        <li>
                                            <Tooltip title={this.props.booking ? '' : car.cancellation > -1 ? strings.CANCELLATION_TOOLTIP : Helper.getCancellation(car.cancellation, fr)} placement='left'>
                                                <div className={styles.carInfoListItem}>
                                                    {this.getExtraIcon('cancellation', car.cancellation)}
                                                    <span className={styles.carInfoListText}>{Helper.getCancellation(car.cancellation, fr)}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                        <li>
                                            <Tooltip title={this.props.booking ? '' : car.amendments > -1 ? strings.AMENDMENTS_TOOLTIP : Helper.getAmendments(car.amendments, fr)} placement='left'>
                                                <div className={styles.carInfoListItem}>
                                                    {this.getExtraIcon('amendments', car.amendments)}
                                                    <span className={styles.carInfoListText}>{Helper.getAmendments(car.amendments, fr)}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                        <li>
                                            <Tooltip title={this.props.booking ? '' : car.collisionDamageWaiver > -1 ? strings.COLLISION_DAMAGE_WAVER_TOOLTIP : Helper.getCollisionDamageWaiver(car.collisionDamageWaiver, fr)} placement='left'>
                                                <div className={styles.carInfoListItem}>
                                                    {this.getExtraIcon('collisionDamageWaiver', car.collisionDamageWaiver)}
                                                    <span className={styles.carInfoListText}>{Helper.getCollisionDamageWaiver(car.collisionDamageWaiver, fr)}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                        <li>
                                            <Tooltip title={this.props.booking ? '' : car.theftProtection > -1 ? strings.THEFT_PROTECTION_TOOLTIP : Helper.getTheftProtection(car.theftProtection, fr)} placement='left'>
                                                <div className={styles.carInfoListItem}>
                                                    {this.getExtraIcon('theftProtection', car.theftProtection)}
                                                    <span className={styles.carInfoListText}>{Helper.getTheftProtection(car.theftProtection, fr)}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                        <li>
                                            <Tooltip title={this.props.booking ? '' : car.fullInsurance > -1 ? strings.FULL_INSURANCE_TOOLTIP : Helper.getFullInsurance(car.fullInsurance, fr)} placement='left'>
                                                <div className={styles.carInfoListItem}>
                                                    {this.getExtraIcon('fullInsurance', car.fullInsurance)}
                                                    <span className={styles.carInfoListText}>{Helper.getFullInsurance(car.fullInsurance, fr)}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                        <li>
                                            <Tooltip title={this.props.booking ? '' : Helper.getAdditionalDriver(car.additionalDriver, fr)} placement='left'>
                                                <div className={styles.carInfoListItem}>
                                                    {this.getExtraIcon('additionalDriver', car.additionalDriver)}
                                                    <span className={styles.carInfoListText}>{Helper.getAdditionalDriver(car.additionalDriver, fr)}</span>
                                                </div>
                                            </Tooltip>
                                        </li>
                                    </ul>
                                </div>
                                {!this.props.hidePrice &&
                                    <div className={styles.price}>
                                        <label className={styles.priceDays}>
                                            {Helper.getDays(days)}
                                        </label>
                                        <label className={styles.priceMain}>
                                            {`${Helper.price(car, from, to)} ${commonStrings.CURRENCY}`}
                                        </label>
                                        <label className={styles.priceDay}>
                                            {`${strings.PRICE_PER_DAY} ${car.price} ${commonStrings.CURRENCY}`}
                                        </label>
                                    </div>
                                }
                                {!this.props.hidePrice &&
                                    <div className={styles.action}>
                                        <Button
                                            type="submit"
                                            variant="contained"
                                            className={`${styles.btnBook} btn-margin-bottom`}
                                            href={`/create-booking?c=${car._id}&p=${pickupLocation}&d=${dropOffLocation}&f=${from.getTime()}&t=${to.getTime()}`}
                                        >
                                            {strings.BOOK}
                                        </Button>
                                    </div>}
                            </article>
                        ))
                    }
                </section>
                {loading && <Backdrop text={commonStrings.LOADING} />}
            </>
        );
    }
}

export default CarList;