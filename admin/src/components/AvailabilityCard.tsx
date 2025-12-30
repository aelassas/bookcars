import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'

interface AvailabilityCardProps {
  from: Date | null
  to: Date | null
  carRange: string
  onFromChange: (date: Date | null) => void
  onToChange: (date: Date | null) => void
  onCarRangeChange: (value: string) => void
  onCheckAvailability: () => void
  loading?: boolean
}

const carRangeOptions = [
  { label: 'Car', value: 'car' },
  { label: 'SUV', value: 'suv' },
  { label: 'Van', value: 'van' },
  { label: 'Scooter', value: 'scooter' },
  { label: 'Bus', value: 'bus' },
]

const AvailabilityCard: React.FC<AvailabilityCardProps> = ({
  from,
  to,
  carRange,
  onFromChange,
  onToChange,
  onCarRangeChange,
  onCheckAvailability,
  loading = false,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Availability</CardTitle>
        <CardDescription>{new Date().toLocaleString()}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <DatePicker
            date={from}
            onDateChange={onFromChange}
            label="From"
            placeholder="Select start date"
          />
          
          <DatePicker
            date={to}
            onDateChange={onToChange}
            label="To"
            placeholder="Select end date"
          />
          
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted-foreground">
              Car Range
            </label>
            <Select value={carRange} onValueChange={onCarRangeChange}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select car range" />
              </SelectTrigger>
              <SelectContent>
                {carRangeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-col gap-2 justify-end">
            <Button 
              onClick={onCheckAvailability} 
              disabled={loading}
              className="h-10 w-full"
            >
              {loading ? 'Loading...' : 'Check Availability'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default AvailabilityCard

