import React from 'react'
import { Link } from '@mui/material'
import { strings as commonStrings } from '../lang/common'

function Info(
  {
    className,
    message,
    style
  }
    : {
      className?: string,
      message: string,
      style?: React.CSSProperties
    }
) {
  return (
    <div style={style} className={`${className ? `${className} ` : ''}msg`}>
      <p>{message}</p>
      <Link href="/">{commonStrings.GO_TO_HOME}</Link>
    </div>
  )
}

export default Info
