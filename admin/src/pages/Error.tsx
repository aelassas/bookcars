import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@mui/material'
import { strings as commonStrings } from '@/lang/common'

interface ErrorProps {
  style?: React.CSSProperties
}

const Error = ({ style }: ErrorProps) => {
  const navigate = useNavigate()

  return (
    <div className="msg" style={style || {}}>
      <h2>{commonStrings.GENERIC_ERROR}</h2>
      <Button variant="text" onClick={() => navigate('/')} className="btn-lnk">{commonStrings.GO_TO_HOME}</Button>
    </div>
  )
}

export default Error
