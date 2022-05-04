
import React, { Component } from 'react';
import { Link } from '@mui/material';
import { strings } from '../config/app.config';

export default class Error extends Component {
    render() {
        return (
            <div className='msg' style={this.props.style}>
                <h2>{strings.GENERIC_ERROR}</h2>
                <Link href='/'>{strings.GO_TO_HOME}</Link>
            </div>
        );
    }
}