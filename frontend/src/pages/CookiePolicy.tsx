import React from 'react'
import { strings } from '@/lang/cookie-policy'
import Layout from '@/components/Layout'
import Footer from '@/components/Footer'

import '@/assets/css/cookie-policy.css'

const ToS = () => {
  const onLoad = () => { }

  return (
    <Layout onLoad={onLoad} strict={false}>
      <div className="cookie-policy">
        <h1>{strings.TITLE}</h1>
        <p>{strings.POLICY}</p>
      </div>
      <Footer />
    </Layout>
  )
}

export default ToS
