
import React from 'react';
import { Link } from '@mui/material';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/unauthorized';

const Unauthorized = (props) => (
    <div className='msg' style={props.style}>
        <h2>{strings.UNAUTHORIZED}</h2>
        <p><Link href='/'>{commonStrings.GO_TO_HOME}</Link></p>
    </div>
);

export default Unauthorized;