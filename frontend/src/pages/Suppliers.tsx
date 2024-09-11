import React from 'react'
import Layout from '@/components/Layout'
import SupplierList from '@/components/SupplierList'
import Footer from '@/components/Footer'

import '@/assets/css/suppliers.css'

const Suppliers = () => {
  const onLoad = () => {
  }

  return (
    <Layout onLoad={onLoad} strict={false}>
      <div className="suppliers">
        <SupplierList />
      </div>
      <Footer />
    </Layout>
  )
}

export default Suppliers
