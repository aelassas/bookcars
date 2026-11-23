import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Typography, Paper, Chip } from '@mui/material'
import {
  ExploreOff as NoMatchIcon,
  Search as SearchIcon,
  Home as HomeIcon
} from '@mui/icons-material'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/no-match'
import Layout from '@/components/Layout'

interface NoMatchProps {
  hideHeader?: boolean
}

const NoMatch = ({ hideHeader }: NoMatchProps) => {
  const navigate = useNavigate()

  const renderContent = () => (
    <Box
      sx={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 6,
        px: 2
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 520,
          width: '100%',
          textAlign: 'center',
          p: { xs: 3, sm: 5 },
          borderRadius: '24px',
          border: '1px solid var(--sr-border, #E2E8F0)',
          bgcolor: 'var(--sr-surface, #FFFFFF)',
          boxShadow: '0 16px 36px rgba(11, 17, 32, 0.05)'
        }}
      >
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: '20px',
            bgcolor: 'rgba(5, 150, 105, 0.1)',
            color: 'var(--sr-emerald)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2.5
          }}
        >
          <NoMatchIcon sx={{ fontSize: 38 }} />
        </Box>
        <Chip
          label="404 • ROUTE UNREACHABLE"
          size="small"
          sx={{
            display: 'block',
            width: 'fit-content',
            mx: 'auto',
            mb: 1.5,
            fontWeight: 800,
            fontSize: 10,
            letterSpacing: '0.08em',
            bgcolor: 'var(--sr-emerald-soft)',
            color: 'var(--sr-emerald)',
            fontFamily: 'var(--sr-font-mono, monospace)'
          }}
        />
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--sr-text, #0B1120)', letterSpacing: '-0.02em', mb: 1.5 }}>
          {strings.NO_MATCH}
        </Typography>
        <Typography color="text.secondary" sx={{ fontSize: 14, mb: 4, lineHeight: 1.6 }}>
          The road you are looking for has taken a detour or does not exist. Return to active mobility hubs across Islamabad, Lahore, Sahiwal, and Murree.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, justifyContent: 'center' }}>
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={() => navigate('/search')}
            sx={{
              bgcolor: '#107487',
              '&:hover': { bgcolor: '#047857' },
              fontWeight: 700,
              fontSize: 13,
              textTransform: 'none',
              borderRadius: '10px',
              py: 1.2,
              px: 3
            }}
          >
            Back to Fleet Search
          </Button>
          <Button
            variant="outlined"
            startIcon={<HomeIcon />}
            onClick={() => navigate('/')}
            sx={{
              fontWeight: 700,
              fontSize: 13,
              textTransform: 'none',
              borderRadius: '10px',
              borderColor: 'var(--sr-border, #CBD5E1)',
              color: 'var(--sr-text, #334155)',
              py: 1.2,
              px: 3
            }}
          >
            {commonStrings.GO_TO_HOME}
          </Button>
        </Box>
      </Paper>
    </Box>
  )

  return hideHeader ? renderContent() : <Layout strict={false}>{renderContent()}</Layout>
}

export default NoMatch
