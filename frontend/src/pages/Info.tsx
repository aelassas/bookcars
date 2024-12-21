import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@mui/material'
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
}: InfoProps) => {
  const navigate = useNavigate()

  return (
    <div style={style || {}} className={`${className ? `${className} ` : ''}msg`}>
      <p>{message}</p>
      {!hideLink && <Button variant="text" onClick={() => navigate('/')} className="btn-lnk">{commonStrings.GO_TO_HOME}</Button>}
    </div>
  )
}

export default Info
