import React, { useState } from 'react'
import { DateCalendar } from '@mui/x-date-pickers'
import { Button, Popover } from '@mui/material'
import { format, addDays } from 'date-fns'
import DateProvider from '../hoc/DateProvider'
import { LocaleArrow } from '../common/LocaleArrow'
import useStore from '../../hooks/useStore'

interface DayDateBtnProps {
  selectedDate: Date;
  onChange(value: Date): void;
}

const DayDateBtn = ({ selectedDate, onChange }: DayDateBtnProps) => {
  const { locale, navigationPickerProps } = useStore()
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }
  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleChange = (e: Date | null) => {
    onChange(e || new Date())
    handleClose()
  }

  const handlePrev = () => {
    const prevDay = addDays(selectedDate, -1)
    onChange(prevDay)
  }
  const handleNext = () => {
    const nexDay = addDays(selectedDate, 1)
    onChange(nexDay)
  }
  return (
    <>
      <LocaleArrow type="prev" onClick={handlePrev} aria-label="previous day" />
      <Button style={{ padding: 4 }} onClick={handleOpen} aria-label="selected date">
        {format(selectedDate, 'dd MMMM yyyy', { locale })}
      </Button>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <DateProvider>
          <DateCalendar
            {...navigationPickerProps}
            openTo="day"
            views={['month', 'day']}
            value={selectedDate}
            onChange={handleChange}
          />
        </DateProvider>
      </Popover>
      <LocaleArrow type="next" onClick={handleNext} aria-label="next day" />
    </>
  )
}

export { DayDateBtn }
