import React from 'react'
import { CircularProgress } from '@mui/material'

import '@/assets/css/progress.css'

interface ProgressProps {
  color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' | 'inherit'
}

const Progress = ({ color }: ProgressProps) => (
  <div className="progress">
    <CircularProgress color={color || 'inherit'} size={24} />
  </div>
)

export default Progress
