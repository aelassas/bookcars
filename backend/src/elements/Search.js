import React, { Component } from 'react';
import { strings as commonStrings } from '../lang/common';
import { IconButton, TextField } from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material'

import '../assets/css/search.css'

class Search extends Component {

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
        const { keyword } = this.state;

        return (
            <div className={this.props.className}>
                <TextField
                    variant='standard'
                    value={keyword}
                    onKeyDown={this.handleSearchKeyDown}
                    onChange={this.handleSearchChange}
                    placeholder={commonStrings.SEARCH_PLACEHOLDER}
                    InputProps={{
                        endAdornment: keyword ? (
                            <IconButton size='small' onClick={() => this.setState({ keyword: '' })}>
                                <ClearIcon style={{ width: 18, height: 18 }} />
                            </IconButton>
                        ) : <></>
                    }}
                    autoComplete='off'
                    className='sc-search'
                />
                < IconButton onClick={this.handleSearch} >
                    <SearchIcon />
                </IconButton >
            </div>
        );
    }
}

export default Search;