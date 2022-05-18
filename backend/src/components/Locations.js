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
            reload: false
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
    };

    render() {
        const { rowCount, reload, keyword } = this.state;

        return (
            <Master onLoad={this.onLoad} strict={true}>
                <div className='locations'>
                    <div className='col-1'>
                        <Search onSubmit={this.handleSearch} />

                        {rowCount > -1 &&
                            <InfoBox value={`${rowCount} ${rowCount > 1 ? strings.LOCATIONS : strings.LOCATION}`} />
                        }

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
                    </div>
                    <div className='col-2'>
                        <LocationList
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