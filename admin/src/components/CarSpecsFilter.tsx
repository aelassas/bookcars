import React, { useState, useEffect, useRef } from 'react'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/car-specs'
import Accordion from './Accordion'

import '@/assets/css/car-specs-filter.css'

interface CarSpecsFilterProps {
  className?: string
  collapse?: boolean
  onChange?: (value: bookcarsTypes.CarSpecs) => void
}

const CarSpecsFilter = ({
  className,
  collapse,
  onChange
}: CarSpecsFilterProps) => {
  const [allChecked, setAllChecked] = useState(false)
  const [value, setValue] = useState<bookcarsTypes.CarSpecs>({})

  const airconRef = useRef<HTMLInputElement>(null)
  const moreThanFourDoorsRef = useRef<HTMLInputElement>(null)
  const moreThanFiveSeatsRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (allChecked && airconRef.current && moreThanFourDoorsRef.current && moreThanFiveSeatsRef.current) {
      airconRef.current.checked = true
      moreThanFourDoorsRef.current.checked = true
      moreThanFiveSeatsRef.current.checked = true
    }
  }, [allChecked])

  const handleCheckAirconChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    const _value = bookcarsHelper.clone(value) as bookcarsTypes.CarSpecs

    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      _value.aircon = true

      if (value.aircon && value.moreThanFourDoors && value.moreThanFiveSeats) {
        setAllChecked(true)
      }
    } else {
      _value.aircon = undefined

      if (!value.aircon || !value.moreThanFourDoors || !value.moreThanFiveSeats) {
        setAllChecked(false)
      }
    }

    setValue(_value)

    if (onChange) {
      onChange(_value)
    }
  }

  const handleAirconClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckAirconChange(event)
  }

  const handleCheckMoreThanFourDoorsChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    const _value = bookcarsHelper.clone(value) as bookcarsTypes.CarSpecs

    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      _value.moreThanFourDoors = true

      if (value.aircon && value.moreThanFourDoors && value.moreThanFiveSeats) {
        setAllChecked(true)
      }
    } else {
      _value.moreThanFourDoors = undefined
      if (!value.aircon || !value.moreThanFourDoors || !value.moreThanFiveSeats) {
        setAllChecked(false)
      }
    }

    setValue(_value)

    if (onChange) {
      onChange(_value)
    }
  }

  const handleMoreThanFourDoorsClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckMoreThanFourDoorsChange(event)
  }

  const handleCheckMoreThanFiveSeatsChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    const _value = bookcarsHelper.clone(value) as bookcarsTypes.CarSpecs

    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      _value.moreThanFiveSeats = true

      if (value.aircon && value.moreThanFiveSeats && value.moreThanFiveSeats) {
        setAllChecked(true)
      }
    } else {
      _value.moreThanFiveSeats = undefined
      if (!value.aircon || !value.moreThanFiveSeats || !value.moreThanFiveSeats) {
        setAllChecked(false)
      }
    }

    setValue(_value)

    if (onChange) {
      onChange(_value)
    }
  }

  const handleMoreThanFiveSeatsClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckMoreThanFiveSeatsChange(event)
  }

  const handleUncheckAllChange = () => {
    if (allChecked) {
      // uncheck all
      if (airconRef.current) {
        airconRef.current.checked = false
      }
      if (moreThanFourDoorsRef.current) {
        moreThanFourDoorsRef.current.checked = false
      }
      if (moreThanFiveSeatsRef.current) {
        moreThanFiveSeatsRef.current.checked = false
      }

      setAllChecked(false)
      const _value: bookcarsTypes.CarSpecs = {}
      setValue(_value)

      if (onChange) {
        onChange(_value)
      }
    } else {
      // check all
      if (airconRef.current) {
        airconRef.current.checked = true
      }
      if (moreThanFourDoorsRef.current) {
        moreThanFourDoorsRef.current.checked = true
      }
      if (moreThanFiveSeatsRef.current) {
        moreThanFiveSeatsRef.current.checked = true
      }

      setAllChecked(true)
      const _value: bookcarsTypes.CarSpecs = { aircon: true, moreThanFourDoors: true, moreThanFiveSeats: true }
      setValue(_value)

      if (onChange) {
        onChange(_value)
      }
    }
  }

  return (
    <Accordion title={strings.CAR_SPECS} collapse={collapse} className={`${className ? `${className} ` : ''}car-specs-filter`}>
      <div className="filter-elements">
        <div className="filter-element">
          <input ref={airconRef} type="checkbox" className="car-specs-checkbox" onChange={handleCheckAirconChange} />
          <span
            onClick={handleAirconClick}
            role="button"
            tabIndex={0}
          >
            {strings.AIRCON}
          </span>
        </div>
        <div className="filter-element">
          <input ref={moreThanFourDoorsRef} type="checkbox" className="car-specs-checkbox" onChange={handleCheckMoreThanFourDoorsChange} />
          <span
            onClick={handleMoreThanFourDoorsClick}
            role="button"
            tabIndex={0}
          >
            {strings.MORE_THAN_FOOR_DOORS}
          </span>
        </div>
        <div className="filter-element">
          <input ref={moreThanFiveSeatsRef} type="checkbox" className="car-specs-checkbox" onChange={handleCheckMoreThanFiveSeatsChange} />
          <span
            onClick={handleMoreThanFiveSeatsClick}
            role="button"
            tabIndex={0}
          >
            {strings.MORE_THAN_FIVE_SEATS}
          </span>
        </div>
      </div>
      <div className="filter-actions">
        <span
          onClick={handleUncheckAllChange}
          className="uncheckall"
          role="button"
          tabIndex={0}
        >
          {allChecked ? commonStrings.UNCHECK_ALL : commonStrings.CHECK_ALL}
        </span>
      </div>
    </Accordion>
  )
}

export default CarSpecsFilter
