import React from 'react'
import FaqList from '@/components/FaqList'
import Layout from '@/components/Layout'

import '@/assets/css/faq.css'

const Faq = () => (
  <Layout strict={false}>
    <div className="faq">
      <FaqList />
    </div>
  </Layout>
)

export default Faq
