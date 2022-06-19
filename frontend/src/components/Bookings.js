import React, { Component } from 'react';
import Master from '../elements/Master';
import Env from '../config/env.config';
import Helper from '../common/Helper';
import BookingList from '../elements/BookingList';
import CompanyFilter from '../elements/CompanyFilter';
import StatusFilter from '../elements/StatusFilter';
import BookingFilter from '../elements/BookingFilter';
import CompanyService from '../services/CompanyService';

import '../assets/css/bookings.css';

export default class Bookings extends Component {

    constructor(props) {
        super(props);

        this.state = {
            user: null,
            allCompanies: [],
            companies: [],
            statuses: Helper.getBookingStatuses().map(status => status.value),
            filter: null,
            loading: true,
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
        this.setState({ user, loadingCompanies: true }, async () => {
            const allCompanies = await CompanyService.getAllCompanies();
            const companies = Helper.flattenCompanies(allCompanies);
            this.setState({ allCompanies, companies, loadingCompanies: false, offset: document.querySelector('div.col-1').clientHeight });
        });
    };

    render() {
        const { user, allCompanies, companies, statuses, filter, reload, loadingCompanies, offset } = this.state;

        return (
            <Master onLoad={this.onLoad} strict={true}>
                {user &&
                    <div className='bookings'>
                        <div className='col-1'>
                            <div>
                                <CompanyFilter
                                    companies={allCompanies}
                                    onChange={this.handleCompanyFilterChange}
                                    className='cl-company-filter'
                                />
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
                        </div>
                        <div className='col-2'>
                            <BookingList
                                containerClassName='bookings'
                                offset={offset}
                                user={user}
                                language={user.language}
                                companies={companies}
                                statuses={statuses}
                                filter={filter}
                                loading={loadingCompanies}
                                reload={reload}
                                onLoad={this.handleBookingListLoad}
                                hideDates={Env.isMobile()}
                                checkboxSelection={false}
                            />
                        </div>
                    </div>}
            </Master>
        );
    }
}