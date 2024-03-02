import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextFieldVariants
} from '@mui/material'
import * as bookcarsTypes from 'bookcars-types'
import env from '../config/env.config'
import { strings as commonStrings } from '../lang/common'
import { strings as bfStrings } from '../lang/booking-filter'
import { strings as blStrings } from '../lang/booking-list'
import { strings } from '../lang/booking-car-list'
import * as CarService from '../services/CarService'
import MultipleSelect from './MultipleSelect'
import * as helper from '../common/helper'

interface CarSelectListProps {
  label?: string
  required?: boolean
  multiple?: boolean
  variant?: TextFieldVariants
  value?: bookcarsTypes.Car
  company: string
  pickupLocation: string
  readOnly?: boolean
  onChange?: (values: bookcarsTypes.Car[]) => void
}

const CarSelectList = ({
  label,
  required,
  multiple,
  variant,
  value,
  company,
  pickupLocation,
  readOnly,
  onChange
}: CarSelectListProps) => {
  const [init, setInit] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetch, setFetch] = useState(true)
  const [currentCompany, setCurrentCompany] = useState('-1')
  const [currentPickupLocation, setCurrentPickupLocation] = useState('-1')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [cars, setCars] = useState<bookcarsTypes.Car[]>([])
  const [openDialog, setOpenDialog] = useState(false)
  const [closeDialog, setCloseDialog] = useState(false)
  const [reload, setReload] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState<bookcarsTypes.Car[]>([])

  useEffect(() => {
    if (value) {
      setSelectedOptions([value])
    } else {
      setSelectedOptions([])
    }
  }, [value])

  useEffect(() => {
    if (company && currentCompany !== company) {
      setCurrentCompany(company || '-1')

      if (currentCompany !== '-1' && currentPickupLocation !== '-1') {
        setReload(true)
        setSelectedOptions([])
        setPage(1)
        setKeyword('')

        if (onChange) {
          onChange([])
        }
      }
    }
  }, [currentCompany, company, currentPickupLocation, onChange])

  useEffect(() => {
    if (pickupLocation && currentPickupLocation !== pickupLocation) {
      setCurrentPickupLocation(pickupLocation || '-1')

      if (currentCompany !== '-1' && currentPickupLocation !== '-1') {
        setReload(true)
        setSelectedOptions([])
        setPage(1)
        setKeyword('')

        if (onChange) {
          onChange([])
        }
      }
    }
  }, [currentPickupLocation, currentCompany, pickupLocation, onChange])

  useEffect(() => {
    if (currentPickupLocation !== pickupLocation) {
      setCurrentPickupLocation(pickupLocation)
    }
  }, [currentPickupLocation, pickupLocation])

  const handleChange = (values: bookcarsTypes.Car[]) => {
    if (onChange) {
      onChange(values)
    }
  }

  const fetchData = async (_page: number, _keyword: string, _company: string, _pickupLocation: string) => {
    try {
      const payload: bookcarsTypes.GetBookingCarsPayload = { company: _company, pickupLocation: _pickupLocation }

      if (closeDialog) {
        setCloseDialog(false)
      }

      if (_company === '-1' || _pickupLocation === '-1') {
        setOpenDialog(true)
        return
      }

      setLoading(true)

      const data = await CarService.getBookingCars(_keyword, payload, _page, env.PAGE_SIZE)
      const _cars = _page === 1 ? data : [...cars, ...data]

      setCars(_cars)
      setFetch(data.length > 0)
      setReload(false)
      setInit(true)
      setLoading(false)
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setCloseDialog(true)
  }

  return (
    <div>
      <MultipleSelect
        label={label}
        callbackFromMultipleSelect={handleChange}
        options={cars}
        selectedOptions={selectedOptions}
        loading={loading}
        required={required}
        multiple={multiple}
        type={bookcarsTypes.RecordType.Car}
        variant={variant || 'standard'}
        readOnly={readOnly}
        ListboxProps={{
          onScroll: (event) => {
            const listboxNode = event.currentTarget
            if (fetch && !loading && listboxNode.scrollTop + listboxNode.clientHeight >= listboxNode.scrollHeight - env.PAGE_OFFSET) {
              const p = page + 1
              setPage(p)
              fetchData(p, keyword, currentCompany, currentPickupLocation)
            }
          },
        }}
        onOpen={() => {
          if (!init || reload) {
            const p = 1
            setCars([])
            setPage(p)
            fetchData(p, keyword, currentCompany, currentPickupLocation)
          }
        }}
        onInputChange={(event: React.SyntheticEvent<Element, Event>) => {
          const _value = (event && event.target && 'value' in event.target && event.target.value as string) || ''

          if (_value !== keyword) {
            setCars([])
            setPage(1)
            setKeyword(_value)
            fetchData(1, _value, currentCompany, currentPickupLocation)
          }
        }}
        onClear={() => {
          setCars([])
          setPage(1)
          setKeyword('')
          setFetch(true)
          fetchData(1, '', currentCompany, currentPickupLocation)
        }}
      />

      <Dialog disableEscapeKeyDown maxWidth="xs" open={openDialog}>
        <DialogTitle className="dialog-header">{commonStrings.INFO}</DialogTitle>
        <DialogContent className="dialog-content">
          {currentCompany === '-1' && currentPickupLocation === '-1' ? (
            `${strings.REQUIRED_FIELDS}${blStrings.COMPANY} ${commonStrings.AND} ${bfStrings.PICKUP_LOCATION}`
          ) : currentCompany === '-1' ? (
            `${strings.REQUIRED_FIELD}${blStrings.COMPANY}`
          ) : currentPickupLocation === '-1' ? (
            `${strings.REQUIRED_FIELD}${bfStrings.PICKUP_LOCATION}`
          ) : (
            ''
          )}
        </DialogContent>
        <DialogActions className="dialog-actions">
          <Button onClick={handleCloseDialog} variant="contained" className="btn-secondary">
            {commonStrings.CLOSE}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default CarSelectList
