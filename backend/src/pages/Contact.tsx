import React, { useState } from 'react'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import ContactForm from '@/components/ContactForm'

import '@/assets/css/contact.css'

const Contact = () => {
  const [user, setUser] = useState<bookcarsTypes.User>()

  const onLoad = (_user?: bookcarsTypes.User) => {
    setUser(_user)
  }

  return (
    <Layout onLoad={onLoad} strict>
      <div className="contact">
        <ContactForm user={user} className="form" />
      </div>
    </Layout>
  )
}

export default Contact
