import React, { useMemo } from 'react'
import { format, isToday } from 'date-fns'
import { Typography } from '@mui/material'
import { AgendaDiv } from '../styles/styles'
import { ProcessedEvent } from '../types'
import useStore from '../hooks/useStore'
import { filterTodayAgendaEvents, isTimeZonedToday } from '../helpers/generals'
import AgendaEventsList from '../components/events/AgendaEventsList'
import EmptyAgenda from '../components/events/EmptyAgenda'

type Props = {
  daysList: Date[];
  events: ProcessedEvent[];
};
const WeekAgenda = ({ daysList, events }: Props) => {
  const { week, handleGotoDay, locale, timeZone, translations, alwaysShowAgendaDays } = useStore()
  const { disableGoToDay, headRenderer } = week!

  const hasEvents = useMemo(() => daysList.some((day) => filterTodayAgendaEvents(events, day).length > 0), [daysList, events])

  if (!alwaysShowAgendaDays && !hasEvents) {
    return <EmptyAgenda />
  }

  return (
    <AgendaDiv>
      {daysList.map((day) => {
        const today = isTimeZonedToday({ dateLeft: day, timeZone })
        const dayEvents = filterTodayAgendaEvents(events, day)

        if (!alwaysShowAgendaDays && !dayEvents.length) {
          return null
        }

        return (
          <div key={day.getTime()} className={`rs__agenda_row ${isToday(day) ? 'rs__today_cell' : ''}`}>
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

export { WeekAgenda }
