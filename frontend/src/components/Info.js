
import React, { Component } from 'react';
import { strings as commonStrings } from '../lang/common';
import { Link } from '@mui/material';

export default class Info extends Component {
    render() {
        return (
            <div style={this.props.style} className={`${this.props.className ? `${this.props.className} ` : ''}msg`}>
                <p>{this.props.message}</p>
                <Link href='/'>{commonStrings.GO_TO_HOME}</Link>
            </div>
        );
    }
}