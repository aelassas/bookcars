import React, { useState } from 'react';
import Master from '../elements/Master';
import Env from '../config/env.config';
import { strings } from '../lang/users';
import * as Helper from '../common/Helper';
import UserTypeFilter from '../elements/UserTypeFilter';
import Search from '../elements/Search';
import UserList from '../elements/UserList';
import { Button } from '@mui/material';

import '../assets/css/users.css';

const Users = () => {
    const [user, setUser] = useState();
    const [admin, setAdmin] = useState(false);
    const [types, setTypes] = useState([]);
    const [keyword, setKeyword] = useState('');
    const [reload, setReload] = useState(false);

    const handleUserListLoad = () => {
        setReload(false);
    }

    const handleUserTypeFilterChange = (newTypes) => {
        setTypes(newTypes);
        setReload(Helper.arrayEqual(types, newTypes));
    };

    const handleSearch = (newKeyword) => {
        setKeyword(newKeyword);
        setReload(keyword === newKeyword);
    }

    const onLoad = (user) => {
        const admin = Helper.admin(user);
        const types = admin ? Helper.getUserTypes().map(userType => userType.value) : [Env.RECORD_TYPE.COMPANY, Env.RECORD_TYPE.USER];

        setUser(user);
        setAdmin(admin);
        setTypes(types);
    }

    return (
        <Master onLoad={onLoad} strict={true}>
            {user && <div className='users'>
                <div className='col-1'>
                    <div className='div.col-1-container'>
                        <Search
                            onSubmit={handleSearch}
                            className='search'
                        />

                        {admin &&
                            <UserTypeFilter
                                className='user-type-filter'
                                onChange={handleUserTypeFilterChange}
                            />
                        }

                        <Button
                            variant="contained"
                            className='btn-primary new-user'
                            size="small"
                            href='/create-user'
                        >
                            {strings.NEW_USER}
                        </Button>
                    </div>
                </div>
                <div className='col-2'>
                    <UserList
                        user={user}
                        types={types}
                        keyword={keyword}
                        checkboxSelection={!Env.isMobile() && admin}
                        hideDesktopColumns={Env.isMobile()}
                        reload={reload}
                        onLoad={handleUserListLoad}
                    />
                </div>
            </div>}
        </Master>
    );
};

export default Users;