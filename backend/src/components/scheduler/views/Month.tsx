import React, { useEffect, useCallback, ReactNode } from 'react'
import { addDays, eachWeekOfInterval, endOfMonth, startOfMonth } from 'date-fns'
import { CellRenderedProps, DayHours, DefaultResource } from '../types'
import { getResourcedEvents, sortEventsByTheEarliest } from '../helpers/generals'
import { WithResources } from '../components/common/WithResources'
import useStore from '../hooks/useStore'
import { MonthAgenda } from './MonthAgenda'
import MonthTable from '../components/month/MonthTable'

export type WeekDays = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export interface MonthProps {
  weekDays: WeekDays[];
  weekStartOn: WeekDays;
  startHour: DayHours;
  endHour: DayHours;
  cellRenderer?(props: CellRenderedProps): ReactNode;
  headRenderer?(day: Date): ReactNode;
  navigation?: boolean;
  disableGoToDay?: boolean;
}

const Month = () => {
  const {
    month,
    selectedDate,
    events,
    getRemoteEvents,
    triggerLoading,
    handleState,
    resources,
    resourceFields,
    fields,
    agenda,
  } = useStore()

  const { weekStartOn, weekDays } = month!
  const monthStart = startOfMonth(selectedDate)
  const monthEnd = endOfMonth(selectedDate)
  const eachWeekStart = eachWeekOfInterval(
    {
      start: monthStart,
      end: monthEnd,
    },
    { weekStartsOn: weekStartOn }
  )
  const daysList = weekDays.map((d) => addDays(eachWeekStart[0], d))

  const fetchEvents = useCallback(async () => {
    try {
      triggerLoading(true)
      const start = eachWeekStart[0]
      const end = addDays(eachWeekStart[eachWeekStart.length - 1], daysList.length)
      const _events = await getRemoteEvents!({
        start,
        end,
        view: 'month',
      })
      if (_events && _events?.length) {
        handleState(_events, 'events')
      }
    } finally {
      triggerLoading(false)
    }
    // eslint-disable-next-line
  }, [selectedDate, getRemoteEvents]);

  useEffect(() => {
    if (getRemoteEvents instanceof Function) {
      fetchEvents()
    }
  }, [fetchEvents, getRemoteEvents])

  const renderTable = useCallback(
    (resource?: DefaultResource) => {
      if (agenda) {
        let resourcedEvents = sortEventsByTheEarliest(events)
        if (resource) {
          resourcedEvents = getResourcedEvents(events, resource, resourceFields, fields)
        }

        return <MonthAgenda events={resourcedEvents} />
      }

      return <MonthTable daysList={daysList} eachWeekStart={eachWeekStart} resource={resource} />
    },
    [agenda, daysList, eachWeekStart, events, fields, resourceFields]
  )

  return resources.length ? <WithResources renderChildren={renderTable} /> : renderTable()
}

export { Month }
