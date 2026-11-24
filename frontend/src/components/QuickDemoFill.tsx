import React from 'react'
import { Button } from '@mui/material'

import '@/assets/css/quick-demo-fill.css'

export const DEMO_PASSWORD = 'SafarRent-Demo-2026!'

export interface DemoAccount {
  label: string
  email: string
  detail: string
}

/** Seeded by backend/seed-pakistan-operations.cjs in FYP demo mode. */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  { label: 'Verified Customer', email: 'demo-customer@safarrent.local', detail: 'KYC verified' },
  { label: 'Unverified Customer', email: 'demo-customer-new@safarrent.local', detail: 'KYC pending' },
  { label: 'Supplier', email: 'margalla@safarrent.pk', detail: 'Margalla Executive Motors' },
  { label: 'Admin', email: 'demo-admin@safarrent.local', detail: 'Operations admin' },
]

interface QuickDemoFillProps {
  accounts?: DemoAccount[]
  onSelect: (account: DemoAccount) => void
  disabled?: boolean
}

const QuickDemoFill = ({ accounts = DEMO_ACCOUNTS, onSelect, disabled }: QuickDemoFillProps) => (
  <div className="quick-demo-fill">
    <div className="quick-demo-fill-head">
      <span>Quick demo fill</span>
      <span className="quick-demo-fill-password">{DEMO_PASSWORD}</span>
    </div>
    <div className="quick-demo-fill-grid">
      {accounts.map((account) => (
        <Button
          key={account.email}
          type="button"
          variant="outlined"
          size="small"
          className="quick-demo-fill-btn"
          disabled={disabled}
          onClick={() => onSelect(account)}
        >
          <span className="quick-demo-fill-label">{account.label}</span>
          <span className="quick-demo-fill-detail">{account.detail}</span>
        </Button>
      ))}
    </div>
  </div>
)

export default QuickDemoFill
