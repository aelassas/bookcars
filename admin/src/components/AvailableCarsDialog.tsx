import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import * as bookcarsTypes from ':bookcars-types'

interface AvailableCarsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cars: bookcarsTypes.Car[]
  loading?: boolean
}

const AvailableCarsDialog: React.FC<AvailableCarsDialogProps> = ({
  open,
  onOpenChange,
  cars,
  loading = false,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Available Cars</DialogTitle>
          <DialogDescription>
            {loading 
              ? 'Loading available cars...' 
              : cars.length === 0 
                ? 'No cars available for the selected dates.' 
                : `${cars.length} car${cars.length !== 1 ? 's' : ''} available for your selected dates`
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          ) : cars.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-muted-foreground mb-2">No cars available</p>
                <p className="text-sm text-muted-foreground">
                  Try selecting different dates or car range
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cars.map((car) => (
                <Card key={car._id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-semibold text-lg">{car.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {car.licensePlate || 'No license plate'}
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">
                          {car.range}
                        </Badge>
                        <Badge variant="outline">
                          {car.seats} seat{car.seats !== 1 ? 's' : ''}
                        </Badge>
                        {car.doors && (
                          <Badge variant="outline">
                            {car.doors} door{car.doors !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        {car.gearbox && (
                          <Badge variant="outline">
                            {car.gearbox}
                          </Badge>
                        )}
                      </div>
                      
                      {car.image && (
                        <div className="mt-2 rounded-md overflow-hidden bg-muted">
                          <img 
                            src={car.image} 
                            alt={car.name}
                            className="w-full h-32 object-cover"
                          />
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="text-sm">
                          {car.available ? (
                            <span className="text-green-600 font-medium">Available</span>
                          ) : (
                            <span className="text-muted-foreground">Not available</span>
                          )}
                        </div>
                        {car.dailyPrice && (
                          <div className="text-right">
                            <div className="text-lg font-bold">
                              ${car.dailyPrice}
                            </div>
                            <div className="text-xs text-muted-foreground">per day</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AvailableCarsDialog

