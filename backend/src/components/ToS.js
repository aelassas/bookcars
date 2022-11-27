import React from 'react';
import Master from '../elements/Master';

import '../assets/css/tos.css';

export default function ToS() {

    const onLoad = (user) => {
    };

    return (
        <Master onLoad={onLoad} strict>
            ToS!
        </Master>
    );
}