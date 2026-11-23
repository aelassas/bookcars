import React, { useState } from 'react'
import { Box, Typography } from '@mui/material'
import { Notifications as NotificationsIcon } from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import NotificationList from '@/components/NotificationList'

const Notifications = () => {
  const [user, setUser] = useState<bookcarsTypes.User>()

  const onLoad = async (_user?: bookcarsTypes.User) => {
    setUser(_user)
  }

  return (
    <Layout onLoad={onLoad} strict>
      <Box sx={{ maxWidth: 1000, mx: 'auto', px: { xs: 2, sm: 3 }, pt: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <NotificationsIcon sx={{ color: 'var(--sr-emerald)', fontSize: 20 }} />
          <Typography sx={{ color: 'var(--sr-emerald)', fontWeight: 800, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            SafarRent • Activity Timeline
          </Typography>
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--sr-text, #0B1120)', letterSpacing: '-0.02em', mb: 2 }}>
          Notifications & Trip Updates
        </Typography>
      </Box>
      <NotificationList user={user} />
    </Layout>
  )
}

export default Notifications
