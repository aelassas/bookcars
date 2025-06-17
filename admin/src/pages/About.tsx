import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@mui/material'
import { strings } from '@/lang/about'
import Layout from '@/components/Layout'

import '@/assets/css/about.css'

const About = () => {
  const navigate = useNavigate()

  const onLoad = () => { }

  return (
    <Layout onLoad={onLoad} strict>
      <div className="about">
        <h1>{strings.TITLE1}</h1>
        <h2>{strings.SUBTITLE1}</h2>
        <p>{strings.CONTENT1}</p>

        <h1>{strings.TITLE2}</h1>
        <h2>{strings.SUBTITLE2}</h2>
        <p>{strings.CONTENT2}</p>

        <Button
          variant="contained"
          className="btn-primary"
          aria-label="Find deal"
          onClick={() => navigate('/pricing')}
        >
          {strings.PRICING}
        </Button>
      </div>

    </Layout>
  )
}

export default About
