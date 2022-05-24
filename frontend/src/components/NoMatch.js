
import React, { Component } from 'react';
import { Link } from '@mui/material';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/no-match';
import Master from '../elements/Master'

export default class NoMatch extends Component {

    noMatch = () => (
        <div className='msg'>
            <h2>{strings.NO_MATCH}</h2>
            <p><Link href='/'>{commonStrings.GO_TO_HOME}</Link></p>
        </div>
    );

    render() {
        return (
            this.props.header ? <Master strict={false}>{this.noMatch()}</Master> : this.noMatch()
        );
    }
}