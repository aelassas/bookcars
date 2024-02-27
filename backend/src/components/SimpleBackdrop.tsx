import React from 'react'
import {
  Backdrop,
  CircularProgress,
  Typography
} from '@mui/material'

interface SimpleBackdropProps {
  progress?: boolean
  text?: string
}

const SimpleBackdrop = ({ progress, text }: SimpleBackdropProps) => (
  <div>
    <Backdrop open sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      {progress && <CircularProgress color="inherit" sx={{ marginRight: 5 }} />}
      <Typography color="inherit">{text}</Typography>
    </Backdrop>
  </div>
  )

export default SimpleBackdrop
