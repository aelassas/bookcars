import React from 'react'

import '@/assets/css/badge.css'

interface BadgeProps {
  backgroundColor: string
  color: string
  text: string
  className?: string
}

const Badge = ({
  backgroundColor,
  color,
  text,
  className,
}: BadgeProps) => (
  <div className={`badge ${className}`} style={{ backgroundColor, color }}>{text}</div>
)

export default Badge
