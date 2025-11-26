import React from 'react'
import Layout from '@/components/Layout'
import SupplierList from '@/components/SupplierList'

import '@/assets/css/suppliers.css'

const Suppliers = () => {
  const onLoad = () => {
  }

  return (
    <Layout onLoad={onLoad} strict={false}>
      <div className="suppliers">
        <SupplierList />
      </div>
    </Layout>
  )
}

export default Suppliers
