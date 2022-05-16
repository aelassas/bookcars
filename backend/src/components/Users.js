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
            isAdmin: false,
            types: [],
            keyword: ''
        };
    }

    handleUserTypeFilterChange = (types) => {
        this.setState({ types });
    };

    handleUserFilterSubmit = (keyword) => {
        this.setState({ keyword });
    }

    onLoad = (user) => {
        const isAdmin = Helper.isAdmin(user), types = isAdmin ? Helper.getUserTypes().map(userType => userType.value) : [Env.RECORD_TYPE.USER];
        this.setState({ user, isAdmin, types });
    }

    componentDidMount() {
    }

    render() {
        const { user, isAdmin, types, keyword } = this.state;

        return (
            <Master onLoad={this.onLoad} strict={true}>
                {user && <div className='users'>
                    <div className='col-1'>

                        <UserFilter
                            onSubmit={this.handleUserFilterSubmit}
                            className='cl-user-filter'
                        />

                        {isAdmin && <UserTypeFilter
                            onChange={this.handleUserTypeFilterChange}
                            className='cl-user-type-filter'
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
                            checkboxSelection={!Env.isMobile()}
                            hideTypeColumn={!isAdmin}
                        />
                    </div>
                </div>}
            </Master>
        );
    }
}