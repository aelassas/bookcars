import React from 'react'
import { Link } from '@mui/material'
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
}: InfoProps) => (
  <div style={style || {}} className={`${className ? `${className} ` : ''}msg`}>
    <p>{message}</p>
    {!hideLink && <Link href="/">{commonStrings.GO_TO_HOME}</Link>}
  </div>
)

export default Info
