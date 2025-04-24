import React, { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@mui/material'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/unauthorized'

interface UnauthorizedProps {
  style?: CSSProperties
}

const Unauthorized = ({ style }: UnauthorizedProps) => {
  const navigate = useNavigate()

  return (
    <div className="msg" style={style || {}}>
      <h2>{strings.UNAUTHORIZED}</h2>
      <p>
        <Button variant="text" onClick={() => navigate('/')} className="btn-lnk">{commonStrings.GO_TO_HOME}</Button>
      </p>
    </div>
  )
}

export default Unauthorized
