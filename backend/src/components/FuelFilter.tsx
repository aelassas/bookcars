import React, { useState, useEffect, useRef } from 'react'
import * as bookcarsTypes from 'bookcars-types'
import * as bookcarsHelper from 'bookcars-helper'
import { strings as commonStrings } from '../lang/common'
import { strings } from '../lang/cars'
import Accordion from './Accordion'

import '../assets/css/fuel-filter.css'

interface FuelFilterProps {
  className?: string
  onChange?: (values: bookcarsTypes.CarType[]) => void
}

const FuelFilter = ({
  className,
  onChange
}: FuelFilterProps) => {
  const [allChecked, setAllChecked] = useState(true)
  const [values, setValues] = useState([bookcarsTypes.CarType.Diesel, bookcarsTypes.CarType.Gasoline])

  const dieselRef = useRef<HTMLInputElement>(null)
  const gasolineRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (allChecked && dieselRef.current && gasolineRef.current) {
      dieselRef.current.checked = true
      gasolineRef.current.checked = true
    }
  }, [allChecked])

  const handleCheckDieselChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      values.push(bookcarsTypes.CarType.Diesel)

      if (values.length === 2) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.CarType.Diesel),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setValues(values)

    if (onChange) {
      onChange(bookcarsHelper.clone(values))
    }
  }

  const handleDieselClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckDieselChange(event)
  }

  const handleCheckGasolineChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      values.push(bookcarsTypes.CarType.Gasoline)

      if (values.length === 2) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.CarType.Gasoline),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setValues(values)

    if (onChange) {
      onChange(bookcarsHelper.clone(values))
    }
  }

  const handleGasolineClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckGasolineChange(event)
  }

  const handleUncheckAllChange = () => {
    if (allChecked) {
      // uncheck all
      if (dieselRef.current) {
        dieselRef.current.checked = false
      }
      if (gasolineRef.current) {
        gasolineRef.current.checked = false
      }
      setAllChecked(false)
      setValues([])
    } else {
      // check all
      if (dieselRef.current) {
        dieselRef.current.checked = true
      }
      if (gasolineRef.current) {
        gasolineRef.current.checked = true
      }
      const _values = [bookcarsTypes.CarType.Diesel, bookcarsTypes.CarType.Gasoline]

      setAllChecked(true)
      setValues(_values)

      if (onChange) {
        onChange(bookcarsHelper.clone(_values))
      }
    }
  }

  return (
    <Accordion title={strings.ENGINE} className={`${className ? `${className} ` : ''}fuel-filter`}>
      <div className="filter-elements">
        <div className="filter-element">
          <input ref={dieselRef} type="checkbox" className="fuel-checkbox" onChange={handleCheckDieselChange} />
          <span role="button" tabIndex={0} onClick={handleDieselClick}>{strings.DIESEL}</span>
        </div>
        <div className="filter-element">
          <input ref={gasolineRef} type="checkbox" className="fuel-checkbox" onChange={handleCheckGasolineChange} />
          <span role="button" tabIndex={0} onClick={handleGasolineClick}>{strings.GASOLINE}</span>
        </div>
      </div>
      <div className="filter-actions">
        <span role="button" tabIndex={0} onClick={handleUncheckAllChange} className="uncheckall">
          {allChecked ? commonStrings.UNCHECK_ALL : commonStrings.CHECK_ALL}
        </span>
      </div>
    </Accordion>
  )
}

export default FuelFilter
