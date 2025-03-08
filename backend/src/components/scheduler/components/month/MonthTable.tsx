import React, { Avatar, Typography, useTheme } from '@mui/material'
import {
  addDays,
  endOfDay,
  format,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  setHours,
  startOfDay,
  startOfMonth,
} from 'date-fns'
import { Fragment, ReactNode, useCallback } from 'react'
import {
  getHourFormat,
  getRecurrencesForDate,
  getResourcedEvents,
  isTimeZonedToday,
  sortEventsByTheEarliest,
} from '../../helpers/generals'
import useStore from '../../hooks/useStore'
import useSyncScroll from '../../hooks/useSyncScroll'
import { TableGrid } from '../../styles/styles'
import { DefaultResource } from '../../types'
import Cell from '../common/Cell'
import MonthEvents from '../events/MonthEvents'

type Props = {
  daysList: Date[];
  resource?: DefaultResource;
  eachWeekStart: Date[];
};

const MonthTable = ({ daysList, resource, eachWeekStart }: Props) => {
  const {
    height,
    month,
    selectedDate,
    events,
    handleGotoDay,
    resourceFields,
    fields,
    locale,
    hourFormat,
    stickyNavigation,
    timeZone,
    onClickMore,
  } = useStore()
  const { weekDays, startHour, endHour, cellRenderer, headRenderer, disableGoToDay } = month!
  const { headersRef, bodyRef } = useSyncScroll()

  const theme = useTheme()
  const monthStart = startOfMonth(selectedDate)
  const hFormat = getHourFormat(hourFormat)
  const CELL_HEIGHT = height / eachWeekStart.length

  const renderCells = useCallback(
    (_resource?: DefaultResource) => {
      let resourcedEvents = sortEventsByTheEarliest(events)
      if (_resource) {
        resourcedEvents = getResourcedEvents(events, _resource, resourceFields, fields)
      }
      const rows: ReactNode[] = []
      const cellHeights: number[] = []

      for (const startDay of eachWeekStart) {
        const cells = weekDays.map((d) => {
          const today = addDays(startDay, d)
          const start = new Date(`${format(setHours(today, startHour), `yyyy/MM/dd ${hFormat}`)}`)
          const end = new Date(`${format(setHours(today, endHour), `yyyy/MM/dd ${hFormat}`)}`)
          const field = resourceFields.idField
          const eachFirstDayInCalcRow = isSameDay(startDay, today) ? today : null
          const todayEvents = resourcedEvents
            .flatMap((e) => getRecurrencesForDate(e, today))
            .filter((e) => {
              if (isSameDay(e.start, today)) {
                return true
              }
              const dayInterval = { start: startOfDay(e.start), end: endOfDay(e.end) }
              if (eachFirstDayInCalcRow && isWithinInterval(eachFirstDayInCalcRow, dayInterval)) {
                return true
              }
              return false
            })
          const isToday = isTimeZonedToday({ dateLeft: today, timeZone })
          const _cellHeight = 27 + 26 * todayEvents.length + 17 + 12 + 10
          cellHeights.push(_cellHeight)
          // const cellHeight = Math.max(CELL_HEIGHT, ...cellHeights)
          const cellHeight = CELL_HEIGHT
          return (
            <span style={{ height: cellHeight }} key={d.toString()} className="rs__cell">
              <Cell
                start={start}
                end={end}
                day={selectedDate}
                height={cellHeight}
                resourceKey={field}
                resourceVal={_resource ? _resource[field] : null}
                cellRenderer={cellRenderer}
              />
              <>
                {typeof headRenderer === 'function' ? (
                  <div style={{ position: 'absolute', top: 0 }}>{headRenderer(today)}</div>
                ) : (
                  <Avatar
                    style={{
                      width: 27,
                      height: 27,
                      position: 'absolute',
                      top: 0,
                      // background: isToday ? theme.palette.secondary.main : 'transparent',
                      background: isToday ? '#1a1a1a' : 'transparent',
                      color: isToday ? theme.palette.secondary.contrastText : '',
                      marginBottom: 2,
                    }}
                  >
                    <Typography
                      // color={!isSameMonth(today, monthStart) ? '#ccc' : 'textPrimary'}
                      color={!isSameMonth(today, monthStart) ? '#ccc' : isToday ? '#fff' : 'textPrimary'}
                      className={!disableGoToDay ? 'rs__hover__op' : ''}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!disableGoToDay) {
                          handleGotoDay(today)
                        }
                      }}
                    >
                      {format(today, 'dd')}
                    </Typography>
                  </Avatar>
                )}

                <MonthEvents
                  events={todayEvents}
                  resourceId={_resource?.[field]}
                  today={today}
                  eachWeekStart={eachWeekStart}
                  eachFirstDayInCalcRow={eachFirstDayInCalcRow}
                  daysList={daysList}
                  onViewMore={(e) => {
                    if (onClickMore && typeof onClickMore === 'function') {
                      onClickMore(e, handleGotoDay)
                    } else {
                      handleGotoDay(e)
                    }
                  }}
                  cellHeight={cellHeight}
                />
              </>
            </span>
          )
        })

        rows.push(<Fragment key={startDay.toString()}>{cells}</Fragment>)
      }
      return rows
    },
    [
      CELL_HEIGHT,
      cellRenderer,
      daysList,
      disableGoToDay,
      eachWeekStart,
      endHour,
      events,
      fields,
      hFormat,
      handleGotoDay,
      headRenderer,
      monthStart,
      onClickMore,
      resourceFields,
      selectedDate,
      startHour,
      theme.palette.secondary.contrastText,
      timeZone,
      weekDays,
    ]
  )

  return (
    <>
      {/* Header Days */}
      <TableGrid
        days={daysList.length}
        ref={headersRef}
        indent="0"
        sticky="1"
        stickyNavigation={stickyNavigation}
      >
        {daysList.map((date) => (
          <Typography
            key={date.getTime()}
            className="rs__cell rs__header rs__header__center"
            align="center"
            variant="body2"
          >
            {format(date, 'EE', { locale })}
          </Typography>
        ))}
      </TableGrid>
      {/* Time Cells */}
      <TableGrid days={daysList.length} ref={bodyRef} indent="0">
        {renderCells(resource)}
      </TableGrid>
    </>
  )
}

export default MonthTable
