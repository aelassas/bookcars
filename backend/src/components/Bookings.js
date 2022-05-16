import React, { Component } from 'react';
import Master from '../elements/Master';
import Helper from '../common/Helper';
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
            reload: false
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

    handleBookingFilterSubmit = (newFilter) => {
        const { filter } = this.state, reload = Helper.filterEqual(filter, newFilter);
        this.setState({ filter: newFilter, reload });
    };

    handleBookingListLoad = () => {
        this.setState({ reload: false });
    }

    onLoad = (user) => {
        const admin = Helper.isAdmin(user);
        this.setState({ user, admin, companies: admin ? [] : [user._id], leftPanel: !admin });
    };

    componentDidMount() {
    }

    render() {
        const { user, admin, companies, statuses, filter, leftPanel, reload } = this.state;

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
                            {admin && <CompanyFilter
                                onLoad={this.handleCompanyFilterLoad}
                                onChange={this.handleCompanyFilterChange}
                                className='cl-company-filter'
                            />}
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
                                width='100%'
                                height='100%'
                                user={user}
                                companies={companies}
                                statuses={statuses}
                                filter={filter}
                                reload={reload}
                                onLoad={this.handleBookingListLoad}
                            />
                        </div>
                    </div>}
            </Master>
        );
    }
}