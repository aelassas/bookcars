import React, { memo } from 'react'
import { PersonOutline as CustomerIcon, Storefront as SupplierIcon } from '@mui/icons-material'
import env from '@/config/env.config'

import '@/assets/css/role-switch-nav.css'

interface RoleSwitchNavProps {
  className?: string
}

/**
 * Segmented top-bar navigation that switches between the customer storefront
 * and the supplier operations portal. The storefront is the current view here,
 * so the supplier side links across to the admin app.
 */
const RoleSwitchNav = ({ className }: RoleSwitchNavProps) => {
  const supplierHost = env.ADMIN_HOST

  // Nothing to switch to when the operations portal is not configured.
  if (!supplierHost) {
    return <></>
  }

  return (
    <nav className={`sr-role-switch ${className || ''}`} aria-label="Switch between customer and supplier views">
      <span className="sr-role-switch-item is-active" aria-current="page">
        <CustomerIcon fontSize="inherit" />
        <span className="sr-role-switch-text">Customer</span>
      </span>
      <a
        className="sr-role-switch-item"
        href={supplierHost}
        title="Open the supplier operations portal"
        aria-label="Switch to supplier view"
      >
        <SupplierIcon fontSize="inherit" />
        <span className="sr-role-switch-text">Supplier</span>
      </a>
    </nav>
  )
}

export default memo(RoleSwitchNav)
