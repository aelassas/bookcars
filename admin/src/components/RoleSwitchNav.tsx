import React, { memo } from 'react'
import { PersonOutline as CustomerIcon, Storefront as SupplierIcon } from '@mui/icons-material'
import env from '@/config/env.config'

import '@/assets/css/role-switch-nav.css'

interface RoleSwitchNavProps {
  className?: string
}

/**
 * Segmented top-bar navigation that switches between the supplier operations
 * portal and the customer storefront. The supplier console is the current view
 * here, so the customer side links across to the storefront app.
 */
const RoleSwitchNav = ({ className }: RoleSwitchNavProps) => {
  const customerHost = env.FRONTEND_HOST

  // Nothing to switch to when the storefront is not configured.
  if (!customerHost) {
    return <></>
  }

  return (
    <nav className={`sr-role-switch ${className || ''}`} aria-label="Switch between customer and supplier views">
      <a
        className="sr-role-switch-item"
        href={customerHost}
        title="Open the customer storefront"
        aria-label="Switch to customer view"
      >
        <CustomerIcon fontSize="inherit" />
        <span className="sr-role-switch-text">Customer</span>
      </a>
      <span className="sr-role-switch-item is-active" aria-current="page">
        <SupplierIcon fontSize="inherit" />
        <span className="sr-role-switch-text">Supplier</span>
      </span>
    </nav>
  )
}

export default memo(RoleSwitchNav)
