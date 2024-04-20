import React, { useState } from 'react'
import * as bookcarsTypes from ':bookcars-types'
import Master from '../components/Master'
import NotificationList from '../components/NotificationList'

const Notifications = () => {
  const [user, setUser] = useState<bookcarsTypes.User>()

  const onLoad = async (_user?: bookcarsTypes.User) => {
    setUser(_user)
  }

  return (
    <Master onLoad={onLoad} strict>
      <NotificationList user={user} />
    </Master>
  )
}

export default Notifications
