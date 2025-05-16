import React, { useState, useEffect } from 'react'
import { Container, Typography, Box } from '@mui/material'
import Layout from '../components/Layout'
import DressRentalStats from '../components/DressRentalStats'
import * as helper from '../common/helper'
import { strings } from '../lang/dresses'

const DressAnalytics: React.FC = () => {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const currentUser = helper.getUser()
    setUser(currentUser)
    setLoading(false)
  }, [])

  return (
    <Layout>
      {!loading && (
        <Container maxWidth="xl">
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" gutterBottom>
              {strings.DRESS_ANALYTICS || 'Dress Analytics'}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {strings.ANALYTICS_DESCRIPTION || 'View rental statistics and analytics for your dress inventory'}
            </Typography>
          </Box>

          <DressRentalStats />
        </Container>
      )}
    </Layout>
  )
}

export default DressAnalytics
