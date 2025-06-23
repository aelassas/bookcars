import React from 'react'
import { strings } from '@/lang/tos'
import Layout from '@/components/Layout'

import '@/assets/css/tos.css'

const ToS = () => {
  const onLoad = () => { }

  return (
    <Layout onLoad={onLoad} strict>
      <div className="tos">
        <h1>{strings.TITLE}</h1>
        <p>{strings.TOS}</p>
      </div>
    </Layout>
  )
}

export default ToS
