import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Clock, Bell, CheckCircle2 } from 'lucide-react'

interface Reminder {
  title: string
  time: string
  priority?: 'high' | 'medium' | 'low'
}

interface RemindersCardProps {
  reminders: Reminder[]
  className?: string
}

const RemindersCard: React.FC<RemindersCardProps> = ({ reminders, className }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'destructive'
      case 'medium':
        return 'default'
      case 'low':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>Reminders</CardTitle>
          </div>
          {reminders.length > 0 && (
            <Badge variant="secondary" className="font-semibold">
              {reminders.length}
            </Badge>
          )}
        </div>
        <CardDescription>Important tasks and notifications</CardDescription>
      </CardHeader>
      <CardContent>
        {reminders.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <p className="text-muted-foreground mb-1 font-medium">No reminders</p>
              <p className="text-sm text-muted-foreground">
                You&apos;re all caught up!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-0">
            {reminders.map((reminder, index) => (
              <React.Fragment key={reminder.title}>
                <div 
                  className={`py-3 px-2 rounded-md transition-all cursor-pointer ${
                    hoveredIndex === index ? 'bg-muted/50 -mx-2 px-4' : ''
                  }`}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-relaxed flex-1">
                        {reminder.title}
                      </p>
                      {reminder.priority && (
                        <Badge 
                          variant={getPriorityColor(reminder.priority)} 
                          className="text-xs shrink-0"
                        >
                          {reminder.priority}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{reminder.time}</span>
                    </div>
                  </div>
                </div>
                {index < reminders.length - 1 && <Separator />}
              </React.Fragment>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default RemindersCard

