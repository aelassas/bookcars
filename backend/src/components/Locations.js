import React, { useState, useEffect } from 'react';
import Master from '../elements/Master';
import { strings } from '../lang/locations';
import Search from '../elements/Search';
import LocationList from '../elements/LocationList';
import InfoBox from '../elements/InfoBox';
import { Button } from '@mui/material';

import '../assets/css/locations.css';

const Locations = () => {
    const [user, setUser] = useState();
    const [keyword, setKeyword] = useState('');
    const [rowCount, setRowCount] = useState(-1);
    const [reload, setReload] = useState(false);
    const [offset, setOffset] = useState(0);

    useEffect(() => {
        if (user && user.verified) {
            setOffset(document.querySelector('.col-1').clientHeight);
        }
    }, [user]);

    const handleSearch = (newKeyword) => {
        setKeyword(newKeyword);
        setReload(newKeyword === keyword);
    };

    const handleLocationListLoad = (data) => {
        setRowCount(data.rowCount);
        setReload(false);
    };

    const handleLocationDelete = (rowCount) => {
        setRowCount(rowCount);
    };

    const onLoad = (user) => {
        setUser(user);
    };

    return (
        <Master onLoad={onLoad} strict={true}>
            <div className='locations'>
                <div className='col-1'>
                    <div className='col-1-container'>
                        <Search className='search' onSubmit={handleSearch} />

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
                        onLoad={handleLocationListLoad}
                        onDelete={handleLocationDelete}
                    />
                </div>
            </div>

        </Master>
    );
};

export default Locations;