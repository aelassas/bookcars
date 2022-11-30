import React from 'react';
import { Link } from '@mui/material';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/no-match';
import Master from '../elements/Master';

const NoMatch = (props) => {

    const noMatch = () => (
        <div className='msg'>
            <h2>{strings.NO_MATCH}</h2>
            <p><Link href='/'>{commonStrings.GO_TO_HOME}</Link></p>
        </div>
    );

    return (
        props.hideHeader ? noMatch() : <Master strict={false}>{noMatch()}</Master>
    );
};

export default NoMatch;