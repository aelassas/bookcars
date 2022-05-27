import React, { Component } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import Helper from '../common/Helper';
import Master from '../elements/Master';
import NoMatch from './NoMatch';
import CarFilter from '../elements/CarFilter';
import CompanyFilter from '../elements/CompanyFilter';
import FuelFilter from '../elements/FuelFilter';
import GearboxFilter from '../elements/GearboxFilter';
import MileageFilter from '../elements/MileageFilter';
import CarList from '../elements/CarList';
import { toast } from 'react-toastify';

import '../assets/css/cars.css';
import LocationService from '../services/LocationService';

export default class Cars extends Component {

    constructor(props) {
        super(props);
        this.state = {
            user: null,
            visible: false,
            noMatch: false,
            pickupLocation: null,
            dropOffLocation: null,
            from: null,
            to: null,
            companies: [],
            reload: false,
            loading: true,
            gearbox: [Env.GEARBOX_TYPE.AUTOMATIC, Env.GEARBOX_TYPE.MANUAL],
            fuel: [Env.CAR_TYPE.DIESEL, Env.CAR_TYPE.GASOLINE],
            mileageUnlimited: false
        };
    }

    handleCompanyFilterLoad = (companies) => {
        this.setState({ companies, loading: false });
    };

    handleCarListLoad = (data) => {
        this.setState({ reload: false });
    };

    handleCompanyFilterChange = (newCompanies) => {
        const { companies } = this.state;

        this.setState({ companies: newCompanies, reload: Helper.arrayEqual(newCompanies, companies) });
    };

    handleCarFilterSubmit = (data) => {
        const { pickupLocation } = this.state;

        this.setState({
            pickupLocation: data.pickupLocation,
            dropOffLocation: data.dropOffLocation,
            from: data.from,
            to: data.to,
            reload: pickupLocation._id === data.pickupLocation._id
        });
    };

    handleFuelFilterChange = (values) => {
        const { fuel } = this.state;

        this.setState({ fuel: values, reload: Helper.arrayEqual(values, fuel) });
    };

    handleGearboxFilterChange = (values) => {
        const { gearbox } = this.state;

        this.setState({ gearbox: values, reload: Helper.arrayEqual(values, gearbox) });
    };

    handleMileageFilterChange = (value) => {
        this.setState({ mileageUnlimited: value });
    }

    onLoad = (user) => {
        this.setState({ user }, async () => {

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
                return this.setState({ loading: false, noMatch: true });
            }

            try {
                pickupLocation = await LocationService.getLocation(pickupLocationId);

                if (!pickupLocation) {
                    return this.setState({ loading: false, noMatch: true });
                }

                if (dropOffLocationId !== pickupLocationId) {
                    dropOffLocation = await LocationService.getLocation(dropOffLocationId);
                } else {
                    dropOffLocation = pickupLocation;
                }

                if (!dropOffLocation) {
                    return this.setState({ loading: false, noMatch: true });
                }

                this.setState({ pickupLocation, dropOffLocation, from, to, visible: true });

            } catch (err) {
                toast(commonStrings.GENERIC_ERROR, { type: 'error' });
            }

        });
    };

    componentDidMount() {
    }

    render() {
        const { companies, pickupLocation, dropOffLocation, loading, reload, visible, noMatch, from, to, fuel, gearbox, mileageUnlimited } = this.state;

        return (
            <Master onLoad={this.onLoad} strict={false}>
                {visible && companies && pickupLocation && dropOffLocation && from && to &&
                    <div className='cars'>
                        <div className='col-1'>
                            {!loading &&
                                <CarFilter
                                    pickupLocation={pickupLocation}
                                    dropOffLocation={dropOffLocation}
                                    from={from}
                                    to={to}
                                    onSubmit={this.handleCarFilterSubmit}
                                />
                            }
                            <CompanyFilter
                                onLoad={this.handleCompanyFilterLoad}
                                onChange={this.handleCompanyFilterChange}
                            />
                            {!loading &&
                                <>
                                    <FuelFilter onChange={this.handleFuelFilterChange} />
                                    <GearboxFilter onChange={this.handleGearboxFilterChange} />
                                    <MileageFilter onChange={this.handleMileageFilterChange} />
                                </>
                            }
                        </div>
                        <div className='col-2'>
                            <CarList
                                companies={companies}
                                fuel={fuel}
                                gearbox={gearbox}
                                mileageUnlimited={mileageUnlimited}
                                pickupLocation={pickupLocation._id}
                                reload={reload}
                                loading={loading}
                                from={from}
                                to={to}
                                onLoad={this.handleCarListLoad}
                            />
                        </div>
                    </div>
                }
                {noMatch && <NoMatch />}
            </Master >
        );
    }
}