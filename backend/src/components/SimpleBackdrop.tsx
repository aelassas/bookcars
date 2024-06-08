import React from 'react'
import {
  Backdrop,
  CircularProgress,
  Typography
} from '@mui/material'
import env from '../config/env.config'

interface SimpleBackdropProps {
  progress?: boolean
  text?: string
}

const SimpleBackdrop = ({ progress, text }: SimpleBackdropProps) => (
  <div>
    <Backdrop
      open
      sx={{
        color: '#fff',
        zIndex: 1402,
        height: window.innerHeight,
        marginTop: `${document.documentElement.scrollHeight - (window.innerHeight + (env.isMobile() ? 56 : 64))}px`
      }}
    >
      {progress && <CircularProgress color="inherit" sx={{ marginRight: 5 }} />}
      <Typography color="inherit">{text}</Typography>
    </Backdrop>
  </div>
)

export default SimpleBackdrop
