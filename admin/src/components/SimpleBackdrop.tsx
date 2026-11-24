import React from 'react'
import {
  Backdrop,
  CircularProgress,
  Typography
} from '@mui/material'
import env from '@/config/env.config'

interface SimpleBackdropProps {
  progress?: boolean
  text?: string
  disableMargin?: boolean
}

const marginTop = env.isMobile ? 56 : 64

const SimpleBackdrop = ({
  progress,
  text,
  disableMargin,
}: SimpleBackdropProps) => (
  <div>
    <Backdrop
      open
      sx={{
        color: '#fff',
        zIndex: 1402,
        // height: window.innerHeight,
        // marginTop: `${!disableMargin && document.documentElement.scrollTop > 0 ? (document.documentElement.scrollTop - marginTop) : 0}px`,
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
      }}
    >
      {progress && <CircularProgress color="inherit" sx={{ marginRight: 5 }} />}
      <Typography color="inherit">{text}</Typography>
    </Backdrop>
  </div>
)

export default SimpleBackdrop
