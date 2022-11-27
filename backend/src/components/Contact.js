import React from 'react';
import Master from '../elements/Master';

import '../assets/css/contact.css';

export default function Contact() {

    const onLoad = (user) => {
    };

    return (
        <Master onLoad={onLoad} strict>
            Contact!
        </Master>
    );
}