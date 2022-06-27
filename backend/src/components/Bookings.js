import React, { Component } from 'react';
import Master from '../elements/Master';
import Env from '../config/env.config';
import { strings } from '../lang/bookings';
import Helper from '../common/Helper';
import BookingList from '../elements/BookingList';
import CompanyFilter from '../elements/CompanyFilter';
import StatusFilter from '../elements/StatusFilter';
import BookingFilter from '../elements/BookingFilter';
import {
    Button
} from '@mui/material';
import {
} from '@mui/icons-material';

import '../assets/css/bookings.css';
import CompanyService from '../services/CompanyService';

export default class Bookings extends Component {

    constructor(props) {
        super(props);

        this.state = {
            user: null,
            leftPanel: false,
            allCompanies: [],
            companies: [],
            statuses: Helper.getBookingStatuses().map(status => status.value),
            filter: null,
            loading: true,
            admin: false,
            reload: false,
            loadingCompanies: true,
            offset: 0
        };
    }

    handleCompanyFilterChange = (newCompanies) => {
        const { companies } = this.state;
        this.setState({ companies: newCompanies, reload: Helper.arrayEqual(companies, newCompanies) });
    };

    handleStatusFilterChange = (newStatuses) => {
        const { statuses } = this.state;
        this.setState({ statuses: newStatuses, reload: Helper.arrayEqual(statuses, newStatuses) });
    };

    handleBookingFilterSubmit = (newFilter) => {
        const { filter } = this.state;
        this.setState({ filter: newFilter, reload: Helper.filterEqual(filter, newFilter) });
    };

    handleBookingListLoad = () => {
        this.setState({ reload: false });
    }

    onLoad = (user) => {
        const admin = Helper.admin(user);
        this.setState({ user, admin, leftPanel: !admin, loadingCompanies: admin }, async () => {
            const allCompanies = admin ? await CompanyService.getAllCompanies() : [];
            const companies = admin ? Helper.flattenCompanies(allCompanies) : [user._id];
            this.setState({ allCompanies, companies, leftPanel: true, loadingCompanies: false }, () => {
                this.setState({ offset: document.querySelector('.col-1').clientHeight });
            });
        });
    };

    render() {
        const { user, allCompanies, admin, companies, statuses, filter, leftPanel, reload, loadingCompanies, offset } = this.state;

        return (
            <Master onLoad={this.onLoad} strict={true}>
                {user &&
                    <div className='bookings'>
                        <div className='col-1'>
                            {leftPanel && (
                                <>
                                    <Button
                                        variant="contained"
                                        className='btn-primary cl-new-booking'
                                        size="small"
                                        href='/create-booking'
                                    >
                                        {strings.NEW_BOOKING}
                                    </Button>
                                    {admin &&
                                        <CompanyFilter
                                            companies={allCompanies}
                                            onChange={this.handleCompanyFilterChange}
                                            className='cl-company-filter'
                                        />
                                    }
                                    <StatusFilter
                                        onChange={this.handleStatusFilterChange}
                                        className='cl-status-filter'
                                    />
                                    <BookingFilter
                                        onSubmit={this.handleBookingFilterSubmit}
                                        language={(user && user.language) || Env.DEFAULT_LANGUAGE}
                                        className='cl-booking-filter'
                                        collapse={!Env.isMobile()}
                                    />
                                </>
                            )}
                        </div>
                        <div className='col-2'>
                            <BookingList
                                containerClassName='bookings'
                                offset={offset}
                                language={user.language}
                                loggedUser={user}
                                companies={companies}
                                statuses={statuses}
                                filter={filter}
                                loading={loadingCompanies}
                                reload={reload}
                                onLoad={this.handleBookingListLoad}
                                hideDates={Env.isMobile()}
                                checkboxSelection={!Env.isMobile()}
                            />
                        </div>
                    </div>}
            </Master>
        );
    }
}