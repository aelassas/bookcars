import React from 'react'
import Layout from '@/components/Layout'
import UserList from '@/components/UserList'
import Footer from '@/components/Footer'

import '@/assets/css/users.css'

const Users = () => {
  const onLoad = () => {
  }

  return (
    <Layout onLoad={onLoad} strict={false}>
      <div className="users">
        <div className="users-header">
          <h1>Drivers</h1>
        </div>
        <UserList />
      </div>
      <Footer />
    </Layout>
  )
}

export default Users

