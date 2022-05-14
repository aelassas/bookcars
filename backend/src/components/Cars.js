import React, { Component } from 'react';
import Master from '../elements/Master';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/cars';
import CarService from '../services/CarService';
import Backdrop from '../elements/SimpleBackdrop';
import CompanyFilter from '../elements/CompanyFilter';
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
            checkedCompanies: [],
            cars: [],
            page: 1,
            isLoading: true,
            fetch: false,
            keyword: '',
            openDeleteDialog: false,
            carId: '',
            carIndex: -1,
            newCar: false
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

    handleCompanyFilterLoad = (checkedCompanies) => {
        this.setState({ checkedCompanies, newCar: true }, () => {
            this.fetch();
        });
    };

    handleCompanyFilterChange = (checkedCompanies) => {
        this.setState({ checkedCompanies }, () => {
            this.handleSearch();
        });
    };

    fetch = () => {
        const { keyword, page, checkedCompanies, cars } = this.state;
        const payload = checkedCompanies;

        this.setState({ isLoading: true });
        CarService.getCars(keyword, payload, page, Env.CARS_PAGE_SIZE)
            .then(data => {
                const _cars = page === 1 ? data : [...cars, ...data];
                this.setState({ cars: _cars, isLoading: false, fetch: data.length > 0 });
            })
            .catch(() => toast(commonStrings.GENERIC_ERROR, { type: 'error' }));
    };

    onLoad = (user) => {
        this.setState({ user }, () => {

            const div = document.querySelector('.col-2');
            if (div) {
                div.onscroll = (event) => {
                    const { fetch, isLoading, page } = this.state;
                    if (fetch && !isLoading && (window.innerHeight + event.target.scrollTop) >= (event.target.scrollHeight - Env.PAGE_FETCH_OFFSET)) {
                        this.setState({ page: page + 1 }, () => {
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
        const { user, cars, isLoading, newCar } = this.state;

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
                        <CompanyFilter
                            onLoad={this.handleCompanyFilterLoad}
                            onChange={this.handleCompanyFilterChange}
                        />
                        {newCar && <Button
                            type="submit"
                            variant="contained"
                            className='btn-primary new-car'
                            size="small"
                            href='/create-car'
                        >
                            {strings.NEW_CAR}
                        </Button>}
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