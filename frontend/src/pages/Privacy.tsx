import React from 'react'
import { strings } from '@/lang/privacy'
import Layout from '@/components/Layout'

import '@/assets/css/privacy.css'

const Privacy = () => {
  const onLoad = () => { }

  return (
    <Layout onLoad={onLoad} strict={false}>
      <div className="privacy">
        <h1>{strings.TITLE}</h1>
        <p>{strings.PRIVACY_POLICY}</p>
      </div>
    </Layout>
  )
}

export default Privacy
