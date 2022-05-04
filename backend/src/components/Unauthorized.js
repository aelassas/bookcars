
import React, { Component } from 'react';
import { Link } from '@mui/material';
import { strings } from '../config/app.config';

export default class Unauthorized extends Component {
    render() {
        return (
            <div className='msg'>
                <h2>{strings.UNAUTHORIZED}</h2>
                <p><Link href='/'>{strings.GO_TO_HOME}</Link></p>
            </div>
        );
    }
}