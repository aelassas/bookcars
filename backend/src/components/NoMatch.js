
import React, { Component } from 'react';
import { Link } from '@mui/material';
import { strings } from '../config/app.config';
import Master from '../elements/Master'

export default class NoMatch extends Component {

    noMatch = _ => (
        <div className='msg'>
            <h2>{strings.NO_MATCH}</h2>
            <p><Link href='/'>{strings.GO_TO_HOME}</Link></p>
        </div>
    );

    render() {
        return (
            this.props.header ?
                <Master strict={false}>
                    {this.noMatch()}
                </Master>
                : this.noMatch()
        );
    }
}