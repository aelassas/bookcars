import React, { useState } from 'react'
import { Box, Typography, Paper } from '@mui/material'
import {
  Lock as LockIcon,
  CheckCircle as CheckCircleIcon,
  AccountBalance as RaastIcon,
  CreditCard as CardIcon,
  PhoneIphone as MobileWalletIcon
} from '@mui/icons-material'

interface PaymentMethodTile {
  id: string
  name: string
  type: string
  color: string
  badgeText: string
  description: string
}

const paymentTiles: PaymentMethodTile[] = [
  {
    id: 'jazzcash',
    name: 'JazzCash',
    type: 'Mobile Wallet / QR',
    color: '#D90429',
    badgeText: 'INSTANT 20% ESCROW',
    description: 'Pay via JazzCash app or mobile account with zero blank cheque required'
  },
  {
    id: 'easypaisa',
    name: 'Easypaisa',
    type: 'Mobile Wallet / QR',
    color: '#00A859',
    badgeText: 'INSTANT 20% ESCROW',
    description: 'Simulated FYP checkout option; no funds are transferred or held'
  },
  {
    id: 'raast',
    name: 'Raast P2M / IBFT',
    type: 'State Bank of Pakistan Instant',
    color: 'var(--sr-emerald)',
    badgeText: '0% FEE TRANSFER',
    description: 'Instant bank transfer using SBP Raast QR code or IBAN'
  },
  {
    id: 'card',
    name: 'Debit / Credit Card',
    type: 'Visa • Mastercard • PayPak',
    color: 'var(--sr-text)',
    badgeText: 'SECURE 3D HOLD',
    description: 'Standard domestic & international cards with 3D Secure OTP'
  }
]

interface PakistanPaymentsProps {
  onSelectMethod?: (methodId: string) => void
  selectedMethod?: string
}

export const PakistanPayments: React.FC<PakistanPaymentsProps> = ({
  onSelectMethod,
  selectedMethod = 'jazzcash'
}) => {
  const [active, setActive] = useState(selectedMethod)

  const handleSelect = (id: string) => {
    setActive(id)
    if (onSelectMethod) {
      onSelectMethod(id)
    }
  }

  return (
    <Box sx={{ width: '100%', my: 2 }}>
      {/* Escrow Banner */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
          p: 2,
          mb: 2.5,
          borderRadius: 3,
          bgcolor: 'var(--sr-surface-raised)',
          border: '1px solid rgba(5, 150, 105, 0.3)'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              bgcolor: 'var(--sr-emerald)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <LockIcon sx={{ fontSize: 18 }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: 14, color: 'var(--sr-emerald)', fontFamily: 'var(--sr-font-heading)' }}>
              SafarRent Pakistan Verified Escrow
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: 'var(--sr-emerald)' }}>
              Pay 20% Escrow Lock Now — 80% at Digital Handover
            </Typography>
          </Box>
        </Box>
        <Box
          sx={{
            px: 1.5,
            py: 0.5,
            bgcolor: 'var(--sr-surface)',
            borderRadius: 999,
            border: '1px solid #10B981',
            color: 'var(--sr-emerald)',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.04em',
            fontFamily: 'var(--sr-font-mono)'
          }}
        >
          ZERO BLANK CHEQUE
        </Box>
      </Box>

      {/* Payment Method Tiles Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
        {paymentTiles.map((tile) => {
          const isSelected = active === tile.id
          return (
            <Paper
              key={tile.id}
              elevation={0}
              onClick={() => handleSelect(tile.id)}
              sx={{
                p: 2,
                cursor: 'pointer',
                borderRadius: 3,
                border: isSelected ? '2px solid #059669' : '1px solid var(--sr-border)',
                bgcolor: isSelected ? 'rgba(5, 150, 105, 0.04)' : 'var(--sr-surface)',
                transition: 'all 0.2s ease',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                '&:hover': {
                  borderColor: '#059669',
                  boxShadow: '0 4px 14px rgba(5, 150, 105, 0.12)'
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {tile.id === 'card' ? (
                    <CardIcon sx={{ color: tile.color, fontSize: 22 }} />
                  ) : tile.id === 'raast' ? (
                    <RaastIcon sx={{ color: tile.color, fontSize: 22 }} />
                  ) : (
                    <MobileWalletIcon sx={{ color: tile.color, fontSize: 22 }} />
                  )}
                  <Typography sx={{ fontWeight: 800, fontSize: 15, color: 'var(--sr-text)', fontFamily: 'var(--sr-font-heading)' }}>
                    {tile.name}
                  </Typography>
                </Box>
                {isSelected ? (
                  <CheckCircleIcon sx={{ color: 'var(--sr-emerald)', fontSize: 20 }} />
                ) : (
                  <Box sx={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--sr-border)' }} />
                )}
              </Box>

              <Typography sx={{ fontSize: 11, color: 'var(--sr-muted)' }}>
                {tile.description}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
                <Typography sx={{ fontSize: 10.5, fontWeight: 600, color: 'var(--sr-muted)' }}>
                  {tile.type}
                </Typography>
                <Box
                  sx={{
                    fontSize: 9.5,
                    fontWeight: 800,
                    color: 'var(--sr-emerald)',
                    bgcolor: 'var(--sr-surface-raised)',
                    px: 1,
                    py: 0.25,
                    borderRadius: 1,
                    fontFamily: 'var(--sr-font-mono)'
                  }}
                >
                  {tile.badgeText}
                </Box>
              </Box>
            </Paper>
          )
        })}
      </Box>
    </Box>
  )
}

export default PakistanPayments
