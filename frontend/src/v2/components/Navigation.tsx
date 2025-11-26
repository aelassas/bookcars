import React, { useState, useEffect, useRef } from 'react'
import { Menu, X, Moon, Sun, Bell, User, Settings, LogOut } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import * as bookcarsTypes from ':bookcars-types'
import env from '@/config/env.config'
import { useUserContext, UserContextType } from '@/context/UserContext'
import { useNotificationContext, NotificationContextType } from '@/context/NotificationContext'
import * as UserService from '@/services/UserService'
import Avatar from '@/components/Avatar'
import { strings } from '@/lang/header'
import '@/v2/assets/css/navigation.css'

const Navigation = () => {
  const navigate = useNavigate()
  const { user } = useUserContext() as UserContextType
  const { notificationCount } = useNotificationContext() as NotificationContextType

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<bookcarsTypes.User>()
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    const isDarkMode = document.documentElement.classList.contains('dark')
    setIsDark(isDarkMode)
  }, [])

  useEffect(() => {
    if (user) {
      setCurrentUser(user)
    } else {
      setCurrentUser(undefined)
    }
  }, [user])

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen])

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

  const handleNotificationsClick = () => {
    setMobileMenuOpen(false)
    navigate('/notifications')
  }

  const handleSettingsClick = () => {
    setUserMenuOpen(false)
    setMobileMenuOpen(false)
    navigate('/settings')
  }

  const handleSignOut = async () => {
    await UserService.signout(true, false)
    setUserMenuOpen(false)
    setMobileMenuOpen(false)
  }

  const isSignedIn = !!user

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
            {!isSignedIn ? (
              <>
                <Link to="/sign-in" className="navigation-login-link">
                  Login
                </Link>
                <Link
                  to="/sign-up"
                  className="navigation-signup-link"
                >
                  Sign Up
                </Link>
              </>
            ) : (
              <>
                <button
                  onClick={handleNotificationsClick}
                  className="navigation-notifications-button"
                  aria-label="Notifications"
                >
                  <Bell size={20} />
                  {notificationCount > 0 && (
                    <span className="navigation-notifications-badge">{notificationCount}</span>
                  )}
                </button>
                <div className="navigation-user-menu" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="navigation-user-button"
                    aria-label="User menu"
                  >
                    {currentUser ? (
                      <Avatar loggedUser={currentUser} user={currentUser} size="small" readonly />
                    ) : (
                      <User size={20} />
                    )}
                  </button>
                  {userMenuOpen && (
                    <div className="navigation-user-dropdown">
                      <button
                        onClick={handleSettingsClick}
                        className="navigation-user-dropdown-item"
                      >
                        <Settings size={18} />
                        <span>{strings.SETTINGS}</span>
                      </button>
                      <button
                        onClick={handleSignOut}
                        className="navigation-user-dropdown-item"
                      >
                        <LogOut size={18} />
                        <span>{strings.SIGN_OUT}</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
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
            <Link to="/vehicles" className="navigation-mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
              Vehicles
            </Link>
            <Link to="/pricing" className="navigation-mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
              Pricing
            </Link>
            {!env.HIDE_SUPPLIERS && (
              <Link to="/suppliers" className="navigation-mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
                Suppliers
              </Link>
            )}
            <Link to="/locations" className="navigation-mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
              Locations
            </Link>
            <Link to="/about" className="navigation-mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
              About
            </Link>
            <Link to="/contact" className="navigation-mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
              Contact
            </Link>
            {!isSignedIn ? (
              <>
                <Link to="/sign-in" className="navigation-mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
                  Login
                </Link>
                <Link
                  to="/sign-up"
                  className="navigation-mobile-signup-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            ) : (
              <>
                <button
                  onClick={handleNotificationsClick}
                  className="navigation-mobile-menu-link navigation-mobile-menu-button"
                >
                  <Bell size={18} />
                  <span>Notifications</span>
                  {notificationCount > 0 && (
                    <span className="navigation-notifications-badge">{notificationCount}</span>
                  )}
                </button>
                <button
                  onClick={handleSettingsClick}
                  className="navigation-mobile-menu-link navigation-mobile-menu-button"
                >
                  <Settings size={18} />
                  <span>{strings.SETTINGS}</span>
                </button>
                <button
                  onClick={handleSignOut}
                  className="navigation-mobile-menu-link navigation-mobile-menu-button"
                >
                  <LogOut size={18} />
                  <span>{strings.SIGN_OUT}</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navigation

