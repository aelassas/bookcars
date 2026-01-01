import * as React from 'react'
// import * as SwitchPrimitives from '@radix-ui/react-switch'

import { cn } from '@/lib/utils'

const Switch = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { checked?: boolean; onCheckedChange?: (checked: boolean) => void; disabled?: boolean }
>(({ className, checked, onCheckedChange, disabled, ...props }, ref) => (
  <div
    role="switch"
    aria-checked={checked}
    onClick={() => !disabled && onCheckedChange?.(!checked)}
    className={cn(
      'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
      checked ? 'bg-primary' : 'bg-input',
      disabled && 'opacity-50 cursor-not-allowed',
      className
    )}
    {...props}
    ref={ref}
  >
    <div
      className={cn(
        'pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform',
        checked ? 'translate-x-5' : 'translate-x-0'
      )}
    />
  </div>
))
Switch.displayName = 'Switch'

export { Switch }


