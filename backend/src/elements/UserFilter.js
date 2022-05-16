import React, { Component } from 'react';
import { strings as commonStrings } from '../lang/common';
import { Input, IconButton } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material'

import '../assets/css/user-filter.css'

class UserFilter extends Component {

    constructor(props) {
        super(props);

        this.state = {
            keyword: ''
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
        if (this.props.onSubmit) this.props.onSubmit(this.state.keyword);
    };

    render() {
        return (
            <div className={this.props.className}>
                <Input
                    type="text"
                    className='uf-search'
                    placeholder={commonStrings.SEARCH_PLACEHOLDER}
                    onKeyDown={this.handleSearchKeyDown}
                    onChange={this.handleSearchChange}
                />
                <IconButton onClick={this.handleSearch}>
                    <SearchIcon />
                </IconButton>
            </div>
        );
    }
}

export default UserFilter;