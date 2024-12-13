import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Link } from '@mui/material'
import {
  MailOutline,
  FacebookTwoTone as FacebookIcon,
  X,
  LinkedIn,
  Instagram,
} from '@mui/icons-material'
import { strings } from '@/lang/footer'
import NewsletterForm from '@/components/NewsletterForm'

import SecurePayment from '@/assets/img/secure-payment.png'
import '@/assets/css/footer.css'

const Footer = () => {
  const navigate = useNavigate()

  return (
    <div className="footer">
      <div className="header">BookCars</div>
      <section className="main">
        <div className="main-section">
          <div className="title">{strings.CORPORATE}</div>
          <ul className="links">
            <li onClick={() => navigate('/about')}>{strings.ABOUT}</li>
            <li onClick={() => navigate('/privacy')}>{strings.PRIVACY_POLICY}</li>
            <li onClick={() => navigate('/tos')}>{strings.TOS}</li>
          </ul>
        </div>
        <div className="main-section">
          <div className="title">{strings.RENT}</div>
          <ul className="links">
            <li onClick={() => navigate('/suppliers')}>{strings.SUPPLIERS}</li>
            <li onClick={() => navigate('/locations')}>{strings.LOCATIONS}</li>
          </ul>
        </div>
        <div className="main-section">
          <div className="title">{strings.SUPPORT}</div>
          <ul className="links">
            <li onClick={() => navigate('/contact')}>{strings.CONTACT}</li>
            <li onClick={() => navigate('/faq')}>{strings.FAQ}</li>
          </ul>
          <div className="footer-contact">
            <MailOutline className="icon" />
            <a href="mailto:info@bookcars.ma">info@bookcars.ma</a>
          </div>
          <div className="footer-contact">
            <Link href="https://www.facebook.com/" target="_blank"><FacebookIcon className="social-icon" /></Link>
            <Link href="https://x.com/" target="_blank"><X className="social-icon" /></Link>
            <Link href="https://www.linkedin.com/" target="_blank"><LinkedIn className="social-icon" /></Link>
            <Link href="https://www.instagram.com/" target="_blank"><Instagram className="social-icon" /></Link>
          </div>
          <div className="newsletter">
            <NewsletterForm />
          </div>
        </div>
      </section>
      <section className="payment">
        <div className="payment-text">{strings.SECURE_PAYMENT}</div>
        <img src={SecurePayment} alt="" />
      </section>
      <section className="copyright">
        <div className="copyright">
          <span>{strings.COPYRIGHT_PART1}</span>
          <span>{strings.COPYRIGHT_PART2}</span>
        </div>
      </section>
    </div>
  )
}
export default Footer
