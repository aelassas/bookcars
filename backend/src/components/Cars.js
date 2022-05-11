import React, { Component } from 'react';
import Master from '../elements/Master';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/cars';
import Helper from '../common/Helper';
import CarService from '../services/CarService';
import CompanyService from '../services/CompanyService';
import Backdrop from '../elements/SimpleBackdrop';
import { toast } from 'react-toastify';
import {
    IconButton,
    Input,
    Button
} from '@mui/material';
import {
    Search as SearchIcon
} from '@mui/icons-material';

import '../assets/css/cars.css';
import CarList from '../elements/CarList';

export default class Cars extends Component {

    constructor(props) {
        super(props);
        this.state = {
            user: null,
            companies: [],
            companyIds: [],
            checkedCompanies: [],
            allCompaniesChecked: true,
            cars: [],
            page: 1,
            isLoading: true,
            fetch: false,
            keyword: '',
            openDeleteDialog: false,
            carId: '',
            carIndex: -1
        };
    }

    handleSearchChange = (e) => {
        this.setState({ keyword: e.target.value });
    };

    handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') {
            this.handleSearch();
        }
    }

    handleSearch = (e) => {
        document.querySelector('.col-2').scrollTo(0, 0);
        this.setState({ page: 1 }, () => {
            this.fetch();
        });
    };


    handleCheckCompanyChange = (e) => {
        const { checkedCompanies } = this.state;
        const companyId = e.currentTarget.getAttribute('data-id');

        if (e.currentTarget.checked) {
            checkedCompanies.push(companyId);
        } else {
            const index = checkedCompanies.indexOf(companyId);
            checkedCompanies.splice(index, 1);
        }

        this.setState({ checkedCompanies }, _ => {
            this.handleSearch();
        });
    };

    handleCompanyClick = (e) => {
        const checkbox = e.currentTarget.previousSibling;
        checkbox.checked = !checkbox.checked;
        const event = e;
        event.currentTarget = checkbox;
        this.handleCheckCompanyChange(event);
    };

    handleUncheckAllChange = (e) => {
        const { allCompaniesChecked } = this.state;
        const checkboxes = document.querySelectorAll('.company-checkbox');

        if (allCompaniesChecked) { // uncheck all
            this.setState({ allCompaniesChecked: false, checkedCompanies: [] });

            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
        } else { // check all
            this.setState({ allCompaniesChecked: true, checkedCompanies: this.state.companyIds });

            checkboxes.forEach(checkbox => {
                checkbox.checked = true;
            });

            this.handleSearch();
        }
    };

    fetch = _ => {
        const { keyword, page, checkedCompanies, cars } = this.state;
        const payload = checkedCompanies;

        this.setState({ isLoading: true });
        CarService.getCars(keyword, payload, page, Env.CARS_PAGE_SIZE)
            .then(data => {
                const _cars = page === 1 ? data : [...cars, ...data];
                this.setState({ cars: _cars, isLoading: false, fetch: data.length > 0 });
            })
            .catch(_ => toast(commonStrings.GENERIC_ERROR, { type: 'error' }));
    };

    flattenCompanies = (companies) => {
        const result = [];
        for (const { _id } of companies) {
            result.push(_id);
        }
        return result;
    };

    onLoad = (user) => {
        this.setState({ user }, _ => {

            CompanyService.getCompanies()
                .then(companies => {
                    const companyIds = this.flattenCompanies(companies);
                    this.setState({ companies, companyIds, checkedCompanies: companyIds }, _ => {
                        const checkboxes = document.querySelectorAll('.company-checkbox');
                        checkboxes.forEach(checkbox => {
                            checkbox.checked = true;
                        });

                        this.fetch();
                    });
                })
                .catch(_ => toast(commonStrings.GENERIC_ERROR, { type: 'error' }));

            const div = document.querySelector('.col-2');
            if (div) {
                div.onscroll = (event) => {
                    const { fetch, isLoading, page } = this.state;
                    if (fetch && !isLoading && (window.innerHeight + event.target.scrollTop) >= (event.target.scrollHeight - Env.PAGE_FETCH_OFFSET)) {
                        this.setState({ page: page + 1 }, _ => {
                            this.fetch();
                        });
                    }
                };
            }
        });
    }

    componentDidMount() {
    }

    render() {
        const { user, companies, allCompaniesChecked, cars, isLoading } = this.state;

        return (
            <Master onLoad={this.onLoad} strict={true}>
                <div className='cars'>
                    <div className='col-1'>
                        <Input
                            type="text"
                            className='search'
                            placeholder={commonStrings.SEARCH_PLACEHOLDER}
                            onKeyDown={this.handleSearchKeyDown}
                            onChange={this.handleSearchChange}
                        />
                        <IconButton onClick={this.handleSearch}>
                            <SearchIcon />
                        </IconButton>
                        {companies.length > 0 &&
                            <div className='companies-filter'>
                                <ul className='companies-list'>
                                    {
                                        companies.map(company => (
                                            <li key={company._id}>
                                                <input type='checkbox' data-id={company._id} className='company-checkbox' onChange={this.handleCheckCompanyChange} />
                                                <label onClick={this.handleCompanyClick}>
                                                    <img src={Helper.joinURL(Env.CDN_USERS, company.avatar)}
                                                        alt={company.fullName}
                                                        style={{
                                                            width: Env.COMPANY_IMAGE_WIDTH,
                                                            // height: Env.COMPANY_IMAGE_HEIGHT
                                                        }} />
                                                </label>
                                            </li>
                                        ))
                                    }
                                </ul>
                                <div className='filter-actions'>
                                    <span onClick={this.handleUncheckAllChange} className='uncheckall'>
                                        {allCompaniesChecked ? commonStrings.UNCHECK_ALL : commonStrings.CHECK_ALL}
                                    </span>
                                </div>
                            </div>
                        }
                        <Button
                            type="submit"
                            variant="contained"
                            className='btn-primary new-car'
                            size="small"
                            href='/create-car'
                        >
                            {strings.NEW_CAR}
                        </Button>
                    </div>
                    <div className='col-2'>
                        <CarList
                            user={user}
                            cars={cars}
                            isLoading={isLoading} />
                    </div>
                </div>
                {isLoading && <Backdrop text={commonStrings.LOADING} />}
            </Master >
        );
    }
}