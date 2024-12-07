import React from 'react'
import { Accordion, AccordionDetails, AccordionSummary, Button } from '@mui/material'
import { ExpandMore } from '@mui/icons-material'
import { strings } from '@/lang/faq-list'

import '@/assets/css/faq-list.css'

const Faq = () => (
  <div className="faq-list">
    <h2>{strings.FAQ_TITLE}</h2>
    <div className="questions">
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />} className="accordion-title">{strings.FAQ_DOCUMENTS_TITLE}</AccordionSummary>
        <AccordionDetails className="accordion-details">{strings.FAQ_DOCUMENTS_TEXT}</AccordionDetails>
      </Accordion>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />} className="accordion-title">{strings.FAQ_SERVICES_TITLE}</AccordionSummary>
        <AccordionDetails className="accordion-details">{strings.FAQ_SERVICES_TEXT}</AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />} className="accordion-title">{strings.FAQ_AGE_TITLE}</AccordionSummary>
        <AccordionDetails className="accordion-details">{strings.FAQ_AGE_TEXT}</AccordionDetails>
      </Accordion>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />} className="accordion-title">{strings.FAQ_CANCEL_TITLE}</AccordionSummary>
        <AccordionDetails className="accordion-details">{strings.FAQ_CANCEL_TEXT}</AccordionDetails>
      </Accordion>
    </div>
    <Button
      variant="contained"
      className="btn-primary btn-home"
      href="/contact"
    >
      {strings.MORE_QUESTIONS}
    </Button>
  </div>
)

export default Faq
