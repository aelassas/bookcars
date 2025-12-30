import React from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

interface DashboardHeaderProps {
  onRefresh: () => void
  loading?: boolean
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ onRefresh, loading = false }) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-background border-b">
      <div className="h-full px-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        
        <Button 
          onClick={onRefresh} 
          disabled={loading}
          className="gap-2 h-9"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
    </header>
  )
}

export default DashboardHeader

