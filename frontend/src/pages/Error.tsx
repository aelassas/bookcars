import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Typography, Paper, Chip } from '@mui/material'
import {
  WarningAmber as WarningIcon,
  Search as SearchIcon,
  Home as HomeIcon
} from '@mui/icons-material'
import { strings as commonStrings } from '@/lang/common'

interface ErrorProps {
  style?: React.CSSProperties
}

const Error = ({ style }: ErrorProps) => {
  const navigate = useNavigate()

  return (
    <Box
      sx={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 6,
        px: 2,
        ...style
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 480,
          width: '100%',
          textAlign: 'center',
          p: { xs: 3, sm: 4.5 },
          borderRadius: '20px',
          border: '1px solid var(--sr-border, #E2E8F0)',
          bgcolor: 'var(--sr-surface, #FFFFFF)',
          boxShadow: '0 16px 36px rgba(11, 17, 32, 0.05)'
        }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '16px',
            bgcolor: 'rgba(220, 38, 38, 0.1)',
            color: '#DC2626',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2
          }}
        >
          <WarningIcon sx={{ fontSize: 34 }} />
        </Box>
        <Chip
          label="SERVICE NOTICE"
          size="small"
          sx={{
            display: 'block',
            width: 'fit-content',
            mx: 'auto',
            mb: 1.5,
            fontWeight: 800,
            fontSize: 10,
            letterSpacing: '0.08em',
            bgcolor: 'rgba(220, 38, 38, 0.12)',
            color: '#DC2626',
            fontFamily: 'var(--sr-font-mono, monospace)'
          }}
        />
        <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--sr-text, #0B1120)', mb: 1 }}>
          {commonStrings.GENERIC_ERROR}
        </Typography>
        <Typography color="text.secondary" sx={{ fontSize: 14, mb: 3.5, lineHeight: 1.6 }}>
          An unexpected interruption occurred while loading this corridor. Our fleet dispatch network is fully operational.
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
              py: 1,
              px: 2.5
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
              py: 1,
              px: 2.5
            }}
          >
            {commonStrings.GO_TO_HOME}
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}

export default Error
