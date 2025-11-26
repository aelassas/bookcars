import React from 'react'
import { strings } from '@/lang/cookie-policy'
import Layout from '@/components/Layout'

import '@/assets/css/cookie-policy.css'

const CookiePolicy = () => {
  const onLoad = () => { }

  return (
    <Layout onLoad={onLoad} strict={false}>
      <div className="cookie-policy">
        <h1>{strings.TITLE}</h1>
        <p>{strings.POLICY}</p>
      </div>
    </Layout>
  )
}

export default ToS
