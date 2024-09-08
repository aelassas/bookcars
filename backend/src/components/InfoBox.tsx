import React from 'react'
import { Info as InfoIcon } from '@mui/icons-material'

import '@/assets/css/info-box.css'

interface InfoBoxProps {
  className?: string
  value: string
}

const InfoBox = ({ className, value }: InfoBoxProps) => (
  <div className={`info-box${className ? ' ' : ''}${className || ''}`}>
    <InfoIcon className="info-box-icon" />
    <span className="info-box-text">{value}</span>
  </div>
  )

export default InfoBox
