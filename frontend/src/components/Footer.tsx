import React from 'react'
import { useNavigate } from 'react-router-dom'
import { IconButton, Box, Typography } from '@mui/material'
import {
  MailOutline,
  FacebookTwoTone as FacebookIcon,
  X,
  LinkedIn,
  Instagram,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import { strings } from '@/lang/footer'
import NewsletterForm from '@/components/NewsletterForm'
import PakistanPayments from '@/components/PakistanPayments'
import env from '@/config/env.config'

import '@/assets/css/footer.css'

const Footer = () => {
  const navigate = useNavigate()

  return (
    <div className="footer">
      <div className="header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 8, background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#fff', fontWeight: 800, fontSize: 18 }}>
          S
        </span>
        <span style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
          Safar<span style={{ color: '#059669' }}>Rent</span>
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: 6, border: '1px solid #a7f3d0' }}>
          Pakistan Operations
        </span>
      </div>

      <section className="main">
        <div className="main-section">
          <div className="title">{strings.CORPORATE}</div>
          <ul className="links">
            <li onClick={() => navigate('/about')}>{strings.ABOUT}</li>
            <li onClick={() => navigate('/cookie-policy')}>{strings.COOKIE_POLICY}</li>
            <li onClick={() => navigate('/privacy')}>{strings.PRIVACY_POLICY}</li>
            <li onClick={() => navigate('/tos')}>{strings.TOS}</li>
          </ul>
        </div>
        <div className="main-section">
          <div className="title">{strings.RENT}</div>
          <ul className="links">
            {!env.HIDE_SUPPLIERS && <li onClick={() => navigate('/suppliers')}>{strings.SUPPLIERS}</li>}
            <li onClick={() => navigate('/locations')}>{strings.LOCATIONS}</li>
          </ul>
          <div style={{ marginTop: '14px', color: '#64748b', fontSize: '12px', lineHeight: 1.6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <LocationIcon sx={{ fontSize: 16, color: '#059669' }} />
              <span>Lahore • Karachi • Islamabad • Rawalpindi</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PhoneIcon sx={{ fontSize: 16, color: '#059669' }} />
              <span>24/7 Helpline: +92 300 1234567</span>
            </div>
          </div>
        </div>
        <div className="main-section">
          <div className="title">{strings.SUPPORT}</div>
          <ul className="links">
            <li onClick={() => navigate('/contact')}>{strings.CONTACT}</li>
            <li onClick={() => navigate('/faq')}>{strings.FAQ}</li>
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

      {/* Pakistan Local Payments Suite */}
      <section className="payment" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px', paddingBottom: '20px' }}>
        <PakistanPayments />
      </section>

      <section className="copyright">
        <div className="copyright" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '10px' }}>
          <span>Copyright &copy; {new Date().getFullYear()} SafarRent Pakistan. {strings.COPYRIGHT_PART2}</span>
          <span style={{ color: '#059669', fontWeight: 600 }}>Smarter Vehicle Rental &amp; Operations Platform</span>
        </div>
      </section>
    </div>
  )
}
export default Footer
