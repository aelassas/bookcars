import React from 'react'
import { Box, Typography, Chip, Tooltip } from '@mui/material'
import {
  AccountBalanceWallet as WalletIcon,
  LocalAtm as CashIcon,
  AccountBalance as BankIcon,
  CreditCard as CardIcon,
  FlashOn as InstantIcon,
  VerifiedUser as ShieldIcon,
} from '@mui/icons-material'

interface PaymentBadgeProps {
  name: string
  subtitle: string
  color: string
  bg: string
  borderColor: string
  icon: React.ReactNode
  tag?: string
}

const PaymentBadge: React.FC<PaymentBadgeProps> = ({
  name,
  subtitle,
  color,
  bg,
  borderColor,
  icon,
  tag,
}) => (
  <Tooltip title={`${name} - ${subtitle}`} arrow placement="top">
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1.2,
        px: 1.8,
        py: 1,
        borderRadius: '12px',
        background: bg,
        border: `1.5px solid ${borderColor}`,
        color: color,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'default',
        position: 'relative',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
          borderColor: color,
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '13.5px', lineHeight: 1.2, color: color }}>
            {name}
          </Typography>
          {tag && (
            <Chip
              label={tag}
              size="small"
              sx={{
                height: '16px',
                fontSize: '9.5px',
                fontWeight: 700,
                backgroundColor: color,
                color: '#fff',
                px: 0.2,
              }}
            />
          )}
        </Box>
        <Typography sx={{ fontSize: '10.5px', opacity: 0.85, lineHeight: 1.1, color: '#475569', mt: '2px' }}>
          {subtitle}
        </Typography>
      </Box>
    </Box>
  </Tooltip>
)

export const PakistanPayments: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  return (
    <Box
      sx={{
        width: '100%',
        py: compact ? 1.5 : 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 2,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <ShieldIcon sx={{ color: '#059669', fontSize: 20 }} />
        <Typography
          sx={{
            fontSize: '13px',
            fontWeight: 700,
            color: '#0f172a',
            letterSpacing: '0.3px',
            textTransform: 'uppercase',
          }}
        >
          100% Secure Local Pakistan Payments & Cash on Pickup
        </Typography>
        <Chip
          icon={<InstantIcon sx={{ '&&': { color: '#059669', fontSize: 14 } }} />}
          label="Zero Transfer Fees"
          size="small"
          sx={{
            bgcolor: '#ecfdf5',
            color: '#065f46',
            fontWeight: 700,
            fontSize: '11px',
            border: '1px solid #a7f3d0',
          }}
        />
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.5,
          justifyContent: 'center',
          alignItems: 'center',
          maxWidth: '1100px',
        }}
      >
        {/* JazzCash */}
        <PaymentBadge
          name="JazzCash"
          subtitle="Mobile Wallet & QR"
          color="#dc2626"
          bg="#fef2f2"
          borderColor="#fecaca"
          tag="Popular"
          icon={
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '8px',
                bgcolor: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 900,
                fontSize: '11px',
              }}
            >
              JC
            </Box>
          }
        />

        {/* EasyPaisa */}
        <PaymentBadge
          name="EasyPaisa"
          subtitle="Instant Wallet / OTP"
          color="#059669"
          bg="#ecfdf5"
          borderColor="#a7f3d0"
          tag="Instant"
          icon={
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '8px',
                bgcolor: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 900,
                fontSize: '11px',
              }}
            >
              EP
            </Box>
          }
        />

        {/* Raast */}
        <PaymentBadge
          name="Raast SBP"
          subtitle="Direct State Bank Pay"
          color="#0284c7"
          bg="#f0f9ff"
          borderColor="#bae6fd"
          tag="Govt ID"
          icon={
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '8px',
                bgcolor: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 900,
                fontSize: '10px',
              }}
            >
              RAAST
            </Box>
          }
        />

        {/* SadaPay */}
        <PaymentBadge
          name="SadaPay"
          subtitle="Zero-Fee Number Pay"
          color="#0d9488"
          bg="#f0fdfa"
          borderColor="#99f6e4"
          icon={
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '8px',
                bgcolor: '#0d9488',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 900,
                fontSize: '11px',
              }}
            >
              SP
            </Box>
          }
        />

        {/* NayaPay */}
        <PaymentBadge
          name="NayaPay"
          subtitle="Visa Debit Wallet"
          color="#d97706"
          bg="#fffbeb"
          borderColor="#fde68a"
          icon={
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '8px',
                bgcolor: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 900,
                fontSize: '11px',
              }}
            >
              NP
            </Box>
          }
        />

        {/* Cash on Pickup / COD */}
        <PaymentBadge
          name="Pay on Pickup"
          subtitle="Cash to Chauffeur / Depot"
          color="#166534"
          bg="#f0fdf4"
          borderColor="#bbf7d0"
          tag="COD"
          icon={<CashIcon sx={{ color: '#166534', fontSize: 24 }} />}
        />

        {/* 1Link Bank Transfer */}
        <PaymentBadge
          name="1Link Interbank"
          subtitle="Meezan, HBL, Alfalah"
          color="#4338ca"
          bg="#eef2ff"
          borderColor="#c7d2fe"
          icon={<BankIcon sx={{ color: '#4338ca', fontSize: 24 }} />}
        />

        {/* Visa / Mastercard / PayPak */}
        <PaymentBadge
          name="Cards & PayPak"
          subtitle="Visa, Mastercard, PayPak"
          color="#334155"
          bg="#f8fafc"
          borderColor="#cbd5e1"
          icon={<CardIcon sx={{ color: '#334155', fontSize: 24 }} />}
        />
      </Box>
    </Box>
  )
}

export default PakistanPayments
