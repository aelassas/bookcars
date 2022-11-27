import React from 'react';
import Master from '../elements/Master';

import '../assets/css/about.css';

export default function About() {

    const onLoad = (user) => {
    };

    return (
        <Master onLoad={onLoad} strict>
            About!
        </Master>
    );
}