import React from 'react'

import '../assets/css/badge.css'

interface BadgeProps {
  backgroundColor: string
  color: string
  text: string
}

const Badge = ({ backgroundColor, color, text }: BadgeProps) => (
  <div className="badge" style={{ backgroundColor, color }}>{text}</div>
)

export default Badge
