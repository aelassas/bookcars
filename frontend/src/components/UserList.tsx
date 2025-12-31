import React, { useEffect, useState } from 'react'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import * as UserService from '@/services/UserService'

import '@/assets/css/user-list.css'

const UserList = () => {
  const [users, setUsers] = useState<bookcarsTypes.User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true)
        const currentUser = UserService.getCurrentUser()
        
        if (!currentUser || !currentUser._id) {
          setLoading(false)
          return
        }

        const payload: bookcarsTypes.GetUsersBody = {
          user: currentUser._id,
          types: [bookcarsTypes.UserType.User], // Only fetch drivers (regular users)
        }

        const data = await UserService.getUsers(payload, '', 1, 100)
        const _data = data && data.length > 0 ? data[0] : { pageInfo: { totalRecord: 0 }, resultData: [] }
        
        if (_data && _data.resultData) {
          setUsers(_data.resultData)
        }
      } catch (err) {
        console.error('Error fetching users:', err)
      } finally {
        setLoading(false)
      }
    }

    fetch()
  }, [])

  if (loading) {
    return (
      <div className="user-list">
        <div className="loading">Loading drivers...</div>
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="user-list">
        <div className="no-users">No drivers found</div>
      </div>
    )
  }

  return (
    <div className="user-list">
      {
        users.map((user) => (
          <div key={user._id} className="user" title={user.fullName}>
            <div className="img">
              {user.avatar ? (
                <img src={bookcarsHelper.joinURL(env.CDN_USERS, user.avatar)} alt={user.fullName} />
              ) : (
                <div className="no-avatar">
                  {user.fullName?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="name">{user.fullName}</div>
            {user.email && <div className="email">{user.email}</div>}
          </div>
        ))
      }
    </div>
  )
}

export default UserList

