
import React, { Component } from 'react';
import { Link } from '@mui/material';
import { strings as commonStrings } from '../lang/common';

export default class Error extends Component {
    render() {
        return (
            <div className='msg' style={this.props.style}>
                <h2>{commonStrings.GENERIC_ERROR}</h2>
                <Link href='/'>{commonStrings.GO_TO_HOME}</Link>
            </div>
        );
    }
}