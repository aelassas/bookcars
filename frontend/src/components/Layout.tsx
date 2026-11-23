import { Link, NavLink, useLocation } from 'react-router-dom'
import React, { useState, useEffect, ReactNode } from 'react'
import { Button } from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import { strings } from '@/lang/master'
import * as UserService from '@/services/UserService'
import * as helper from '@/utils/helper'
import { useAnalytics } from '@/utils/useAnalytics'
import { useUserContext, UserContextType } from '@/context/UserContext'
import Unauthorized from '@/components/Unauthorized'

interface LayoutProps {
  strict?: boolean
  children: ReactNode
  onLoad?: (user?: bookcarsTypes.User) => void
}

const Layout = ({
  strict,
  children,
  onLoad
}: LayoutProps) => {
  useAnalytics()

  const titles: Record<string, string> = {'search': 'Find your rental car', 'bookings': 'My bookings', 'booking': 'Booking details', 'checkout': 'Reserve your car', 'checkout-session': 'Booking confirmation', 'settings': 'My account', 'notifications': 'Notifications', 'locations': 'Pickup locations', 'suppliers': 'Our rental partners', 'faq': 'Frequently asked questions', 'about': 'About SafarRent', 'contact': 'Contact us', 'privacy': 'Privacy policy', 'tos': 'Terms & conditions', 'cookie-policy': 'Cookie policy', 'change-password': 'Account security'}
  const page = useLocation().pathname.slice(1) || 'home'
  const { user, userLoaded, unauthorized } = useUserContext() as UserContextType
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const currentUser = UserService.getCurrentUser()

    if (!currentUser && strict) {
      UserService.signout(true, false)
    } else if (userLoaded) {
      setLoading(false)

      if (onLoad) {
        onLoad(user || undefined)
      }
    }
  }, [user, userLoaded, strict]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleResend = async (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault()

    try {
      if (user) {
        const data = { email: user.email }

        const status = await UserService.resendLink(data)
        if (status === 200) {
          helper.info(strings.VALIDATION_EMAIL_SENT)
        } else {
          helper.error(null, strings.VALIDATION_EMAIL_ERROR)
        }
      }
    } catch (err) {
      helper.error(err, strings.VALIDATION_EMAIL_ERROR)
    }
  }

  return (
    <>
      {
        !(unauthorized && strict) && (
          (!user && !loading) || (user && user.verified) ? (
            <div className="content" data-page={page}>
              {titles[page] && <header className="sr-page-banner"><h1>{titles[page]}</h1><nav aria-label="Breadcrumb"><Link to="/">Home</Link><span aria-hidden="true">/</span><span>{titles[page]}</span></nav></header>}
              {user && ['bookings','booking','settings','notifications','change-password'].includes(page) && (
                <nav className="sr-account-nav" aria-label="My account">
                  <NavLink to="/bookings">My bookings</NavLink>
                  <NavLink to="/settings">Profile & documents</NavLink>
                  <NavLink to="/notifications">Notifications</NavLink>
                  <NavLink to="/change-password">Account security</NavLink>
                </nav>
              )}
              {children}
            </div>
          ) : (
            !loading && (
              <div className="validate-email">
                <span>{strings.VALIDATE_EMAIL}</span>
                <Button type="button" variant="contained" className="btn-primary btn-resend" onClick={handleResend}>
                  {strings.RESEND}
                </Button>
              </div>
            )
          )
        )
      }
      {unauthorized && strict && <Unauthorized />}
    </>
  )
}

export default Layout
