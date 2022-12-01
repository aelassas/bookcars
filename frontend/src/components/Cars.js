import React, { useEffect, useState } from 'react';
import Env from '../config/env.config';
import * as Helper from '../common/Helper';
import * as LocationService from '../services/LocationService';
import * as CompanyService from '../services/CompanyService';
import Master from '../elements/Master';
import NoMatch from './NoMatch';
import CarFilter from '../elements/CarFilter';
import CompanyFilter from '../elements/CompanyFilter';
import FuelFilter from '../elements/FuelFilter';
import GearboxFilter from '../elements/GearboxFilter';
import MileageFilter from '../elements/MileageFilter';
import DepositFilter from '../elements/DepositFilter';
import CarList from '../elements/CarList';

import '../assets/css/cars.css';

const Cars = () => {
    const [visible, setVisible] = useState(false);
    const [noMatch, setNoMatch] = useState(false);
    const [pickupLocation, setPickupLocation] = useState();
    const [dropOffLocation, setDropOffLocation] = useState();
    const [from, setFrom] = useState();
    const [to, setTo] = useState();
    const [allCompanies, setAllCompanies] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [reload, setReload] = useState(false);
    const [loading, setLoading] = useState(true);
    const [fuel, setFuel] = useState([Env.CAR_TYPE.DIESEL, Env.CAR_TYPE.GASOLINE]);
    const [gearbox, setGearbox] = useState([Env.GEARBOX_TYPE.AUTOMATIC, Env.GEARBOX_TYPE.MANUAL]);
    const [mileage, setMileage] = useState([Env.MILEAGE.LIMITED, Env.MILEAGE.UNLIMITED]);
    const [deposit, setDeposit] = useState(-1);
    const [offset, setOffset] = useState(0);

    useEffect(() => {
        if (visible) {
            setOffset(document.querySelector('div.col-1').clientHeight);
        }
    }, [visible]);

    const handleCarListLoad = (data) => {
        setReload(false);
    };

    const handleCompanyFilterChange = (newCompanies) => {
        setCompanies(newCompanies);
        setReload(Helper.arrayEqual(newCompanies, companies));
    };

    const handleCarFilterSubmit = (data) => {
        setPickupLocation(data.pickupLocation);
        setDropOffLocation(data.dropOffLocation);
        setFrom(data.from);
        setTo(data.to);
        setReload(pickupLocation._id === data.pickupLocation._id);
    };

    const handleFuelFilterChange = (values) => {
        setFuel(values);
        setReload(Helper.arrayEqual(values, fuel));
    };

    const handleGearboxFilterChange = (values) => {
        setGearbox(values);
        setReload(Helper.arrayEqual(values, gearbox));
    };

    const handleMileageFilterChange = (values) => {
        setMileage(values);
        setReload(Helper.arrayEqual(values, mileage));
    };

    const handleDepositFilterChange = (value) => {
        setDeposit(value);
        setReload(value === deposit);
    };

    const onLoad = async (user) => {
        let pickupLocationId, dropOffLocationId, pickupLocation, dropOffLocation, from, to;
        const params = new URLSearchParams(window.location.search);
        if (params.has('p')) pickupLocationId = params.get('p');
        if (params.has('d')) dropOffLocationId = params.get('d');
        if (params.has('f')) {
            const val = params.get('f');
            from = Helper.isNumber(val) && new Date(parseInt(val));
        }
        if (params.has('t')) {
            const val = params.get('t');
            to = Helper.isNumber(val) && new Date(parseInt(val));
        }

        if (!pickupLocationId || !dropOffLocationId || !from || !to) {
            setLoading(false);
            setNoMatch(true);
            return;
        }

        try {
            pickupLocation = await LocationService.getLocation(pickupLocationId);

            if (!pickupLocation) {
                setLoading(false);
                setNoMatch(true);
                return;
            }

            if (dropOffLocationId !== pickupLocationId) {
                dropOffLocation = await LocationService.getLocation(dropOffLocationId);
            } else {
                dropOffLocation = pickupLocation;
            }

            if (!dropOffLocation) {
                setLoading(false);
                setNoMatch(true);
                return;
            }

            const allCompanies = await CompanyService.getAllCompanies();
            const companies = Helper.flattenCompanies(allCompanies);

            setPickupLocation(pickupLocation);
            setDropOffLocation(dropOffLocation);
            setFrom(from);
            setTo(to);
            setAllCompanies(allCompanies);
            setCompanies(companies);
            setLoading(false);
            if (!user || (user && user.verified)) setVisible(true);
        } catch (err) {
            Helper.error(err);
        }
    };

    return (
        <Master onLoad={onLoad} strict={false}>
            {visible && companies && pickupLocation && dropOffLocation && from && to &&
                <div className='cars'>
                    <div className='col-1'>
                        {!loading &&
                            <>
                                <CarFilter
                                    className='filter'
                                    pickupLocation={pickupLocation}
                                    dropOffLocation={dropOffLocation}
                                    from={from}
                                    to={to}
                                    onSubmit={handleCarFilterSubmit}
                                />
                                <CompanyFilter
                                    className='filter'
                                    companies={allCompanies}
                                    onChange={handleCompanyFilterChange}
                                    collapse={!Env.isMobile()}
                                />
                                <FuelFilter className='filter' onChange={handleFuelFilterChange} />
                                <GearboxFilter className='filter' onChange={handleGearboxFilterChange} />
                                <MileageFilter className='filter' onChange={handleMileageFilterChange} />
                                <DepositFilter className='filter' onChange={handleDepositFilterChange} />
                            </>
                        }
                    </div>
                    <div className='col-2'>
                        <CarList
                            containerClassName='cars'
                            offset={offset}
                            companies={companies}
                            fuel={fuel}
                            gearbox={gearbox}
                            mileage={mileage}
                            deposit={deposit}
                            pickupLocation={pickupLocation._id}
                            dropOffLocation={dropOffLocation._id}
                            reload={reload}
                            loading={loading}
                            from={from}
                            to={to}
                            onLoad={handleCarListLoad}
                        />
                    </div>
                </div>
            }
            {noMatch && <NoMatch hideHeader />}
        </Master >
    );
};

export default Cars;