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
import CarList from '../elements/CarList';
import { Button } from '@mui/material';

import '../assets/css/cars.css';

export default class Cars extends Component {

    constructor(props) {
        super(props);
        this.state = {
            user: null,
            companies: [],
            keyword: '',
            reload: false,
            rowCount: -1,
            loading: true,
            gearbox: [Env.GEARBOX_TYPE.AUTOMATIC, Env.GEARBOX_TYPE.MANUAL],
            fuel: [Env.CAR_TYPE.DIESEL, Env.CAR_TYPE.GASOLINE],
            mileage: false,
            deposit: -1
        };
    }

    handleSearch = (newKeyword) => {
        const { keyword } = this.state;

        this.setState({ keyword: newKeyword, reload: newKeyword === keyword });
    };

    handleCompanyFilterLoad = (companies) => {
        this.setState({ companies, loading: false });
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

    onLoad = (user) => {
        this.setState({ user });
    };

    render() {
        const { user, keyword, companies, reload, rowCount, loading, fuel, gearbox, mileage, deposit } = this.state;

        return (
            <Master onLoad={this.onLoad} strict={true}>
                {user &&
                    <div className='cars'>
                        <div className='col-1'>
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
                                onLoad={this.handleCompanyFilterLoad}
                                onChange={this.handleCompanyFilterChange}
                                className='filter'
                            />

                            {rowCount > -1 &&
                                <>

                                    <FuelFilter className='car-filter' onChange={this.handleFuelFilterChange} />
                                    <GearboxFilter className='car-filter' onChange={this.handleGearboxFilterChange} />
                                    <MileageFilter className='car-filter' onChange={this.handleMileageFilterChange} />
                                    <DepositFilter className='car-filter' onChange={this.handleDepositFilterChange} />
                                </>
                            }
                        </div>
                        <div className='col-2'>
                            <CarList
                                user={user}
                                companies={companies}
                                fuel={fuel}
                                gearbox={gearbox}
                                mileage={mileage}
                                deposit={deposit}
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