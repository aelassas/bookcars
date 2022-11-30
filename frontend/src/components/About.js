import React from 'react';
import Master from '../elements/Master';

import '../assets/css/about.css';

const About = () => {

    const onLoad = (user) => {
    };

    return (
        <Master onLoad={onLoad} strict>
            About!
        </Master>
    );
};

export default About;