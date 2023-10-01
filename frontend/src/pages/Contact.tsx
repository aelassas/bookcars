import React from 'react'
import Master from '../components/Master'

import '../assets/css/contact.css'

function Contact() {
  const onLoad = () => {}

  return (
    <Master onLoad={onLoad} strict={false}>
      Contact!
    </Master>
  )
}

export default Contact
