import React from "react"
import { Link } from "react-router-dom"
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram } from "lucide-react"
import "@/assets/css/home-footer.css"

const HomeFooter = () => {
  return (
    <footer className="home-footer">
      <div className="home-footer-container">
        <div className="home-footer-grid">
          {/* Brand */}
          <div>
            <h3 className="home-footer-brand-title">
              TOKYO<span className="home-footer-brand-accent">DRIVE</span>
            </h3>
            <p className="home-footer-brand-description">
              Your premier car rental partner in Tokyo, delivering luxury and convenience since 2018.
            </p>
            <div className="home-footer-social">
              <Facebook className="home-footer-social-icon" size={20} />
              <Twitter className="home-footer-social-icon" size={20} />
              <Instagram className="home-footer-social-icon" size={20} />
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="home-footer-section-title">Quick Links</h4>
            <div className="home-footer-links">
              <Link to="/about" className="home-footer-link">
                About Us
              </Link>
              <Link to="/vehicles" className="home-footer-link">
                Our Fleet
              </Link>
              <Link to="/pricing" className="home-footer-link">
                Pricing
              </Link>
              <Link to="/blog" className="home-footer-link">
                Blog
              </Link>
            </div>
          </div>

          {/* Information */}
          <div>
            <h4 className="home-footer-section-title">Information</h4>
            <div className="home-footer-links">
              <Link to="/tos" className="home-footer-link">
                Terms & Conditions
              </Link>
              <Link to="/privacy" className="home-footer-link">
                Privacy Policy
              </Link>
              <Link to="/faq" className="home-footer-link">
                FAQ
              </Link>
              <Link to="/contact" className="home-footer-link">
                Contact Us
              </Link>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="home-footer-section-title">Contact</h4>
            <div>
              <div className="home-footer-contact-item">
                <Phone size={18} className="home-footer-contact-icon" />
                <a href="tel:+81312345678" className="home-footer-contact-link">
                  +81 (0)3-1234-5678
                </a>
              </div>
              <div className="home-footer-contact-item">
                <Mail size={18} className="home-footer-contact-icon" />
                <a href="mailto:info@tokyodrive.com" className="home-footer-contact-link">
                  info@tokyodrive.com
                </a>
              </div>
              <div className="home-footer-contact-item">
                <MapPin size={18} className="home-footer-contact-icon" />
                <span className="home-footer-contact-text">Tokyo, Japan</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="home-footer-bottom">
          <p className="home-footer-copyright">&copy; 2025 Tokyo Drive. All rights reserved.</p>
          <div className="home-footer-bottom-actions">
            <button className="home-footer-bottom-button">Book Now</button>
            <button className="home-footer-bottom-button">Customer Support</button>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default HomeFooter
