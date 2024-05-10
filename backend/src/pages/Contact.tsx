import React from 'react'
import Layout from '../components/Layout'

import '../assets/css/contact.css'

const Contact = () => {
  const onLoad = () => { }

  return (
    <Layout onLoad={onLoad} strict>
      <div className="contact">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
        Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor
        in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident,
        sunt in culpa qui officia deserunt mollit anim id est laborum.
      </div>
    </Layout>
  )
}

export default Contact
