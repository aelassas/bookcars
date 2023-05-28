import React from 'react'
import Master from '../components/Master'

import '../assets/css/about.css'
import Env from "../config/env.config";

const About = () => {

    const onLoad = (user) => {
        console.log("Env", Env);
        console.log("user", user);
    }

    return (
        <Master onLoad={onLoad} strict={false}>
            About!
        </Master>
    )
}

export default About
