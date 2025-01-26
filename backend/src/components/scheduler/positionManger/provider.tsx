import React, { useCallback, useEffect, useState } from 'react'
import { eachDayOfInterval, format } from 'date-fns'
import { PositionManagerState, PositionContext } from './context'
import useStore from '../hooks/useStore'
import { DefaultResource, FieldProps, ProcessedEvent, ResourceFields } from '../types'
import { getResourcedEvents, sortEventsByTheEarliest } from '../helpers/generals'

type Props = {
  children: React.ReactNode;
};

const setEventPositions = (events: ProcessedEvent[]) => {
  const slots: PositionManagerState['renderedSlots'][string] = {}
  let position = 0
  for (let i = 0; i < events.length; i += 1) {
    const event = events[i]
    const eventLength = eachDayOfInterval({ start: event.start, end: event.end })
    for (let j = 0; j < eventLength.length; j += 1) {
      const day = format(eventLength[j], 'yyyy-MM-dd')
      if (slots[day]) {
        const positions = Object.values(slots[day])
        while (positions.includes(position)) {
          position += 1
        }
        slots[day][event.event_id] = position
      } else {
        slots[day] = { [event.event_id]: position }
      }
    }

    // rest
    position = 0
  }

  return slots
}

const setEventPositionsWithResources = (
  events: ProcessedEvent[],
  resources: DefaultResource[],
  rFields: ResourceFields,
  fields: FieldProps[]
) => {
  // const sorted = sortEventsByTheEarliest(events)
  const sorted = sortEventsByTheEarliest(Array.from(events))
  const slots: PositionManagerState['renderedSlots'] = {}
  if (resources.length) {
    for (const resource of resources) {
      const resourcedEvents = getResourcedEvents(sorted, resource, rFields, fields)
      const positions = setEventPositions(resourcedEvents)
      slots[resource[rFields.idField]] = positions
    }
  } else {
    slots.all = setEventPositions(sorted)
  }

  return slots
}

export const PositionProvider = ({ children }: Props) => {
  const { events, resources, resourceFields, fields } = useStore()
  const [state, set] = useState<PositionManagerState>({
    renderedSlots: setEventPositionsWithResources(events, resources, resourceFields, fields),
  })

  useEffect(() => {
    set((prev) => ({
      ...prev,
      renderedSlots: setEventPositionsWithResources(events, resources, resourceFields, fields),
    }))
  }, [events, fields, resourceFields, resources])

  const setRenderedSlot = useCallback((day: string, eventId: string, position: number, resourceId?: string) => {
    set((prev) => ({
      ...prev,
      renderedSlots: {
        ...prev.renderedSlots,
        [resourceId || 'all']: {
          ...prev.renderedSlots?.[resourceId || 'all'],
          [day]: prev.renderedSlots?.[resourceId || 'all']?.[day]
            ? {
              ...prev.renderedSlots?.[resourceId || 'all']?.[day],
              [eventId]: position,
            }
            : { [eventId]: position },
        },
      },
    }))
  }, [])

  const contextValue = React.useMemo(() => ({
    ...state,
    setRenderedSlot,
  }), [state, setRenderedSlot])

  return (
    <PositionContext.Provider value={contextValue}>
      {children}
    </PositionContext.Provider>
  )
}
