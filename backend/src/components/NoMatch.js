
import React, { Component } from 'react';
import { Link } from '@mui/material';
import { strings } from '../config/app.config';
import Master from '../elements/Master';

import '../assets/css/no-match.css';

export default class Car extends Component {
    render() {
        return (
            <Master strict={false} style={this.props.style}>
                <div className='no-match'>
                    <h2>{strings.NO_MATCH}</h2>
                    <p><Link href='/'>{strings.GO_TO_HOME}</Link></p>
                </div>
            </Master>
        );
    }
}