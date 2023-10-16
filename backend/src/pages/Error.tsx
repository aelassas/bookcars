import React from 'react'
import { Link } from '@mui/material'
import { strings as commonStrings } from '../lang/common'

interface ErrorProps {
  style?: React.CSSProperties
}

function Error({ style }: ErrorProps) {
  return (
    <div className="msg" style={style || {}}>
      <h2>{commonStrings.GENERIC_ERROR}</h2>
      <Link href="/">{commonStrings.GO_TO_HOME}</Link>
    </div>
  )
}

export default Error
