import React, { useState, useEffect, useRef } from 'react'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings as commonStrings } from '../lang/common'
import { strings } from '../lang/cars'
import Accordion from './Accordion'

import '../assets/css/fuel-policy-filter.css'

interface FuelPolicyFilterProps {
  className?: string
  collapse?: boolean
  onChange?: (value: bookcarsTypes.FuelPolicy[]) => void
}

const allTypes = [bookcarsTypes.FuelPolicy.FreeTank, bookcarsTypes.FuelPolicy.LikeForlike]

const FuelPolicyFilter = ({
  className,
  collapse,
  onChange
}: FuelPolicyFilterProps) => {
  const [allChecked, setAllChecked] = useState(false)
  const [values, setValues] = useState<bookcarsTypes.FuelPolicy[]>([])

  const automaticRef = useRef<HTMLInputElement>(null)
  const manualRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (allChecked && automaticRef.current && manualRef.current) {
      automaticRef.current.checked = true
      manualRef.current.checked = true
    }
  }, [allChecked])

  const handleOnChange = (_values: bookcarsTypes.FuelPolicy[]) => {
    if (onChange) {
      onChange(bookcarsHelper.clone(_values.length === 0 ? allTypes : _values))
    }
  }

  const handleCheckFreeTankChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      values.push(bookcarsTypes.FuelPolicy.FreeTank)

      if (values.length === 2) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.FuelPolicy.FreeTank),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setValues(values)

    handleOnChange(values)
  }

  const handleFreeTankClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckFreeTankChange(event)
  }

  const handleCheckLikeForlikeChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      values.push(bookcarsTypes.FuelPolicy.LikeForlike)

      if (values.length === 2) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.FuelPolicy.LikeForlike),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setValues(values)

    handleOnChange(values)
  }

  const handleLikeForlikeClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckLikeForlikeChange(event)
  }

  const handleUncheckAllChange = () => {
    if (allChecked) {
      // uncheck all
      if (automaticRef.current) {
        automaticRef.current.checked = false
      }
      if (manualRef.current) {
        manualRef.current.checked = false
      }

      setAllChecked(false)
      setValues([])
    } else {
      // check all
      if (automaticRef.current) {
        automaticRef.current.checked = true
      }
      if (manualRef.current) {
        manualRef.current.checked = true
      }

      const _values = [bookcarsTypes.FuelPolicy.FreeTank, bookcarsTypes.FuelPolicy.LikeForlike]

      setAllChecked(true)
      setValues(_values)

      if (onChange) {
        onChange(bookcarsHelper.clone(_values))
      }
    }
  }

  return (
    <Accordion title={strings.FUEL_POLICY} collapse={collapse} className={`${className ? `${className} ` : ''}fuel-policy-filter`}>
      <div className="filter-elements">
        <div className="filter-element">
          <input ref={automaticRef} type="checkbox" className="fuel-policy-checkbox" onChange={handleCheckFreeTankChange} />
          <span
            onClick={handleFreeTankClick}
            role="button"
            tabIndex={0}
          >
            {strings.FUEL_POLICY_FREE_TANK}
          </span>
        </div>
        <div className="filter-element">
          <input ref={manualRef} type="checkbox" className="fuel-policy-checkbox" onChange={handleCheckLikeForlikeChange} />
          <span
            onClick={handleLikeForlikeClick}
            role="button"
            tabIndex={0}
          >
            {strings.FUEL_POLICY_LIKE_FOR_LIKE}
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

export default FuelPolicyFilter
