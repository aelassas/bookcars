import React from 'react'
import Master from '../components/Master'

import '../assets/css/about.css'
import Env from "../config/env.config";

const About = () => {

    const onLoad = (_user) => {
        console.log("Env", Env);
    }

    return (
        <Master onLoad={onLoad} strict={false}>
            About!
        </Master>
    )
}

export default About
