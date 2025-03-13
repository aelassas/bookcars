import React, { useState, useEffect, useRef } from 'react'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/car-range-filter'
import * as helper from '@/common/helper'
import Accordion from './Accordion'

import '@/assets/css/car-range-filter.css'

interface CarRangeFilterProps {
  className?: string
  collapse?: boolean
  onChange?: (value: bookcarsTypes.CarRange[]) => void
}

const allRanges = bookcarsHelper.getAllRanges()

const CarRangeFilter = ({
  className,
  collapse,
  onChange
}: CarRangeFilterProps) => {
  const [allChecked, setAllChecked] = useState(false)
  const [values, setValues] = useState<bookcarsTypes.CarRange[]>([])

  const miniRef = useRef<HTMLInputElement>(null)
  const midiRef = useRef<HTMLInputElement>(null)
  const maxiRef = useRef<HTMLInputElement>(null)
  const scooterRef = useRef<HTMLInputElement>(null)
  const busRef = useRef<HTMLInputElement>(null)
  const truckRef = useRef<HTMLInputElement>(null)
  const caravanRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (allChecked && miniRef.current && midiRef.current && maxiRef.current && scooterRef.current && busRef.current && truckRef.current && caravanRef.current) {
      miniRef.current.checked = true
      midiRef.current.checked = true
      maxiRef.current.checked = true
      scooterRef.current.checked = true
      busRef.current.checked = true
      truckRef.current.checked = true
      caravanRef.current.checked = true
    }
  }, [allChecked])

  const handleOnChange = (_values: bookcarsTypes.CarRange[]) => {
    if (onChange) {
      onChange(bookcarsHelper.clone(_values.length === 0 ? allRanges : _values))
    }
  }

  const handleCheckMiniChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      values.push(bookcarsTypes.CarRange.Mini)

      if (values.length === allRanges.length) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.CarRange.Mini),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setValues(values)

    handleOnChange(values)
  }

  const handleMiniClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckMiniChange(event)
  }

  const handleCheckMidiChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      values.push(bookcarsTypes.CarRange.Midi)

      if (values.length === allRanges.length) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.CarRange.Midi),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setValues(values)

    handleOnChange(values)
  }

  const handleMidiClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckMidiChange(event)
  }

  const handleCheckMaxiChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      values.push(bookcarsTypes.CarRange.Maxi)

      if (values.length === allRanges.length) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.CarRange.Maxi),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setValues(values)

    handleOnChange(values)
  }

  const handleMaxiClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckMaxiChange(event)
  }

  const handleCheckScooterChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      values.push(bookcarsTypes.CarRange.Scooter)

      if (values.length === allRanges.length) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.CarRange.Scooter),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setValues(values)

    handleOnChange(values)
  }

  const handleScooterClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckScooterChange(event)
  }

  const handleCheckBusChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      values.push(bookcarsTypes.CarRange.Bus)

      if (values.length === allRanges.length) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.CarRange.Bus),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setValues(values)

    handleOnChange(values)
  }

  const handleBusClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckBusChange(event)
  }

  const handleCheckTruckChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      values.push(bookcarsTypes.CarRange.Truck)

      if (values.length === allRanges.length) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.CarRange.Truck),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setValues(values)

    handleOnChange(values)
  }

  const handleTruckClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckTruckChange(event)
  }

  const handleCheckCaravanChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      values.push(bookcarsTypes.CarRange.Caravan)

      if (values.length === allRanges.length) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.CarRange.Caravan),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setValues(values)

    handleOnChange(values)
  }

  const handleCaravanClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckCaravanChange(event)
  }

  const handleUncheckAllChange = () => {
    if (allChecked) {
      // uncheck all
      if (miniRef.current) {
        miniRef.current.checked = false
      }
      if (midiRef.current) {
        midiRef.current.checked = false
      }
      if (maxiRef.current) {
        maxiRef.current.checked = false
      }
      if (scooterRef.current) {
        scooterRef.current.checked = false
      }
      if (busRef.current) {
        busRef.current.checked = false
      }
      if (truckRef.current) {
        truckRef.current.checked = false
      }
      if (caravanRef.current) {
        caravanRef.current.checked = false
      }

      setAllChecked(false)
      setValues([])
    } else {
      // check all
      if (miniRef.current) {
        miniRef.current.checked = true
      }
      if (midiRef.current) {
        midiRef.current.checked = true
      }
      if (maxiRef.current) {
        maxiRef.current.checked = true
      }
      if (scooterRef.current) {
        scooterRef.current.checked = true
      }
      if (busRef.current) {
        busRef.current.checked = true
      }
      if (truckRef.current) {
        truckRef.current.checked = true
      }
      if (caravanRef.current) {
        caravanRef.current.checked = true
      }

      setAllChecked(true)
      setValues(allRanges)

      if (onChange) {
        onChange(bookcarsHelper.clone(allRanges))
      }
    }
  }

  return (
    <Accordion title={strings.RANGE} collapse={collapse} className={`${className ? `${className} ` : ''}range-filter`}>
      <div className="filter-elements">
        <div className="filter-element">
          <input ref={miniRef} type="checkbox" className="range-checkbox" onChange={handleCheckMiniChange} />
          <span
            onClick={handleMiniClick}
            role="button"
            tabIndex={0}
          >
            {helper.getCarRange(bookcarsTypes.CarRange.Mini)}
          </span>
        </div>
        <div className="filter-element">
          <input ref={midiRef} type="checkbox" className="range-checkbox" onChange={handleCheckMidiChange} />
          <span
            onClick={handleMidiClick}
            role="button"
            tabIndex={0}
          >
            {helper.getCarRange(bookcarsTypes.CarRange.Midi)}
          </span>
        </div>
        <div className="filter-element">
          <input ref={maxiRef} type="checkbox" className="range-checkbox" onChange={handleCheckMaxiChange} />
          <span
            onClick={handleMaxiClick}
            role="button"
            tabIndex={0}
          >
            {helper.getCarRange(bookcarsTypes.CarRange.Maxi)}
          </span>
        </div>
        <div className="filter-element">
          <input ref={scooterRef} type="checkbox" className="range-checkbox" onChange={handleCheckScooterChange} />
          <span
            onClick={handleScooterClick}
            role="button"
            tabIndex={0}
          >
            {helper.getCarRange(bookcarsTypes.CarRange.Scooter)}
          </span>
        </div>

        <div className="filter-element">
          <input ref={busRef} type="checkbox" className="range-checkbox" onChange={handleCheckBusChange} />
          <span
            onClick={handleBusClick}
            role="button"
            tabIndex={0}
          >
            {helper.getCarRange(bookcarsTypes.CarRange.Bus)}
          </span>
        </div>
        <div className="filter-element">
          <input ref={truckRef} type="checkbox" className="range-checkbox" onChange={handleCheckTruckChange} />
          <span
            onClick={handleTruckClick}
            role="button"
            tabIndex={0}
          >
            {helper.getCarRange(bookcarsTypes.CarRange.Truck)}
          </span>
        </div>
        <div className="filter-element">
          <input ref={caravanRef} type="checkbox" className="range-checkbox" onChange={handleCheckCaravanChange} />
          <span
            onClick={handleCaravanClick}
            role="button"
            tabIndex={0}
          >
            {helper.getCarRange(bookcarsTypes.CarRange.Caravan)}
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

export default CarRangeFilter
