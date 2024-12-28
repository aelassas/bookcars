import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Accordion, AccordionDetails, AccordionSummary, Button, Typography } from '@mui/material'
import { ExpandMore } from '@mui/icons-material'
import { strings } from '@/lang/faq-list'

import '@/assets/css/faq-list.css'

const Faq = () => {
  const navigate = useNavigate()

  return (
    <div className="faq-list">
      <h2>{strings.FAQ_TITLE}</h2>
      <div className="questions">
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}><Typography component="span" className="accordion-title">{strings.FAQ_DOCUMENTS_TITLE}</Typography></AccordionSummary>
          <AccordionDetails className="accordion-details">{strings.FAQ_DOCUMENTS_TEXT}</AccordionDetails>
        </Accordion>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}><Typography component="span" className="accordion-title">{strings.FAQ_SERVICES_TITLE}</Typography></AccordionSummary>
          <AccordionDetails className="accordion-details">{strings.FAQ_SERVICES_TEXT}</AccordionDetails>
        </Accordion>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}><Typography component="span" className="accordion-title">{strings.FAQ_AGE_TITLE}</Typography></AccordionSummary>
          <AccordionDetails className="accordion-details">{strings.FAQ_AGE_TEXT}</AccordionDetails>
        </Accordion>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}><Typography component="span" className="accordion-title">{strings.FAQ_CANCEL_TITLE}</Typography></AccordionSummary>
          <AccordionDetails className="accordion-details">{strings.FAQ_CANCEL_TEXT}</AccordionDetails>
        </Accordion>
      </div>
      <Button
        variant="contained"
        className="btn-primary btn-home"
        onClick={() => navigate('/contact')}
      >
        {strings.MORE_QUESTIONS}
      </Button>
    </div>
  )
}

export default Faq
