
import React, { Component } from 'react';
import { Link } from '@mui/material';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/unauthorized';

export default class Unauthorized extends Component {
    render() {
        return (
            <div className='msg' style={this.props.style}>
                <h2>{strings.UNAUTHORIZED}</h2>
                <p><Link href='/'>{commonStrings.GO_TO_HOME}</Link></p>
            </div>
        );
    }
}