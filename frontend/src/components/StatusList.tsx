import React, { useState, useEffect, CSSProperties } from 'react'
import {
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  TextFieldVariants
} from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import { strings as commonStrings } from '@/lang/common'
import * as helper from '@/utils/helper'

import '@/assets/css/status-list.css'

interface StatusListProps {
  value?: string
  label?: string
  required?: boolean
  variant?: TextFieldVariants
  disabled?: boolean
  style?: CSSProperties
  onChange?: (value: bookcarsTypes.BookingStatus) => void
}

const StatusList = ({
  value: statusListValue,
  label,
  required,
  variant,
  disabled,
  style,
  onChange
}: StatusListProps) => {
  const [value, setValue] = useState('')

  useEffect(() => {
    if (statusListValue && statusListValue !== value) {
      setValue(statusListValue)
    }
  }, [statusListValue, value])

  const handleChange = (e: SelectChangeEvent<string>) => {
    setValue(e.target.value)

    if (onChange) {
      onChange(e.target.value as bookcarsTypes.BookingStatus)
    }
  }

  return (
    <div style={style || {}}>
      {disabled ? (
        <span className={`bs-s-sv bs-s-${value}`} style={{ marginTop: 5 }}>
          {helper.getBookingStatus(value as bookcarsTypes.BookingStatus)}
        </span>
      ) : (
        <>
          <InputLabel className={required ? 'required' : ''}>{label}</InputLabel>
          <Select
            label={label}
            value={value}
            onChange={handleChange}
            variant={variant || 'standard'}
            required={required}
            fullWidth
            renderValue={(_value) => <span className={`bs-s-sv bs-s-${_value}`}>{helper.getBookingStatus(_value as bookcarsTypes.BookingStatus)}</span>}
          >
            <MenuItem value={bookcarsTypes.BookingStatus.Void} className="bs-s bs-s-void">
              {commonStrings.BOOKING_STATUS_VOID}
            </MenuItem>
            <MenuItem value={bookcarsTypes.BookingStatus.Pending} className="bs-s bs-s-pending">
              {commonStrings.BOOKING_STATUS_PENDING}
            </MenuItem>
            <MenuItem value={bookcarsTypes.BookingStatus.Deposit} className="bs-s bs-s-deposit">
              {commonStrings.BOOKING_STATUS_DEPOSIT}
            </MenuItem>
            <MenuItem value={bookcarsTypes.BookingStatus.Paid} className="bs-s bs-s-paid">
              {commonStrings.BOOKING_STATUS_PAID}
            </MenuItem>
            <MenuItem value={bookcarsTypes.BookingStatus.Reserved} className="bs-s bs-s-reserved">
              {commonStrings.BOOKING_STATUS_RESERVED}
            </MenuItem>
            <MenuItem value={bookcarsTypes.BookingStatus.Cancelled} className="bs-s bs-s-cancelled">
              {commonStrings.BOOKING_STATUS_CANCELLED}
            </MenuItem>
          </Select>
        </>
      )}
    </div>
  )
}

export default StatusList
