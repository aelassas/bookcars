import React from 'react'
import Master from '../components/Master'

import '../assets/css/tos.css'

const ToS = () => {
  const onLoad = () => {}

  return (
    <Master onLoad={onLoad} strict>
      ToS!
    </Master>
  )
}

export default ToS
