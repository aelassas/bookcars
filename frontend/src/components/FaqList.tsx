import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Typography,
  Box,
  TextField,
  Chip,
  InputAdornment
} from '@mui/material'
import {
  ExpandMore,
  Search as SearchIcon,
  HelpOutline as HelpIcon,
  Security as EscrowIcon,
  VerifiedUser as KycIcon,
  Terrain as RouteIcon,
  LocalGasStation as FuelIcon
} from '@mui/icons-material'
import { strings } from '@/lang/faq-list'

import '@/assets/css/faq-list.css'

interface FaqItem {
  id: string
  category: 'escrow' | 'kyc' | 'routes' | 'policy'
  question: string
  answer: string
}

const FAQS: FaqItem[] = [
  {
    id: 'escrow',
    category: 'escrow',
    question: 'Are JazzCash, Easypaisa, or Raast payments live?',
    answer: 'No. Payment options in this FYP build are simulated for demonstration. They do not contact a payment provider, move money, or hold funds in escrow. Live payment processing requires an approved merchant account and gateway integration.'
  },
  {
    id: 'kyc',
    category: 'kyc',
    question: 'What documents are required for CNIC KYC verification?',
    answer: 'To enable self-drive, you need to provide your 13-digit Pakistani CNIC number (XXXXX-XXXXXXX-X) and an official, unexpired Driving License. For chauffeur-driven rentals, only your primary CNIC and contact phone number are required.'
  },
  {
    id: 'chauffeur-license',
    category: 'kyc',
    question: 'Do I need a driving license for chauffeur-driven rentals?',
    answer: 'A driving licence is not required for a With Driver booking in this demo. Confirm the driver and service details with the supplier before a real rental.'
  },
  {
    id: 'routes',
    category: 'routes',
    question: 'Can I take vehicles to Murree, Nathia Gali, or Northern areas?',
    answer: 'Route access depends on the vehicle, weather, and supplier policy. This demo does not independently inspect or certify vehicles for northern routes; confirm suitability with the supplier before travel.'
  },
  {
    id: 'mileage',
    category: 'policy',
    question: 'What is the standard daily kilometer limit and fuel policy?',
    answer: 'Most fleet listings include 250 km/day. Excess kilometers are billed transparently at Rs 15–25/km depending on vehicle engine capacity. Fuel is operated on a "Full-to-Full" or "Same-to-Same" policy verified during the 6-point digital handover checklist.'
  },
  {
    id: 'cancellation',
    category: 'escrow',
    question: 'What is the cancellation and refund policy?',
    answer: 'This demo does not collect or refund real payments. Check the booking terms supplied by the rental provider before confirming any real-world reservation.'
  }
]

const FaqList = () => {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [expanded, setExpanded] = useState<string | false>('escrow')

  const filteredFaqs = FAQS.filter((faq) => {
    const matchesKeyword = faq.question.toLowerCase().includes(keyword.toLowerCase()) ||
      faq.answer.toLowerCase().includes(keyword.toLowerCase())
    const matchesCategory = category === 'all' || faq.category === category
    return matchesKeyword && matchesCategory
  })

  return (
    <Box sx={{ maxWidth: 900, width: '100%', minWidth: 0, mx: 'auto', px: { xs: 2, sm: 3 }, py: 4 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '14px',
            bgcolor: 'rgba(5, 150, 105, 0.1)',
            color: 'var(--sr-emerald)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 1.5
          }}
        >
          <HelpIcon sx={{ fontSize: 26 }} />
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--sr-text, #0B1120)', letterSpacing: '-0.02em', mb: 1 }}>
          {strings.FAQ_TITLE}
        </Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', fontSize: 14 }}>
          Everything you need to know about escrow locks, CNIC verification, self-drive handover, and northern route clearance.
        </Typography>
      </Box>

      {/* Search Input */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search questions, escrow, CNIC, Murree tours..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'var(--sr-emerald)' }} />
              </InputAdornment>
            ),
            sx: {
              borderRadius: '12px',
              bgcolor: 'var(--sr-surface, #FFFFFF)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }
          }}
        />
      </Box>

      {/* Category Filter Pills */}
      <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1, mb: 3 }}>
        <Chip
          label="All Questions"
          onClick={() => setCategory('all')}
          variant={category === 'all' ? 'filled' : 'outlined'}
          sx={{
            fontWeight: 700,
            cursor: 'pointer',
            bgcolor: category === 'all' ? '#107487' : 'transparent',
            color: category === 'all' ? '#FFFFFF' : 'var(--sr-text)',
            borderColor: category === 'all' ? '#107487' : 'var(--sr-border)'
          }}
        />
        <Chip
          icon={<EscrowIcon fontSize="small" />}
          label="Escrow & Payments"
          onClick={() => setCategory('escrow')}
          variant={category === 'escrow' ? 'filled' : 'outlined'}
          sx={{
            fontWeight: 700,
            cursor: 'pointer',
            bgcolor: category === 'escrow' ? '#107487' : 'transparent',
            color: category === 'escrow' ? '#FFFFFF' : 'var(--sr-text)',
            borderColor: category === 'escrow' ? '#107487' : 'var(--sr-border)'
          }}
        />
        <Chip
          icon={<KycIcon fontSize="small" />}
          label="KYC & Licensing"
          onClick={() => setCategory('kyc')}
          variant={category === 'kyc' ? 'filled' : 'outlined'}
          sx={{
            fontWeight: 700,
            cursor: 'pointer',
            bgcolor: category === 'kyc' ? '#107487' : 'transparent',
            color: category === 'kyc' ? '#FFFFFF' : 'var(--sr-text)',
            borderColor: category === 'kyc' ? '#107487' : 'var(--sr-border)'
          }}
        />
        <Chip
          icon={<RouteIcon fontSize="small" />}
          label="Northern Routes"
          onClick={() => setCategory('routes')}
          variant={category === 'routes' ? 'filled' : 'outlined'}
          sx={{
            fontWeight: 700,
            cursor: 'pointer',
            bgcolor: category === 'routes' ? '#107487' : 'transparent',
            color: category === 'routes' ? '#FFFFFF' : 'var(--sr-text)',
            borderColor: category === 'routes' ? '#107487' : 'var(--sr-border)'
          }}
        />
        <Chip
          icon={<FuelIcon fontSize="small" />}
          label="Fuel & Limits"
          onClick={() => setCategory('policy')}
          variant={category === 'policy' ? 'filled' : 'outlined'}
          sx={{
            fontWeight: 700,
            cursor: 'pointer',
            bgcolor: category === 'policy' ? '#107487' : 'transparent',
            color: category === 'policy' ? '#FFFFFF' : 'var(--sr-text)',
            borderColor: category === 'policy' ? '#107487' : 'var(--sr-border)'
          }}
        />
      </Box>

      {/* Accordion Questions */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 4 }}>
        {filteredFaqs.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', bgcolor: 'rgba(0,0,0,0.02)', borderRadius: '12px' }}>
            <Typography color="text.secondary">No answers found matching &quot;{keyword}&quot;. Contact our 24/7 team below.</Typography>
          </Box>
        ) : (
          filteredFaqs.map((faq) => (
            <Accordion
              key={faq.id}
              expanded={expanded === faq.id}
              onChange={(_, isExp) => setExpanded(isExp ? faq.id : false)}
              sx={{
                borderRadius: '12px !important',
                border: '1px solid var(--sr-border, #E2E8F0)',
                bgcolor: 'var(--sr-surface, #FFFFFF)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                '&:before': { display: 'none' }
              }}
            >
              <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'var(--sr-emerald)' }} />}>
                <Typography component="span" sx={{ fontWeight: 700, fontSize: '15px', color: 'var(--sr-text, #0B1120)' }}>
                  {faq.question}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0, pb: 2.5, px: 2.5, color: 'text.secondary', fontSize: '14px', lineHeight: 1.7 }}>
                {faq.answer}
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </Box>

      {/* Contact Prompt Footer */}
      <Box
        sx={{
          p: 3,
          borderRadius: '16px',
          bgcolor: 'rgba(5, 150, 105, 0.06)',
          border: '1px solid rgba(5, 150, 105, 0.2)',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2
        }}
      >
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'var(--sr-text, #0B1120)' }}>
            Still have questions about your trip?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Our 24/7 WhatsApp dispatch team is ready to help with itinerary planning and supplier coordination.
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={() => navigate('/contact')}
          sx={{
            bgcolor: '#107487',
            '&:hover': { bgcolor: '#047857' },
            fontWeight: 700,
            textTransform: 'none',
            borderRadius: '8px',
            whiteSpace: 'nowrap',
            px: 3
          }}
        >
          Contact Support
        </Button>
      </Box>
    </Box>
  )
}

export default FaqList
