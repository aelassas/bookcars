import React from 'react';
import Master from '../elements/Master';

import '../assets/css/contact.css';

const Contact = () => {

    const onLoad = (user) => {
    };

    return (
        <Master onLoad={onLoad} strict>
            Contact!
        </Master>
    );
};

export default Contact;