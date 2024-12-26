import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@mui/material'
import { strings as commonStrings } from '@/lang/common'

import '@/assets/css/error.css'

interface ErrorProps {
  message: string
  style?: React.CSSProperties
  homeLink?: boolean
}

const Error = ({ message, style, homeLink }: ErrorProps) => {
  const navigate = useNavigate()

  return (
    <div style={style || {}}>
      <div className="error">
        <span className="message">{message}</span>
      </div>
      {homeLink && (
        <p>
          <Button variant="text" onClick={() => navigate('/')} className="btn-lnk">{commonStrings.GO_TO_HOME}</Button>
        </p>
      )}
    </div>
  )
}

export default Error
