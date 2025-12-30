import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, TrendingUp } from 'lucide-react'
import * as bookcarsTypes from ':bookcars-types'

interface RecentBookingsTableProps {
  bookings: bookcarsTypes.Booking[]
  onViewDetails?: (booking: bookcarsTypes.Booking) => void
  formatCurrency: (amount: number, currency: string) => string
  currency: string
  loading?: boolean
}

const RecentBookingsTable: React.FC<RecentBookingsTableProps> = ({
  bookings,
  onViewDetails,
  formatCurrency,
  currency,
  loading = false,
}) => {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)

  const getStatusVariant = (status: bookcarsTypes.BookingStatus): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case bookcarsTypes.BookingStatus.Paid:
      case bookcarsTypes.BookingStatus.PaidInFull:
        return 'default'
      case bookcarsTypes.BookingStatus.Pending:
        return 'secondary'
      case bookcarsTypes.BookingStatus.Cancelled:
      case bookcarsTypes.BookingStatus.Void:
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const getDriverInitials = (name: string): string => {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const totalEarnings = bookings.reduce((sum, b) => sum + (b.price || 0), 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Bookings</CardTitle>
            <CardDescription>Latest bookings from your platform</CardDescription>
          </div>
          {bookings.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="font-semibold">{formatCurrency(totalEarnings, currency)}</span>
              <span className="text-muted-foreground">total</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="text-muted-foreground">Loading bookings...</div>
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">No recent bookings</p>
              <p className="text-sm text-muted-foreground">
                New bookings will appear here
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">No</TableHead>
                  <TableHead>Car</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Earnings</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking, index) => {
                  const carName = typeof booking.car === 'string' 
                    ? booking.car 
                    : booking.car?.name || 'Unknown Car'
                  
                  const driver = typeof booking.driver === 'string' 
                    ? booking.driver 
                    : booking.driver?.fullName || '—'
                  
                  const driverAvatar = typeof booking.driver !== 'string' 
                    ? booking.driver?.avatar 
                    : undefined
                  
                  const price = formatCurrency(booking.price || 0, currency)

                  return (
                    <TableRow 
                      key={booking._id || index} 
                      className='hover:bg-muted/50 transition-colors cursor-pointer'
                      onMouseEnter={() => setHoveredRow(index)}
                      onMouseLeave={() => setHoveredRow(null)}
                      onClick={() => onViewDetails?.(booking)}
                    >
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{carName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8 ring-2 ring-background">
                            <AvatarImage src={driverAvatar} alt={driver} />
                            <AvatarFallback className="text-xs bg-primary/10">
                              {getDriverInitials(driver)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{driver}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(booking.status)} className="font-medium">
                          {booking.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-green-600">{price}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          variant={hoveredRow === index ? "default" : "ghost"}
                          onClick={(e) => {
                            e.stopPropagation()
                            onViewDetails?.(booking)
                          }}
                          className="gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default RecentBookingsTable

