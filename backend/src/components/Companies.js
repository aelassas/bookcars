import React, { useState, useEffect } from 'react';
import Master from '../elements/Master';
import { strings } from '../lang/companies';
import Search from '../elements/Search';
import CompanyList from '../elements/CompanyList';
import InfoBox from '../elements/InfoBox';
import {
    Button,
} from '@mui/material';
import * as Helper from '../common/Helper';

import '../assets/css/companies.css';

const Companies = () => {
    const [user, setUser] = useState();
    const [keyword, setKeyword] = useState('');
    const [reload, setReload] = useState(false);
    const [rowCount, setRowCount] = useState(-1);
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

    const handleCompanyListLoad = (data) => {
        setReload(false);
        setRowCount(data.rowCount);
    };

    const handleCompanyDelete = (rowCount) => {
        setRowCount(rowCount);
    };

    const onLoad = (user) => {
        setUser(user);
    };

    const admin = Helper.admin(user);

    return (
        <Master onLoad={onLoad} strict={true}>
            {user &&
                <div className='companies'>
                    <div className='col-1'>
                        <div className='col-1-container'>
                            <Search className='search' onSubmit={handleSearch} />

                            {rowCount > -1 && admin &&
                                <Button
                                    type="submit"
                                    variant="contained"
                                    className='btn-primary new-company'
                                    size="small"
                                    href='/create-supplier'
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
                            containerClassName='companies'
                            offset={offset}
                            user={user}
                            keyword={keyword}
                            reload={reload}
                            onLoad={handleCompanyListLoad}
                            onDelete={handleCompanyDelete}
                        />
                    </div>
                </div>}

        </Master>
    );
};

export default Companies;
