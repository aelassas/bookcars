import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, Button, Paper, Chip } from '@mui/material'
import {
  ShieldOutlined as ShieldIcon,
  DirectionsCar as CarIcon,
  CheckCircle as CheckIcon,
  ArrowForward as ArrowIcon
} from '@mui/icons-material'
import { strings } from '@/lang/about'
import Layout from '@/components/Layout'
import Footer from '@/components/Footer'

import '@/assets/css/about.css'

const About = () => {
  const navigate = useNavigate()

  return (
    <Layout strict={false}>
      <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, sm: 3 }, py: 5 }}>
        {/* Editorial Layout: Sticky TOC + 780px Content */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '240px 1fr' }, gap: 5, alignItems: 'flex-start' }}>
          {/* Sticky Table of Contents Sidebar */}
          <Box
            sx={{
              display: { xs: 'none', md: 'block' },
              position: 'sticky',
              top: 100,
              p: 2.5,
              borderRadius: '14px',
              bgcolor: 'var(--sr-surface-raised, #F8FAFC)',
              border: '1px solid var(--sr-border, #E2E8F0)'
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'var(--sr-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', mb: 1.5 }}>
              Table of Contents
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button href="#mission" sx={{ justifyContent: 'flex-start', color: 'var(--sr-text)', fontSize: 13, textTransform: 'none', fontWeight: 600, p: 0.5 }}>
                1. Mission & Vision
              </Button>
              <Button href="#escrow" sx={{ justifyContent: 'flex-start', color: 'var(--sr-text)', fontSize: 13, textTransform: 'none', fontWeight: 600, p: 0.5 }}>
                2. Escrow Protection
              </Button>
              <Button href="#standards" sx={{ justifyContent: 'flex-start', color: 'var(--sr-text)', fontSize: 13, textTransform: 'none', fontWeight: 600, p: 0.5 }}>
                3. Fleet Standards
              </Button>
              <Button href="#corridors" sx={{ justifyContent: 'flex-start', color: 'var(--sr-text)', fontSize: 13, textTransform: 'none', fontWeight: 600, p: 0.5 }}>
                4. National Corridors
              </Button>
            </Box>
          </Box>

          {/* 780px Editorial Typography Container */}
          <Box sx={{ maxWidth: 780 }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Chip
                icon={<ShieldIcon sx={{ fontSize: 14, color: '#059669 !important' }} />}
                label="SafarRent Mobility Standards"
                size="small"
                sx={{ bgcolor: 'rgba(5, 150, 105, 0.1)', color: 'var(--sr-emerald)', fontWeight: 700, fontSize: 11 }}
              />
            </Box>

            <Typography variant="h3" sx={{ fontWeight: 800, color: 'var(--sr-text, #0B1120)', letterSpacing: '-0.02em', mb: 2, fontSize: { xs: '28px', sm: '36px' } }}>
              {strings.TITLE1}
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'var(--sr-emerald)', mb: 3 }}>
              {strings.SUBTITLE1}
            </Typography>

            <Typography sx={{ color: 'var(--sr-text, #334155)', fontSize: 16, lineHeight: 1.8, mb: 4 }} id="mission">
              {strings.CONTENT1}
            </Typography>

            {/* Escrow Highlight Box */}
            <Paper
              id="escrow"
              sx={{
                p: 3,
                my: 4,
                borderRadius: '16px',
                bgcolor: 'rgba(5, 150, 105, 0.05)',
                border: '1px solid rgba(5, 150, 105, 0.25)'
              }}
              elevation={0}
            >
              <Typography variant="h6" sx={{ fontWeight: 800, color: 'var(--sr-text)', mb: 1 }}>
                The 20% Zero-Cheque Escrow Protocol
              </Typography>
              <Typography variant="body2" sx={{ color: 'var(--sr-text)', lineHeight: 1.7, mb: 2 }}>
                Traditional Pakistani car rentals demand blank guarantee cheques, original property registries, and arbitrary security deposits. SafarRent replaces all friction with an automated 20% commitment advance locked via JazzCash, Easypaisa, or Raast.
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                <Chip icon={<CheckIcon sx={{ fontSize: '14px !important', color: 'var(--sr-emerald)' }} />} label="Zero Blank Cheques" size="small" sx={{ fontWeight: 700, bgcolor: 'var(--sr-surface)' }} />
                <Chip icon={<CheckIcon sx={{ fontSize: '14px !important', color: 'var(--sr-emerald)' }} />} label="2-Minute CNIC Clearance" size="small" sx={{ fontWeight: 700, bgcolor: 'var(--sr-surface)' }} />
                <Chip icon={<CheckIcon sx={{ fontSize: '14px !important', color: 'var(--sr-emerald)' }} />} label="100% Escrow Security" size="small" sx={{ fontWeight: 700, bgcolor: 'var(--sr-surface)' }} />
              </Box>
            </Paper>

            <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--sr-text, #0B1120)', letterSpacing: '-0.02em', mb: 2, mt: 4 }} id="standards">
              {strings.TITLE2}
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'var(--sr-emerald)', mb: 3 }}>
              {strings.SUBTITLE2}
            </Typography>

            <Typography sx={{ color: 'var(--sr-text, #334155)', fontSize: 16, lineHeight: 1.8, mb: 4 }} id="corridors">
              {strings.CONTENT2}
            </Typography>

            <Box sx={{ pt: 2, borderTop: '1px solid var(--sr-border, #E2E8F0)' }}>
              <Button
                variant="contained"
                className="btn-primary"
                onClick={() => navigate('/search')}
                endIcon={<ArrowIcon />}
                sx={{
                  bgcolor: '#107487',
                  '&:hover': { bgcolor: '#047857' },
                  fontWeight: 700,
                  fontSize: 14,
                  py: 1.2,
                  px: 3.5,
                  textTransform: 'none',
                  borderRadius: '10px'
                }}
              >
                {strings.FIND_DEAL}
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      <Footer />
    </Layout>
  )
}

export default About
