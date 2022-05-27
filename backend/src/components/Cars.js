import React, { Component } from 'react';
import Helper from '../common/Helper';
import { strings } from '../lang/cars';
import { strings as commonStrings } from '../lang/common';
import Master from '../elements/Master';
import CarList from '../elements/CarList';
import CompanyFilter from '../elements/CompanyFilter';
import Search from '../elements/Search';
import InfoBox from '../elements/InfoBox';
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
            loading: true
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

    onLoad = (user) => {
        this.setState({ user });
    };

    render() {
        const { user, keyword, companies, reload, rowCount, loading } = this.state;

        return (
            <Master onLoad={this.onLoad} strict={true}>
                {user &&
                    <div className='cars'>
                        <div className='col-1'>
                            <Search onSubmit={this.handleSearch} />

                            <CompanyFilter
                                onLoad={this.handleCompanyFilterLoad}
                                onChange={this.handleCompanyFilterChange}
                                className='filter'
                            />

                            {rowCount > 0 &&
                                <InfoBox value={`${rowCount} ${commonStrings.CAR}${rowCount > 1 ? 's' : ''}`} className='car-count' />
                            }

                            {rowCount > -1 &&
                                <Button
                                    type="submit"
                                    variant="contained"
                                    className='btn-primary new-car'
                                    size="small"
                                    href='/create-car'
                                >
                                    {strings.NEW_CAR}
                                </Button>
                            }
                        </div>
                        <div className='col-2'>
                            <CarList
                                user={user}
                                companies={companies}
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