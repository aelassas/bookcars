import React from 'react'
import { Link } from 'react-router-dom'
import { IconButton } from '@mui/material'
import {
  MailOutline,
  FacebookTwoTone as FacebookIcon,
  X,
  LinkedIn,
  Instagram,
} from '@mui/icons-material'
import { strings } from '@/lang/footer'
import NewsletterForm from '@/components/NewsletterForm'
import SafarRentLogo from '@/components/SafarRentLogo'
import env from '@/config/env.config'

import '@/assets/css/footer.css'

const Footer = () => {
  return (
    <div className="footer">
      <div className="header" style={{ marginBottom: '18px' }}>
        <SafarRentLogo variant="light" size="medium" showBadge={false} />
      </div>

      <section className="main">
        <div className="main-section">
          <div className="title">{strings.CORPORATE}</div>
          <ul className="links">
            <li><Link to="/about">{strings.ABOUT}</Link></li>
            <li><Link to="/cookie-policy">{strings.COOKIE_POLICY}</Link></li>
            <li><Link to="/privacy">{strings.PRIVACY_POLICY}</Link></li>
            <li><Link to="/tos">{strings.TOS}</Link></li>
          </ul>
        </div>
        <div className="main-section">
          <div className="title">{strings.RENT}</div>
          <ul className="links">
            {!env.HIDE_SUPPLIERS && <li><Link to="/suppliers">{strings.SUPPLIERS}</Link></li>}
            <li><Link to="/locations">{strings.LOCATIONS}</Link></li>
          </ul>
        </div>
        <div className="main-section">
          <div className="title">{strings.SUPPORT}</div>
          <ul className="links">
            <li><Link to="/contact">{strings.CONTACT}</Link></li>
            <li><Link to="/faq">{strings.FAQ}</Link></li>
          </ul>
          <div className="footer-contact">
            <MailOutline className="icon" />
            <a href={`mailto:${env.CONTACT_EMAIL}`}>{env.CONTACT_EMAIL}</a>
          </div>
          <div className="footer-contact">
            <IconButton href="https://www.facebook.com/" target="_blank" aria-label="Facebook" className="social-icon"><FacebookIcon /></IconButton>
            <IconButton href="https://x.com/" target="_blank" aria-label="X" className="social-icon"><X /></IconButton>
            <IconButton href="https://www.linkedin.com/" target="_blank" aria-label="LinkedIn" className="social-icon"><LinkedIn /></IconButton>
            <IconButton href="https://www.instagram.com/" target="_blank" aria-label="Instagram" className="social-icon"><Instagram /></IconButton>
          </div>
          <div className="newsletter">
            <NewsletterForm />
          </div>
        </div>
      </section>

      {/* Active payment provider configured for this deployment */}
      <section className="payment" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px', paddingBottom: '20px' }}>
        <div className="footer-payments"><span>{env.FYP_DEMO_MODE ? 'Demo payment options' : 'Payment options'}</span><div><span>JazzCash</span><span>Easypaisa</span><span>Raast</span><span>Debit / Credit card</span></div></div>
      </section>

      <section className="copyright">
        <div className="copyright" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '10px' }}>
          <span>Copyright &copy; {new Date().getFullYear()} SafarRent Pakistan. {strings.COPYRIGHT_PART2}</span>
          <span style={{ color: '#D4AF37', fontWeight: 600 }}>Vehicle rentals, with the details made clear.</span>
        </div>
      </section>
    </div>
  )
}
export default Footer
