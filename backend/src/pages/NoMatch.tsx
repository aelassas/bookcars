import React from 'react'
import { Link } from '@mui/material'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/no-match'
import Layout from '@/components/Layout'

interface NoMatchProps {
  hideHeader?: boolean
}

const NoMatch = ({ hideHeader }: NoMatchProps) => {
  const noMatch = () => (
    <div className="msg">
      <h2>{strings.NO_MATCH}</h2>
      <p>
        <Link href="/">{commonStrings.GO_TO_HOME}</Link>
      </p>
    </div>
  )

  return hideHeader ? noMatch() : <Layout strict={false}>{noMatch()}</Layout>
}

export default NoMatch
