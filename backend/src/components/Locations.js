import React, { Component } from 'react';
import Master from '../elements/Master';
import { strings } from '../lang/locations';
import Search from '../elements/Search';
import LocationList from '../elements/LocationList';
import InfoBox from '../elements/InfoBox';
import {
    Button,
} from '@mui/material';

import '../assets/css/locations.css';

export default class Locations extends Component {

    constructor(props) {
        super(props);
        this.state = {
            loading: false,
            keyword: '',
            rowCount: -1,
            reload: false,
            offset: 0
        };
    }

    handleSearch = (newKeyword) => {
        const { keyword } = this.state;

        this.setState({ keyword: newKeyword, reload: newKeyword === keyword });
    };

    handleLocationListLoad = (data) => {
        this.setState({ reload: false, rowCount: data.rowCount });
    };

    handleLocationDelete = (rowCount) => {
        this.setState({ rowCount });
    };

    onLoad = (user) => {
        this.setState({ offset: document.querySelector('.col-1').clientHeight });
    };

    render() {
        const { rowCount, reload, keyword, offset } = this.state;

        return (
            <Master onLoad={this.onLoad} strict={true}>
                <div className='locations'>
                    <div className='col-1'>
                        <div className='col-1-container'>
                            <Search className='search' onSubmit={this.handleSearch} />

                            {rowCount > -1 &&
                                <Button
                                    variant="contained"
                                    className='btn-primary new-location'
                                    size="small"
                                    href='/create-location'
                                >
                                    {strings.NEW_LOCATION}
                                </Button>
                            }

                            {rowCount > 0 &&
                                <InfoBox value={`${rowCount} ${rowCount > 1 ? strings.LOCATIONS : strings.LOCATION}`} className='location-count' />
                            }
                        </div>
                    </div>
                    <div className='col-2'>
                        <LocationList
                            containerClassName='locations'
                            offset={offset}
                            keyword={keyword}
                            reload={reload}
                            onLoad={this.handleLocationListLoad}
                            onDelete={this.handleLocationDelete}
                        />
                    </div>
                </div>

            </Master>
        );
    }
}