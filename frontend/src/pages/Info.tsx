import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Typography, Paper } from '@mui/material'
import { InfoOutlined as InfoIcon, Home as HomeIcon } from '@mui/icons-material'
import { strings as commonStrings } from '@/lang/common'

interface InfoProps {
  className?: string
  message: string
  hideLink?: boolean
  style?: React.CSSProperties
}

const Info = ({
  className,
  message,
  hideLink,
  style
}: InfoProps) => {
  const navigate = useNavigate()

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        px: 2,
        ...style
      }}
      className={className}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 480,
          width: '100%',
          textAlign: 'center',
          p: 3.5,
          borderRadius: '16px',
          border: '1px solid var(--sr-border, #E2E8F0)',
          bgcolor: 'var(--sr-surface, #FFFFFF)',
          boxShadow: '0 8px 24px rgba(11, 17, 32, 0.04)'
        }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '12px',
            bgcolor: 'rgba(5, 150, 105, 0.1)',
            color: 'var(--sr-emerald)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 1.5
          }}
        >
          <InfoIcon />
        </Box>
        <Typography variant="body1" sx={{ color: 'var(--sr-text, #334155)', mb: hideLink ? 0 : 2.5, fontWeight: 500, lineHeight: 1.6 }}>
          {message}
        </Typography>
        {!hideLink && (
          <Button
            variant="contained"
            startIcon={<HomeIcon />}
            onClick={() => navigate('/')}
            sx={{
              bgcolor: '#107487',
              '&:hover': { bgcolor: '#047857' },
              fontWeight: 700,
              fontSize: 13,
              textTransform: 'none',
              borderRadius: '8px',
              py: 0.8,
              px: 2.5
            }}
          >
            {commonStrings.GO_TO_HOME}
          </Button>
        )}
      </Paper>
    </Box>
  )
}

export default Info
