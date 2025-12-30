import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { format } from 'date-fns'

interface EarningsChartProps {
  labels: string[]
  series: number[]
  total: number
  currency?: string
  loading?: boolean
}

interface ChartDataPoint {
  date: string
  displayDate: string
  revenue: number
}

const EarningsChart: React.FC<EarningsChartProps> = ({
  labels,
  series,
  total,
  currency = 'USD',
  loading = false,
}) => {
  const chartData: ChartDataPoint[] = useMemo(() => {
    return labels.map((label, index) => {
      const date = new Date(label)
      return {
        date: label,
        displayDate: format(date, 'MMM dd'),
        revenue: series[index] || 0,
      }
    })
  }, [labels, series])

  const formatCurrency = (value: number) => {
    // If currency is a symbol (like '$'), use it directly
    if (currency.length <= 2) {
      return `${currency}${value.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`
    }
    // Otherwise treat it as a currency code (like 'USD')
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const maxRevenue = Math.max(...series, 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Total Earnings</CardTitle>
            <CardDescription>Revenue progression per day</CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{formatCurrency(total)}</div>
            <div className="text-sm text-muted-foreground">Total Revenue</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="text-muted-foreground">Loading chart data...</div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">No earnings data available</p>
              <p className="text-sm text-muted-foreground">
                Bookings will appear here as they are created
              </p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="displayDate"
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  padding: '12px',
                }}
                labelStyle={{
                  color: 'hsl(var(--popover-foreground))',
                  fontWeight: 600,
                  marginBottom: '4px',
                }}
                formatter={(value: number | undefined) => [formatCurrency(value || 0), 'Revenue']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend
                wrapperStyle={{
                  paddingTop: '20px',
                }}
                iconType="line"
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{
                  fill: 'hsl(var(--primary))',
                  strokeWidth: 2,
                  r: 4,
                }}
                activeDot={{
                  r: 6,
                  fill: 'hsl(var(--primary))',
                }}
                name="Daily Revenue"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
        
        {chartData.length > 0 && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-sm text-muted-foreground mb-1">Avg Daily</div>
              <div className="text-lg font-semibold">
                {formatCurrency(total / chartData.length)}
              </div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-sm text-muted-foreground mb-1">Peak Day</div>
              <div className="text-lg font-semibold">
                {formatCurrency(maxRevenue)}
              </div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-sm text-muted-foreground mb-1">Days</div>
              <div className="text-lg font-semibold">{chartData.length}</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-sm text-muted-foreground mb-1">Trend</div>
              <div className="text-lg font-semibold">
                {series.length >= 2 && series[series.length - 1] > series[0] ? (
                  <span className="text-green-600">↑ Up</span>
                ) : series.length >= 2 && series[series.length - 1] < series[0] ? (
                  <span className="text-red-600">↓ Down</span>
                ) : (
                  <span className="text-muted-foreground">→ Stable</span>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default EarningsChart

