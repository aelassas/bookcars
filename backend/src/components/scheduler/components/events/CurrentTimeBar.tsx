import React, { useEffect, useState } from 'react'
import { differenceInMinutes, set } from 'date-fns'
import { BORDER_HEIGHT } from '../../helpers/constants'
import { getTimeZonedDate } from '../../helpers/generals'
import { TimeIndicatorBar } from '../../styles/styles'

interface CurrentTimeBarProps {
  startHour: number;
  step: number;
  minuteHeight: number;
  timeZone?: string;
  zIndex?: number;
}

function calculateTop({ startHour, step, minuteHeight, timeZone }: CurrentTimeBarProps): number {
  const now = getTimeZonedDate(new Date(), timeZone)

  const minutesFromTop = differenceInMinutes(now, set(now, { hours: startHour, minutes: 0 }))
  const topSpace = minutesFromTop * minuteHeight
  const slotsFromTop = minutesFromTop / step
  const borderFactor = slotsFromTop + BORDER_HEIGHT
  const top = topSpace + borderFactor

  return top
}

const CurrentTimeBar = (props: CurrentTimeBarProps) => {
  const [top, setTop] = useState(calculateTop(props))
  const { startHour, step, minuteHeight, timeZone, zIndex } = props

  useEffect(() => {
    const calcProps = { startHour, step, minuteHeight, timeZone }
    setTop(calculateTop(calcProps))
    const interval = setInterval(() => setTop(calculateTop(calcProps)), 60 * 1000)
    return () => clearInterval(interval)
  }, [startHour, step, minuteHeight, timeZone])

  // Prevent showing bar on top of days/header
  if (top < 0) return null

  return (
    <TimeIndicatorBar style={{ top, zIndex }}>
      <div />
      <div />
    </TimeIndicatorBar>
  )
}

export default CurrentTimeBar
