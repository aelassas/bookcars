import React, { useMemo } from 'react'
import { format, isSameMonth, getDaysInMonth, isToday } from 'date-fns'
import { Typography } from '@mui/material'
import { AgendaDiv } from '../styles/styles'
import { ProcessedEvent } from '../types'
import useStore from '../hooks/useStore'
import { filterTodayAgendaEvents, isTimeZonedToday } from '../helpers/generals'
import AgendaEventsList from '../components/events/AgendaEventsList'
import EmptyAgenda from '../components/events/EmptyAgenda'

type Props = {
  events: ProcessedEvent[];
};
const MonthAgenda = ({ events }: Props) => {
  const {
    month,
    handleGotoDay,
    locale,
    timeZone,
    selectedDate,
    translations,
    alwaysShowAgendaDays,
  } = useStore()
  const { disableGoToDay, headRenderer } = month!
  const daysOfMonth = getDaysInMonth(selectedDate)
  const daysList = Array.from({ length: daysOfMonth }, (_, i) => i + 1)

  const monthEvents = useMemo(() => events.filter((event) => isSameMonth(event.start, selectedDate)), [events, selectedDate])

  if (!alwaysShowAgendaDays && !monthEvents.length) {
    return <EmptyAgenda />
  }

  return (
    <AgendaDiv>
      {daysList.map((i) => {
        const day = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i)
        const today = isTimeZonedToday({ dateLeft: day, timeZone })
        const dayEvents = filterTodayAgendaEvents(events, day)

        if (!alwaysShowAgendaDays && !dayEvents.length) {
          return null
        }

        return (
          <div key={i} className={`rs__agenda_row ${isToday(day) ? 'rs__today_cell' : ''}`}>
            <div className="rs__cell rs__agenda__cell">
              {typeof headRenderer === 'function' ? (
                <div>{headRenderer(day)}</div>
              ) : (
                <Typography
                  sx={{ fontWeight: today ? 'bold' : 'inherit' }}
                  color={today ? 'primary' : 'inherit'}
                  variant="body2"
                  className={!disableGoToDay ? 'rs__hover__op' : ''}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!disableGoToDay) {
                      handleGotoDay(day)
                    }
                  }}
                >
                  {format(day, 'dd E', { locale })}
                </Typography>
              )}
            </div>
            <div className="rs__cell rs__agenda_items">
              {dayEvents.length > 0 ? (
                <AgendaEventsList day={day} events={dayEvents} />
              ) : (
                <Typography sx={{ padding: 1 }}>{translations.noDataToDisplay}</Typography>
              )}
            </div>
          </div>
        )
      })}
    </AgendaDiv>
  )
}

export { MonthAgenda }
