
import React, { Component } from 'react';
import { strings as commonStrings } from '../lang/common';
import { Link } from '@mui/material';
import Helper from '../common/Helper';

export default class Info extends Component {

    componentDidMount(){
        Helper.setLanguage(commonStrings);
    }

    render() {
        return (
            <div style={this.props.style} className={`${this.props.className ? `${this.props.className} ` : ''}msg`}>
                <p>{this.props.message}</p>
                <Link href='/'>{commonStrings.GO_TO_HOME}</Link>
            </div>
        );
    }
}