import React, { useState, useEffect } from 'react'
import { Menu, X, Moon, Sun } from 'lucide-react'
import { Link } from 'react-router-dom'
import env from '@/config/env.config'
import '@/v2/assets/css/navigation.css'

const Navigation = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const isDarkMode = document.documentElement.classList.contains('dark')
    setIsDark(isDarkMode)
  }, [])

  const toggleTheme = () => {
    const newDarkMode = !isDark
    setIsDark(newDarkMode)

    if (newDarkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  return (
    <nav className="navigation">
      <div className="navigation-container">
        <div className="navigation-content">
          {/* Logo */}
          <div className="navigation-logo">
            <Link to="/" className="navigation-logo-link">
              TOKYO
              <span className="navigation-logo-accent">DRIVE</span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="navigation-desktop-menu">
            <Link to="/vehicles" className="navigation-desktop-menu-link">
              Vehicles
            </Link>
            <Link to="/pricing" className="navigation-desktop-menu-link">
              Pricing
            </Link>
            {!env.HIDE_SUPPLIERS && (
              <Link to="/suppliers" className="navigation-desktop-menu-link">
                Suppliers
              </Link>
            )}
            <Link to="/locations" className="navigation-desktop-menu-link">
              Locations
            </Link>
            <Link to="/about" className="navigation-desktop-menu-link">
              About
            </Link>
            <Link to="/contact" className="navigation-desktop-menu-link">
              Contact
            </Link>
          </div>

          {/* CTA Buttons and Theme Toggle */}
          <div className="navigation-desktop-actions">
            {mounted && (
              <button
                onClick={toggleTheme}
                className="navigation-theme-toggle"
                aria-label="Toggle theme"
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            )}
            <Link to="/sign-in" className="navigation-login-link">
              Login
            </Link>
            <Link
              to="/sign-up"
              className="navigation-signup-link"
            >
              Sign Up
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="navigation-mobile-menu-button">
            {mounted && (
              <button
                onClick={toggleTheme}
                className="navigation-theme-toggle"
                aria-label="Toggle theme"
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            )}
            <button className="navigation-mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="navigation-mobile-menu">
            <Link to="/vehicles" className="navigation-mobile-menu-link">
              Vehicles
            </Link>
            <Link to="/pricing" className="navigation-mobile-menu-link">
              Pricing
            </Link>
            {!env.HIDE_SUPPLIERS && (
              <Link to="/suppliers" className="navigation-mobile-menu-link">
                Suppliers
              </Link>
            )}
            <Link to="/locations" className="navigation-mobile-menu-link">
              Locations
            </Link>
            <Link to="/about" className="navigation-mobile-menu-link">
              About
            </Link>
            <Link to="/contact" className="navigation-mobile-menu-link">
              Contact
            </Link>
            <Link
              to="/sign-up"
              className="navigation-mobile-signup-link"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navigation

