import React, { Component } from 'react';
import Master from '../elements/Master';
import { strings } from '../lang/companies';
import Search from '../elements/Search';
import CompanyList from '../elements/CompanyList';
import InfoBox from '../elements/InfoBox';
import {
    Button,
} from '@mui/material';

import '../assets/css/companies.css';
import Helper from '../common/Helper';

export default class Companies extends Component {

    constructor(props) {
        super(props);
        this.state = {
            user: null,
            keyword: '',
            reload: false,
            rowCount: -1
        };
    }

    handleSearch = (newKeyword) => {
        const { keyword } = this.state;

        this.setState({ keyword: newKeyword, reload: newKeyword === keyword });
    };

    handleCompanyListLoad = (data) => {
        this.setState({ reload: false, rowCount: data.rowCount });
    };

    handleCompanyDelete = (rowCount) => {
        this.setState({ rowCount });
    };

    onLoad = (user) => {
        this.setState({ user });
    }

    componentDidMount() {
    }

    render() {
        const { user, keyword, reload, rowCount } = this.state, admin = Helper.admin(user);

        return (
            <Master onLoad={this.onLoad} strict={true}>
                {user &&
                    <div className='companies'>
                        <div className='col-1'>
                            <div className='col-1-container'>
                                <Search className='search' onSubmit={this.handleSearch} />

                                {rowCount > -1 && admin &&
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        className='btn-primary new-company'
                                        size="small"
                                        href='/create-company'
                                    >
                                        {strings.NEW_COMPANY}
                                    </Button>
                                }

                                {rowCount > 0 &&
                                    <InfoBox value={`${rowCount} ${rowCount > 1 ? strings.COMPANIES : strings.COMPANY}`} className='company-count' />
                                }
                            </div>
                        </div>
                        <div className='col-2'>
                            <CompanyList
                                user={user}
                                keyword={keyword}
                                reload={reload}
                                onLoad={this.handleCompanyListLoad}
                                onDelete={this.handleCompanyDelete}
                            />
                        </div>
                    </div>}

            </Master>
        );
    }
}