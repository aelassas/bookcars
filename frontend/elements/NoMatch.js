
import React, { Component } from 'react';
import { Link } from '@mui/material';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/no-match';
import Helper from '../common/Helper';

export default class NoMatch extends Component {

    componentDidMount() {
        Helper.setLanguage(commonStrings);
        Helper.setLanguage(strings);
    }

    render() {
        return (
            <div className='msg'>
                <h2>{strings.NO_MATCH}</h2>
                <p><Link href='/'>{commonStrings.GO_TO_HOME}</Link></p>
            </div>
        );
    }
}