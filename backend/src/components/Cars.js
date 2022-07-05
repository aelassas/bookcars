import React, { Component } from 'react';
import Env from '../config/env.config';
import Helper from '../common/Helper';
import { strings } from '../lang/cars';
import { strings as commonStrings } from '../lang/common';
import Master from '../elements/Master';
import CompanyFilter from '../elements/CompanyFilter';
import Search from '../elements/Search';
import InfoBox from '../elements/InfoBox';
import FuelFilter from '../elements/FuelFilter';
import GearboxFilter from '../elements/GearboxFilter';
import MileageFilter from '../elements/MileageFilter';
import DepositFilter from '../elements/DepositFilter';
import AvailabilityFilter from '../elements/AvailabilityFilter';
import CarList from '../elements/CarList';
import CompanyService from '../services/CompanyService';
import { Button } from '@mui/material';

import '../assets/css/cars.css';

export default class Cars extends Component {

    constructor(props) {
        super(props);
        this.state = {
            user: null,
            allCompanies: [],
            companies: [],
            keyword: '',
            reload: false,
            rowCount: -1,
            loading: true,
            gearbox: [Env.GEARBOX_TYPE.AUTOMATIC, Env.GEARBOX_TYPE.MANUAL],
            fuel: [Env.CAR_TYPE.DIESEL, Env.CAR_TYPE.GASOLINE],
            mileage: [Env.MILEAGE.LIMITED, Env.MILEAGE.UNLIMITED],
            availability: [Env.AVAILABILITY.AVAILABLE, Env.AVAILABILITY.UNAVAILABLE],
            deposit: -1,
            offset: 0
        };
    }

    handleSearch = (newKeyword) => {
        const { keyword } = this.state;

        this.setState({ keyword: newKeyword, reload: newKeyword === keyword });
    };

    handleCompanyFilterChange = (newCompanies) => {
        const { companies } = this.state;

        this.setState({ companies: newCompanies, reload: Helper.arrayEqual(newCompanies, companies) });
    };

    handleCarListLoad = (data) => {
        this.setState({ reload: false, rowCount: data.rowCount });
    };

    handleCarDelete = (rowCount) => {
        this.setState({ rowCount });
    };

    handleFuelFilterChange = (values) => {
        const { fuel } = this.state;

        this.setState({ fuel: values, reload: Helper.arrayEqual(values, fuel) });
    };

    handleGearboxFilterChange = (values) => {
        const { gearbox } = this.state;

        this.setState({ gearbox: values, reload: Helper.arrayEqual(values, gearbox) });
    };

    handleMileageFilterChange = (values) => {
        const { mileage } = this.state;

        this.setState({ mileage: values, reload: Helper.arrayEqual(values, mileage) });
    };

    handleDepositFilterChange = (value) => {
        const { deposit } = this.state;

        this.setState({ deposit: value, reload: value === deposit });
    };

    handleAvailabilityFilterChange = (values) => {
        const { availability } = this.state;

        this.setState({ availability: values, reload: Helper.arrayEqual(values, availability) });
    };


    onLoad = (user) => {
        this.setState({ user }, async () => {
            const allCompanies = await CompanyService.getAllCompanies();
            const companies = Helper.flattenCompanies(allCompanies);
            this.setState({ allCompanies, companies, loading: false }, () => {
                this.setState({ offset: document.querySelector('div.col-1').clientHeight });
            });
        });
    };

    render() {
        const { allCompanies, user, keyword, companies, reload, rowCount, loading, fuel, gearbox, mileage, deposit, availability, offset } = this.state;
        const admin = Helper.admin(user);

        return (
            <Master onLoad={this.onLoad} strict={true}>
                {user &&
                    <div className='cars'>
                        <div className='col-1'>
                            <div className='col-1-container'>
                                <Search onSubmit={this.handleSearch} className='search' />

                                <Button
                                    type="submit"
                                    variant="contained"
                                    className='btn-primary new-car'
                                    size="small"
                                    href='/create-car'
                                >
                                    {strings.NEW_CAR}
                                </Button>

                                {rowCount > 0 &&
                                    <InfoBox value={`${rowCount} ${commonStrings.CAR}${rowCount > 1 ? 's' : ''}`} className='car-count' />
                                }

                                <CompanyFilter
                                    companies={allCompanies}
                                    onChange={this.handleCompanyFilterChange}
                                    className='filter'
                                />

                                {rowCount > -1 &&
                                    <>
                                        <FuelFilter className='car-filter' onChange={this.handleFuelFilterChange} />
                                        <GearboxFilter className='car-filter' onChange={this.handleGearboxFilterChange} />
                                        <MileageFilter className='car-filter' onChange={this.handleMileageFilterChange} />
                                        <DepositFilter className='car-filter' onChange={this.handleDepositFilterChange} />
                                        {
                                            admin &&
                                            <AvailabilityFilter className='car-filter' onChange={this.handleAvailabilityFilterChange} />
                                        }
                                    </>
                                }
                            </div>
                        </div>
                        <div className='col-2'>
                            <CarList
                                containerClassName='cars'
                                offset={offset}
                                user={user}
                                companies={companies}
                                fuel={fuel}
                                gearbox={gearbox}
                                mileage={mileage}
                                deposit={deposit}
                                availability={availability}
                                keyword={keyword}
                                reload={reload}
                                loading={loading}
                                onLoad={this.handleCarListLoad}
                                onDelete={this.handleCarDelete}
                            />
                        </div>
                    </div>
                }
            </Master>
        );
    }
}