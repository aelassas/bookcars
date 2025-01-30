import React from 'react'
import { Typography } from '@mui/material'
import { format, Locale } from 'date-fns'
import { isTimeZonedToday } from '../../helpers/generals'
import useStore from '../../hooks/useStore'

interface TodayTypoProps {
  date: Date;
  onClick?(day: Date): void;
  locale: Locale;
}

const TodayTypo = ({ date, onClick, locale }: TodayTypoProps) => {
  const { timeZone } = useStore()
  const today = isTimeZonedToday({ dateLeft: date, timeZone })

  return (
    <div>
      <Typography
        style={{
          fontWeight: today ? 'bold' : 'inherit',
        }}
        color={today ? 'primary' : 'inherit'}
        className={onClick ? 'rs__hover__op' : ''}
        onClick={(e) => {
          e.stopPropagation()
          if (onClick) onClick(date)
        }}
      >
        {format(date, 'dd', { locale })}
      </Typography>
      <Typography
        color={today ? 'primary' : 'inherit'}
        style={{
          fontWeight: today ? 'bold' : 'inherit',
          fontSize: 11,
        }}
      >
        {format(date, 'eee', { locale })}
      </Typography>
    </div>
  )
}

export default TodayTypo
