import React, { useEffect, useState } from 'react'
import { Button, FormControl, TextField } from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/date-based-price-edit-list'
import DatePicker from './DatePicker'
import * as UserService from '@/services/UserService'

import '@/assets/css/date-based-price-edit-list.css'

interface DateBasedPriceEditListProps {
  title?: string
  values?: bookcarsTypes.DateBasedPrice[]
  onAdd?: (value: bookcarsTypes.DateBasedPrice) => void
  onUpdate?: (value: bookcarsTypes.DateBasedPrice, index: number) => void
  onDelete?: (value: bookcarsTypes.DateBasedPrice, index: number) => void
}

const DateBasedPriceEditList = (
  {
    title,
    values: _values,
    onAdd,
    onUpdate,
    onDelete,
  }: DateBasedPriceEditListProps
) => {
  const [values, setValues] = useState<bookcarsTypes.DateBasedPrice[]>(_values || [])

  useEffect(() => {
    if (_values) {
      setValues(_values)
    }
  }, [_values])

  return (
    <div className="date-based-price-edit-list">
      {title && <span className="title">{title}</span>}

      <div className="rows">
        {
          values.map((dateBasedPrice, index) => (
            <div key={dateBasedPrice._id || index} className="row">

              <div className="date-range">
                <FormControl margin="dense" className="date">
                  <DatePicker
                    label={commonStrings.START_DATE}
                    required
                    onChange={(date) => {
                      if (date && dateBasedPrice.endDate && dateBasedPrice.endDate.getTime() < date.getTime()) {
                        dateBasedPrice.endDate = null
                      }

                      const __values = bookcarsHelper.clone(values) as bookcarsTypes.DateBasedPrice[]
                      __values[index].startDate = date
                      setValues(__values)
                      if (onUpdate) {
                        onUpdate(__values[index], index)
                      }
                    }}
                    language={UserService.getLanguage()}
                    variant="standard"
                    value={dateBasedPrice.startDate ? new Date(dateBasedPrice.startDate) : undefined}
                  />
                </FormControl>

                <FormControl margin="dense" className="date">
                  <DatePicker
                    label={commonStrings.END_DATE}
                    required
                    onChange={(date) => {
                      if (date && dateBasedPrice.startDate && dateBasedPrice.startDate.getTime() > date.getTime()) {
                        dateBasedPrice.startDate = null
                      }

                      const __values = bookcarsHelper.clone(values) as bookcarsTypes.DateBasedPrice[]
                      __values[index].endDate = date
                      setValues(__values)
                      if (onUpdate) {
                        onUpdate(__values[index], index)
                      }
                    }}
                    language={UserService.getLanguage()}
                    variant="standard"
                    value={dateBasedPrice.endDate ? new Date(dateBasedPrice.endDate) : undefined}
                  />
                </FormControl>
              </div>

              <TextField
                label={`${strings.DAILY_PRICE} (${commonStrings.CURRENCY})`}
                slotProps={{
                  htmlInput: {
                    inputMode: 'numeric',
                    pattern: '^\\d+(.\\d+)?$'
                  }
                }}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const __values = bookcarsHelper.clone(values) as bookcarsTypes.DateBasedPrice[]
                  __values[index].dailyPrice = e.target.value
                  setValues(__values)
                  if (onUpdate) {
                    onUpdate(__values[index], index)
                  }
                }}
                required
                variant="standard"
                autoComplete="off"
                value={dateBasedPrice.dailyPrice}
                fullWidth
                className="price"
              />

              <div className="row-actions">
                <Button
                  variant="outlined"
                  className="btn-margin-bottom"
                  size="small"
                  color="error"
                  onClick={() => {
                    if (onDelete) {
                      onDelete(dateBasedPrice, index)
                    } else {
                      values.splice(index, 1)
                      setValues(bookcarsHelper.clone(values))
                    }
                  }}
                >
                  {commonStrings.DELETE}
                </Button>
              </div>
            </div>
          ))
        }
      </div>

      <div className="global-actions">
        <Button
          variant="outlined"
          className="btn-margin-bottom"
          size="small"
          color="inherit"
          onClick={() => {
            const dateBasedPrice: bookcarsTypes.DateBasedPrice = {
              startDate: null,
              endDate: null,
              dailyPrice: '',
            }

            if (onAdd) {
              onAdd(dateBasedPrice)
            } else {
              values.push(dateBasedPrice)
            }
          }}
        >
          {strings.NEW_DATE_BASED_PRICE}
        </Button>
      </div>
    </div>
  )
}

export default DateBasedPriceEditList
