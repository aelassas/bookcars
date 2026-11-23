import React, { useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  Divider
} from '@mui/material'
import {
  SupportAgent as SupportIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Security as EscrowIcon,
  Chat as WhatsAppIcon
} from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import ContactForm from '@/components/ContactForm'
import Footer from '@/components/Footer'

import '@/assets/css/contact.css'

const Contact = () => {
  const [user, setUser] = useState<bookcarsTypes.User>()

  const onLoad = (_user?: bookcarsTypes.User) => {
    setUser(_user)
  }

  return (
    <Layout onLoad={onLoad} strict={false}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 3 }, py: 4 }}>
        {/* Page Header */}
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Chip
              icon={<SupportIcon sx={{ fontSize: 14, color: '#059669 !important' }} />}
              label="24/7 Dispatch & Support"
              size="small"
              sx={{ bgcolor: 'rgba(5, 150, 105, 0.1)', color: 'var(--sr-emerald)', fontWeight: 700, fontSize: 11 }}
            />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--sr-text, #0B1120)', letterSpacing: '-0.02em', mb: 1 }}>
            Get in Touch With SafarRent
          </Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 650, mx: 'auto', fontSize: 14 }}>
            Have a question regarding fleet availability, corporate reservations, or our JazzCash/Easypaisa escrow lock? We are here to assist 24/7.
          </Typography>
        </Box>

        {/* 2-Column Grid: WhatsApp & Hub Directory + Contact Form */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '420px 1fr' }, gap: 3.5, mb: 4 }}>
          {/* Left Column: Direct WhatsApp & Hub Support */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Instant WhatsApp Dispatch Card */}
            <Card
              sx={{
                borderRadius: '16px',
                border: '1px solid rgba(5, 150, 105, 0.25)',
                bgcolor: 'var(--sr-surface, #FFFFFF)',
                boxShadow: '0 8px 24px rgba(5, 150, 105, 0.06)',
                p: 1
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <Box sx={{ p: 1, borderRadius: '10px', bgcolor: 'rgba(5, 150, 105, 0.12)', color: 'var(--sr-emerald)', display: 'flex' }}>
                    <WhatsAppIcon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'var(--sr-text, #0B1120)' }}>
                      Direct WhatsApp Dispatch
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Average response time: &lt; 5 minutes
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Chat directly with our dispatch supervisors for urgent reservations, flight delays, or outstation driver arrangements.
                </Typography>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<WhatsAppIcon />}
                  href="https://wa.me/923000000000?text=Assalam%20o%20Alaikum,%20I%20have%20an%20inquiry%20regarding%20SafarRent%20booking"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    bgcolor: '#107487',
                    '&:hover': { bgcolor: '#047857' },
                    fontWeight: 700,
                    textTransform: 'none',
                    borderRadius: '8px',
                    py: 1
                  }}
                >
                  Start WhatsApp Chat
                </Button>
              </CardContent>
            </Card>

            {/* Helpline & Corridors Info */}
            <Card
              sx={{
                borderRadius: '16px',
                border: '1px solid var(--sr-border, #E2E8F0)',
                bgcolor: 'var(--sr-surface, #FFFFFF)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                p: 1
              }}
            >
              <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <PhoneIcon sx={{ color: 'var(--sr-emerald)', mt: 0.3, fontSize: 20 }} />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      24/7 Roadside Assistance
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'var(--sr-font-mono, monospace)', fontWeight: 600 }}>
                      +92 51 111 723 277 (SAFAR)
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ borderColor: 'var(--sr-border, #E2E8F0)' }} />

                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <EmailIcon sx={{ color: 'var(--sr-emerald)', mt: 0.3, fontSize: 20 }} />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Escrow & Support Desk
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      support@safarrent.pk
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ borderColor: 'var(--sr-border, #E2E8F0)' }} />

                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <LocationIcon sx={{ color: 'var(--sr-emerald)', mt: 0.3, fontSize: 20 }} />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Corporate Hub Headquarters
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2 }}>
                      Executive Offices, Jinnah Avenue, Blue Area, Islamabad
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Right Column: Contact Inquiry Form */}
          <Box>
            <ContactForm user={user} className="form" />
          </Box>
        </Box>
      </Box>

      <Footer />
    </Layout>
  )
}

export default Contact
