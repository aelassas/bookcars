import React from 'react'
import { Paper } from '@mui/material'
import { strings } from '@/lang/pricing'
import Layout from '@/components/Layout'

import '@/assets/css/pricing.css'

const Pricing = () => {
  const onLoad = () => { }

  return (
    <Layout onLoad={onLoad} strict>
      <div className="pricing">
        <h1 className="pricing-title">{strings.TITLE}</h1>

        <div className="pricing-plans">
          <Paper className="pricing-plan pricing-plan-wrapper" elevation={10}>
            <h2 className="pricing-plan-title">{strings.FREE_PLAN}</h2>
            <p className="pricing-plan-price">{strings.FREE_PLAN_PRICE}</p>
            <ul className="pricing-plan-features">
              <li>{strings.FEATURE_1}</li>
              <li>{strings.FEATURE_2}</li>
            </ul>
          </Paper>

          <Paper className="pricing-plan pricing-plan-wrapper" elevation={10}>
            <h2 className="pricing-plan-title">{strings.BASIC_PLAN}</h2>
            <p className="pricing-plan-price">{strings.BASIC_PLAN_PRICE}</p>
            <ul className="pricing-plan-features">
              <li>{strings.FEATURE_1}</li>
              <li>{strings.FEATURE_3}</li>
              <li>{strings.FEATURE_4}</li>
            </ul>
          </Paper>

          <Paper className="pricing-plan pricing-plan-wrapper" elevation={10}>
            <h2 className="pricing-plan-title">{strings.PREMIUM_PLAN}</h2>
            <p className="pricing-plan-price">{strings.CONTACT_US}</p>
            <ul className="pricing-plan-features">
              <li>{strings.FEATURE_1}</li>
              <li>{strings.FEATURE_5}</li>
              <li>{strings.FEATURE_4}</li>
            </ul>
          </Paper>

        </div>
      </div>
    </Layout>
  )
}

export default Pricing
