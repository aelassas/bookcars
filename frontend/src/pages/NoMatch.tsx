import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@mui/material'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/no-match'
import Layout from '@/components/Layout'

interface NoMatchProps {
  hideHeader?: boolean
}

const NoMatch = ({ hideHeader }: NoMatchProps) => {
  const navigate = useNavigate()

  const noMatch = () => (
    <div className="msg">
      <h2>{strings.NO_MATCH}</h2>
      <p>
        <Button variant="text" onClick={() => navigate('/')} className="btn-lnk">{commonStrings.GO_TO_HOME}</Button>
      </p>
    </div>
  )

  return hideHeader ? noMatch() : <Layout strict={false}>{noMatch()}</Layout>
}

export default NoMatch
