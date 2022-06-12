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

export default class Bookings extends Component {

    constructor(props) {
        super(props);

        this.state = {
            user: null,
            leftPanel: false,
            companies: [],
            statuses: Helper.getBookingStatuses().map(status => status.value),
            filter: null,
            loading: true,
            admin: false,
            reload: false,
            loadingCompanies: true
        };
    }

    handleCompanyFilterLoad = (companies) => {
        this.setState({ companies, leftPanel: true, loadingCompanies: false });
    };

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
        this.setState({ user, admin, companies: admin ? [] : [user._id], leftPanel: !admin, loadingCompanies: admin });
    };

    componentDidMount() {
    }

    render() {
        const { user, admin, companies, statuses, filter, leftPanel, reload, loadingCompanies } = this.state;

        return (
            <Master onLoad={this.onLoad} strict={true}>
                {user &&
                    <div className='bookings'>
                        <div className='col-1'>
                            {leftPanel && (
                                <Button
                                    variant="contained"
                                    className='btn-primary cl-new-booking'
                                    size="small"
                                    href='/create-booking'
                                    target='_blank'
                                    rel='noreferrer'
                                >
                                    {strings.NEW_BOOKING}
                                </Button>
                            )}
                            {admin &&
                                <CompanyFilter
                                    onLoad={this.handleCompanyFilterLoad}
                                    onChange={this.handleCompanyFilterChange}
                                    className='cl-company-filter'
                                />
                            }
                            {leftPanel && (
                                <div>
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
                                </div>
                            )}
                        </div>
                        <div className='col-2'>
                            <BookingList
                                width='100%'
                                height='100%'
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