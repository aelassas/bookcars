import React, { Component } from 'react';
import Master from '../elements/Master';
// import Env from '../config/env.config';
// import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/bookings';
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
import Helper from '../common/Helper';

export default class Bookings extends Component {

    constructor(props) {
        super(props);
        this.state = {
            user: undefined,
            leftPanel: false,
            companies: [],
            statuses: Helper.getBookingStatuses(),
            filter: undefined
        };
    }

    handleCompanyFilterLoad = (companies) => {
        this.setState({ companies, leftPanel: true });
    };

    handleCompanyFilterChange = (companies) => {
        this.setState({ companies });
    };

    handleStatusFilterChange = (statuses) => {
        this.setState({ statuses });
    };

    handleBookingFilterSubmit = (filter) => {
        this.setState({ filter });
    };

    onLoad = (user) => {
        this.setState({ user });
    };

    componentDidMount() {
    }

    render() {
        const { user, companies, statuses, filter, leftPanel } = this.state;

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
                                >
                                    {strings.NEW_BOOKING}
                                </Button>
                            )}
                            <CompanyFilter
                                onLoad={this.handleCompanyFilterLoad}
                                onChange={this.handleCompanyFilterChange}
                                className='cl-company-filter'
                            />
                            {leftPanel && (
                                <div>
                                    <StatusFilter
                                        onChange={this.handleStatusFilterChange}
                                        className='cl-status-filter'
                                    />
                                    <BookingFilter
                                        onSubmit={this.handleBookingFilterSubmit}
                                        className='cl-booking-filter'
                                    />
                                </div>
                            )}
                        </div>
                        <div className='col-2'>
                            <BookingList
                                user={user}
                                companies={companies}
                                statuses={statuses}
                                filter={filter}
                                width='100%'
                                height='100%'
                            />
                        </div>
                    </div>}
            </Master>
        );
    }
}