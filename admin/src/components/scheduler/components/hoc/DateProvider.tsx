import React from 'react'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import useStore from '../../hooks/useStore'

interface AuxProps {
  children: React.ReactNode;
}

const DateProvider = ({ children }: AuxProps) => {
  const { locale } = useStore()

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={locale}>
      {children}
    </LocalizationProvider>
  )
}

export default DateProvider
