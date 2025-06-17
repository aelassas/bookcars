import React, { useEffect, useState } from 'react'
import { Button, FormControl, Input, InputLabel } from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/parking-spot-edit-list'
import env from '@/config/env.config'
import PositionInput from './PositionInput'

import '@/assets/css/parking-spot-edit-list.css'

interface ParkingSpotEditListProps {
  title?: string
  values?: bookcarsTypes.ParkingSpot[]
  onAdd?: (value: bookcarsTypes.ParkingSpot) => void
  onUpdate?: (value: bookcarsTypes.ParkingSpot, index: number) => void
  onDelete?: (value: bookcarsTypes.ParkingSpot, index: number) => void
}

const ParkingSpotEditList = (
  {
    title,
    values: _values,
    onAdd,
    onUpdate,
    onDelete,
  }: ParkingSpotEditListProps
) => {
  const [values, setValues] = useState(_values || [])

  useEffect(() => {
    if (_values) {
      setValues(_values)
    }
  }, [_values])

  return (
    <div className="parking-spot-edit-list">
      {title && <span className="title">{title}</span>}

      <div className="rows">
        {
          values.map((parkingSpot, index) => (
            <div key={parkingSpot._id || index} className="row">

              {parkingSpot.values && env._LANGUAGES.map((language, langIndex) => (
                <FormControl key={language.code} fullWidth margin="dense">
                  <InputLabel className="required">{`${commonStrings.NAME} (${language.label})`}</InputLabel>
                  <Input
                    type="text"
                    value={(parkingSpot.values![langIndex] && parkingSpot.values![langIndex].value) || ''}
                    required
                    onChange={(e) => {
                      const __values = bookcarsHelper.clone(values) as bookcarsTypes.ParkingSpot[]
                      const __parkingSpot = __values[index]
                      if (__parkingSpot._id) {
                        __parkingSpot.values![langIndex].value = e.target.value
                      } else {
                        __parkingSpot.values![langIndex] = {
                          language: language.code,
                          value: e.target.value,
                        }
                      }
                      if (onUpdate) {
                        onUpdate(__parkingSpot, index)
                      }
                      setValues(__values)
                    }}
                    autoComplete="off"
                  />
                </FormControl>
              ))}

              <FormControl fullWidth margin="dense">
                <InputLabel className="required">{commonStrings.LATITUDE}</InputLabel>
                <PositionInput
                  value={parkingSpot.latitude}
                  required
                  onChange={(e) => {
                    const __values = bookcarsHelper.clone(values) as bookcarsTypes.ParkingSpot[]
                    __values[index].latitude = e.target.value
                    setValues(__values)
                    if (onUpdate) {
                      onUpdate(__values[index], index)
                    }
                  }}
                />
              </FormControl>

              <FormControl fullWidth margin="dense">
                <InputLabel className="required">{commonStrings.LONGITUDE}</InputLabel>
                <PositionInput
                  value={parkingSpot.longitude}
                  required
                  onChange={(e) => {
                    const __values = bookcarsHelper.clone(values) as bookcarsTypes.ParkingSpot[]
                    __values[index].longitude = e.target.value
                    setValues(__values)
                    if (onUpdate) {
                      onUpdate(__values[index], index)
                    }
                  }}
                />
              </FormControl>

              <div className="row-actions">
                <Button
                  variant="outlined"
                  className="btn-margin-bottom"
                  size="small"
                  color="error"
                  onClick={() => {
                    if (onDelete) {
                      onDelete(parkingSpot, index)
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
            const parkingSpot: bookcarsTypes.ParkingSpot = {
              latitude: '',
              longitude: '',
              values: [],
            }

            if (onAdd) {
              onAdd(parkingSpot)
            } else {
              values.push(parkingSpot)
            }
          }}
        >
          {strings.NEW_PARKING_SPOT}
        </Button>
      </div>
    </div>
  )
}

export default ParkingSpotEditList
