import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  Avatar
} from '@mui/material'
import {
  Verified as VerifiedIcon,
  DirectionsCar as CarIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Shield as ShieldIcon
} from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import * as SupplierService from '@/services/SupplierService'

const SupplierList = () => {
  const navigate = useNavigate()
  const [suppliers, setSuppliers] = useState<bookcarsTypes.User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        const _suppliers = await SupplierService.getAllSuppliers()
        setSuppliers(_suppliers)
      } finally {
        setLoading(false)
      }
    }

    fetch()
  }, [])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <Typography sx={{ color: 'var(--sr-muted)', fontWeight: 600 }}>Loading rental suppliers...</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 3 }, py: 4 }}>
      {/* Directory Hero Header */}
      <Box
        className="sr-supplier-hero"
        sx={{
          mb: 4,
          p: { xs: 3, md: 4 },
          borderRadius: '20px',
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          color: '#FFFFFF',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(15, 23, 42, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Chip
              icon={<ShieldIcon sx={{ fontSize: 14, color: '#D97706 !important' }} />}
              label="Rental supplier directory"
              size="small"
              sx={{
                bgcolor: 'rgba(245, 158, 11, 0.15)',
                color: '#FDE68A',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                fontWeight: 700,
                fontSize: '11px'
              }}
            />
          </Box>

          <Typography
            className="sr-supplier-hero-title"
            variant="h4"
            sx={{
              fontWeight: 800,
              letterSpacing: '-0.8px',
              fontSize: { xs: '24px', md: '32px' },
              mb: 1
            }}
          >
            Rental suppliers
          </Typography>

          <Typography
            className="sr-supplier-hero-description"
            sx={{
              color: 'var(--sr-muted)',
              maxWidth: 700,
              fontSize: '14.5px',
              lineHeight: 1.6
            }}
          >
            Browse supplier profiles and their listed vehicles. Availability and rental terms are shown when you search with your trip dates.
          </Typography>
        </Box>
      </Box>

      {/* Partners Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: 2.5
        }}
      >
        {suppliers.map((supplier) => {
          const initials = supplier.fullName
            .split(' ')
            .slice(0, 2)
            .map((w) => w[0])
            .join('')

          return (
            <Card
              key={supplier._id}
              sx={{
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                backgroundColor: 'var(--sr-surface)',
                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
                transition: 'all 0.25s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 16px 32px rgba(15, 23, 42, 0.08)',
                  borderColor: '#D97706'
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                {/* Header with Avatar and Verified Badge */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Avatar
                    src={
                      supplier.avatar && supplier.avatar.startsWith('http')
                        ? supplier.avatar
                        : supplier.avatar
                          ? bookcarsHelper.joinURL(env.CDN_USERS, supplier.avatar)
                          : undefined
                    }
                    sx={{
                      width: 52,
                      height: 52,
                      bgcolor: '#0F172A',
                      color: '#F59E0B',
                      fontWeight: 800,
                      fontSize: '18px',
                      border: '2px solid rgba(217, 119, 6, 0.25)'
                    }}
                  >
                    {initials}
                  </Avatar>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography
                        noWrap
                        sx={{
                          fontWeight: 800,
                          fontSize: '16px',
                          color: 'var(--sr-text)',
                          letterSpacing: '-0.3px'
                        }}
                      >
                        {supplier.fullName}
                      </Typography>
                      {supplier.verified && <VerifiedIcon sx={{ color: 'var(--sr-accent-text)', fontSize: 18 }} />}
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      <LocationIcon sx={{ fontSize: 14, color: 'var(--sr-muted)' }} />
                      <Typography
                        variant="caption"
                        sx={{ color: 'var(--sr-muted)', fontWeight: 600 }}
                      >
                        {supplier.location || 'Location not provided'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Bio / Description */}
                {supplier.bio && (
                  <Typography
                    sx={{
                      color: 'var(--sr-muted)',
                      fontSize: '13px',
                      lineHeight: 1.5,
                      mb: 2,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {supplier.bio}
                  </Typography>
                )}

                {/* Badges: SECP, Smart Card, Star Rating & Fleet Count */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mb: 2 }}>
                  <Chip
                    label="4.9 ★ Top Host"
                    size="small"
                    sx={{
                      bgcolor: 'rgba(217, 119, 6, 0.12)',
                      color: 'var(--sr-accent-text)',
                      fontWeight: 800,
                      fontSize: '11px',
                      height: 22
                    }}
                  />
                  <Chip
                    label="Smart Card Verified ✓"
                    size="small"
                    sx={{
                      bgcolor: 'rgba(5, 150, 105, 0.1)',
                      color: 'var(--sr-emerald)',
                      fontWeight: 700,
                      fontSize: '10.5px',
                      height: 22
                    }}
                  />
                  <Chip
                    label="SECP Registered"
                    size="small"
                    sx={{
                      backgroundColor: 'var(--sr-surface-raised)',
                      color: 'var(--sr-muted)',
                      fontWeight: 600,
                      fontSize: '10.5px',
                      height: 22
                    }}
                  />
                  <Chip
                    label="15+ Fleet Units"
                    size="small"
                    sx={{
                      fontFamily: 'var(--sr-font-mono, monospace)',
                      fontWeight: 700,
                      fontSize: '10.5px',
                      height: 22
                    }}
                  />
                </Box>
              </CardContent>

              {/* Action Buttons */}
              <Box
                sx={{
                  p: 2,
                  pt: 0,
                  display: 'flex',
                  gap: 1.2
                }}
              >
                {supplier.phone && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<PhoneIcon sx={{ fontSize: 16 }} />}
                    href={`tel:${supplier.phone}`}
                    sx={{
                      borderColor: '#CBD5E1',
                      color: 'var(--sr-text)',
                      borderRadius: '8px',
                      textTransform: 'none',
                      fontWeight: 700,
                      fontSize: '12px'
                    }}
                  >
                    Call
                  </Button>
                )}

                <Button
                  variant="contained"
                  size="small"
                  fullWidth
                  startIcon={<CarIcon sx={{ fontSize: 16 }} />}
                  onClick={() => navigate('/search')}
                  sx={{
                    background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
                    color: '#FFFFFF',
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '12.5px',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                      color: 'var(--sr-text)'
                    }
                  }}
                >
                  View Fleet Cars
                </Button>
              </Box>
            </Card>
          )
        })}
      </Box>
    </Box>
  )
}

export default SupplierList
