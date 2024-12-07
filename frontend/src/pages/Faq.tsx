import React from 'react'
import FaqList from '@/components/FaqList'
import Footer from '@/components/Footer'
import Layout from '@/components/Layout'

import '@/assets/css/faq.css'

const Faq = () => (
  <Layout strict={false}>
    <div className="faq">
      <FaqList />
    </div>

    <Footer />
  </Layout>
)

export default Faq
