import React, { ReactNode } from 'react'

interface PageContainerProps {
  children: ReactNode
  className?: string
}

/**
 * Consistent page container for shadcn-migrated pages
 * Provides standard max-width, padding, and background
 */
const PageContainer: React.FC<PageContainerProps> = ({ children, className = '' }) => {
  return (
    <div className="min-h-screen bg-neutral-50">
      <div className={`mx-auto max-w-[1200px] px-6 py-8 ${className}`}>
        {children}
      </div>
    </div>
  )
}

export default PageContainer

