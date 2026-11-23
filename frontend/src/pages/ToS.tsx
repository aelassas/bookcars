import React from 'react'
import { Box, Typography, Paper, Chip } from '@mui/material'
import { Gavel as GavelIcon } from '@mui/icons-material'
import { strings } from '@/lang/tos'
import Layout from '@/components/Layout'
import Footer from '@/components/Footer'

import '@/assets/css/tos.css'

const ToS = () => {
  return (
    <Layout strict={false}>
      <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2, sm: 3 }, py: 6 }}>
        <Box sx={{ maxWidth: 780, mx: 'auto' }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Chip
              icon={<GavelIcon sx={{ fontSize: 14, color: '#059669 !important' }} />}
              label="Legal & Escrow Terms"
              size="small"
              sx={{ bgcolor: 'rgba(5, 150, 105, 0.1)', color: 'var(--sr-emerald)', fontWeight: 700, fontSize: 11 }}
            />
          </Box>
          <Typography variant="h3" sx={{ fontWeight: 800, color: 'var(--sr-text, #0B1120)', letterSpacing: '-0.02em', mb: 2 }}>
            {strings.TITLE}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Last revised: November 2026 • Governs self-drive handovers, chauffeur services, and PKR escrow protection.
          </Typography>

          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, sm: 4.5 },
              borderRadius: '16px',
              border: '1px solid var(--sr-border, #E2E8F0)',
              bgcolor: 'var(--sr-surface, #FFFFFF)',
              color: 'var(--sr-text, #334155)',
              fontSize: '15px',
              lineHeight: 1.85,
              whiteSpace: 'pre-line'
            }}
          >
            {strings.TOS}
          </Paper>
        </Box>
      </Box>

      <Footer />
    </Layout>
  )
}

export default ToS
