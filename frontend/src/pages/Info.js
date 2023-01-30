
import React from 'react';
import { strings as commonStrings } from '../lang/common';
import { Link } from '@mui/material';

const Info = (props) => (
    <div style={props.style} className={`${props.className ? `${props.className} ` : ''}msg`}>
        <p>{props.message}</p>
        <Link href='/'>{commonStrings.GO_TO_HOME}</Link>
    </div>
);

export default Info;