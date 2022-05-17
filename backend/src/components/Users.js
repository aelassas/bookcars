import React, { Component } from 'react';
import Master from '../elements/Master';
import Env from '../config/env.config';
import { strings } from '../lang/users';
import Helper from '../common/Helper';
import UserTypeFilter from '../elements/UserTypeFilter';
import UserFilter from '../elements/UserFilter';
import UserList from '../elements/UserList';
import { Button } from '@mui/material';

import '../assets/css/users.css';

export default class Users extends Component {

    constructor(props) {
        super(props);
        this.state = {
            user: null,
            admin: false,
            types: [],
            keyword: '',
            reload: false
        };
    }

    handleUserListLoad = () => {
        this.setState({ reload: false });
    }

    handleUserTypeFilterChange = (newTypes) => {
        const { types } = this.state;
        this.setState({ types: newTypes, reload: Helper.arrayEqual(types, newTypes) });
    };

    handleUserFilterSubmit = (newKeyword) => {
        const { keyword } = this.state;
        this.setState({ keyword: newKeyword, reload: keyword === newKeyword });
    }

    onLoad = (user) => {
        const admin = Helper.admin(user), types = admin ? Helper.getUserTypes().map(userType => userType.value) : [Env.RECORD_TYPE.USER];
        this.setState({ user, admin, types });
    }

    componentDidMount() {
    }

    render() {
        const { user, admin, types, keyword, reload } = this.state;

        return (
            <Master onLoad={this.onLoad} strict={true}>
                {user && <div className='users'>
                    <div className='col-1'>

                        <UserFilter
                            onSubmit={this.handleUserFilterSubmit}
                            className='cl-user-filter'
                        />

                        {admin &&
                            <UserTypeFilter
                                onChange={this.handleUserTypeFilterChange}
                            />
                        }
                        <Button
                            variant="contained"
                            className='btn-primary cl-new-user'
                            size="small"
                            href='/create-user'
                        >
                            {strings.NEW_USER}
                        </Button>

                    </div>
                    <div className='col-2'>
                        <UserList
                            width='100%'
                            height='100%'
                            user={user}
                            types={types}
                            keyword={keyword}
                            checkboxSelection={!Env.isMobile() && admin}
                            hideTypeColumn={!admin}
                            reload={reload}
                            onLoad={this.handleUserListLoad}
                        />
                    </div>
                </div>}
            </Master>
        );
    }
}