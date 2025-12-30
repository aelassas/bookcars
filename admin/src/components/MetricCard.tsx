import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, DollarSign, Car, CheckCircle } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  className?: string
}

const getIcon = (label: string) => {
  if (label.includes('Revenue')) {
    return DollarSign
  }
  if (label.includes('Rented')) {
    return Car
  }
  if (label.includes('Available')) {
    return CheckCircle
  }
  return DollarSign
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  label, 
  value, 
  trend, 
  trendValue,
  className 
}) => {
  const Icon = getIcon(label)
  
  return (
    <Card className={cn(
      'h-full transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer',
      className
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <p className="text-2xl font-bold">{value}</p>
          {trend && trendValue && (
            <div className="flex items-center gap-1 text-xs">
              {trend === 'up' ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-green-600 font-medium">{trendValue}</span>
                </>
              ) : trend === 'down' ? (
                <>
                  <TrendingDown className="h-3 w-3 text-red-600" />
                  <span className="text-red-600 font-medium">{trendValue}</span>
                </>
              ) : (
                <span className="text-muted-foreground">{trendValue}</span>
              )}
              <span className="text-muted-foreground">vs last period</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default MetricCard

