import React from 'react'
import Master from '../components/Master'

import '../assets/css/about.css'

const About = () => {
  const onLoad = () => {}

  return (
    <Master onLoad={onLoad} strict>
      About!
    </Master>
  )
}

export default About
