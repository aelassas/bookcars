import React, { Component } from 'react';
import Master from '../elements/Master';
import Env from '../config/env.config';
import Helper from '../common/Helper';
import BookingList from '../elements/BookingList';
import CompanyFilter from '../elements/CompanyFilter';
import StatusFilter from '../elements/StatusFilter';
import BookingFilter from '../elements/BookingFilter';
import CompanyService from '../services/CompanyService';

import styles from '../styles/bookings.module.css';

export default class Bookings extends Component {

    constructor(props) {
        super(props);

        this.state = {
            user: null,
            companies: [],
            statuses: Helper.getBookingStatuses().map(status => status.value),
            filter: null,
            loading: true,
            reload: false,
            loadingCompanies: true,
            offset: 0
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

    onLoad = async (user) => {
        this.setState({ loadingCompanies: true });
        const allCompanies = await CompanyService.getAllCompanies();
        const companies = Helper.flattenCompanies(allCompanies);
        this.setState({ user, allCompanies, companies, loadingCompanies: false }, () => {
            this.setState({ offset: document.querySelector(`.${styles.col1}`).clientHeight });
        });
    };

    render() {
        const { user, allCompanies, companies, statuses, filter, reload, loadingCompanies, offset } = this.state;

        return (
            <Master onLoad={this.onLoad} strict={true}>
                {
                    user &&
                    <div className={styles.bookings}>
                        <div className={styles.col1}>
                            <CompanyFilter
                                companies={allCompanies}
                                onChange={this.handleCompanyFilterChange}
                                className={styles.clCompanyFilter}
                            />
                            <StatusFilter
                                onChange={this.handleStatusFilterChange}
                                className={styles.clStatusFilter}
                            />
                            <BookingFilter
                                onSubmit={this.handleBookingFilterSubmit}
                                language={(user && user.language) || Env.DEFAULT_LANGUAGE}
                                className={styles.clBookingFilter}
                                collapse={!Env.isMobile()}
                            />
                        </div>
                        <div className={styles.col2}>
                            <BookingList
                                containerClassName={styles.bookings}
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
                    </div>
                }
            </Master>
        );
    }
}