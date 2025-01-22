import React, { useState, useEffect, useRef } from 'react'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/cars'
import Accordion from './Accordion'

import '@/assets/css/fuel-policy-filter.css'

interface FuelPolicyFilterProps {
  className?: string
  collapse?: boolean
  onChange?: (value: bookcarsTypes.FuelPolicy[]) => void
}

const allTypes = bookcarsHelper.getAllFuelPolicies()

const FuelPolicyFilter = ({
  className,
  collapse,
  onChange
}: FuelPolicyFilterProps) => {
  const [allChecked, setAllChecked] = useState(false)
  const [values, setValues] = useState<bookcarsTypes.FuelPolicy[]>([])

  const freeTankRef = useRef<HTMLInputElement>(null)
  const likeForLikeRef = useRef<HTMLInputElement>(null)
  const fullToFullRef = useRef<HTMLInputElement>(null)
  const fullToEmptyRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (allChecked && freeTankRef.current && likeForLikeRef.current && fullToFullRef.current && fullToEmptyRef.current) {
      freeTankRef.current.checked = true
      likeForLikeRef.current.checked = true
      fullToFullRef.current.checked = true
      fullToEmptyRef.current.checked = true
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

      if (values.length === allTypes.length) {
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

  const handleCheckLikeForLikeChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      values.push(bookcarsTypes.FuelPolicy.LikeForLike)

      if (values.length === allTypes.length) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.FuelPolicy.LikeForLike),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setValues(values)

    handleOnChange(values)
  }

  const handleLikeForLikeClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckLikeForLikeChange(event)
  }

  const handleCheckFullToFullChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      values.push(bookcarsTypes.FuelPolicy.FullToFull)

      if (values.length === allTypes.length) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.FuelPolicy.FullToFull),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setValues(values)

    handleOnChange(values)
  }

  const handleFullToFullClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckFullToFullChange(event)
  }

  const handleCheckFullToEmptyChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      values.push(bookcarsTypes.FuelPolicy.FullToEmpty)

      if (values.length === allTypes.length) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.FuelPolicy.FullToEmpty),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setValues(values)

    handleOnChange(values)
  }

  const handleFullToEmptyClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckFullToEmptyChange(event)
  }

  const handleUncheckAllChange = () => {
    if (allChecked) {
      // uncheck all
      if (freeTankRef.current) {
        freeTankRef.current.checked = false
      }
      if (likeForLikeRef.current) {
        likeForLikeRef.current.checked = false
      }
      if (fullToFullRef.current) {
        fullToFullRef.current.checked = false
      }
      if (fullToEmptyRef.current) {
        fullToEmptyRef.current.checked = false
      }

      setAllChecked(false)
      setValues([])
    } else {
      // check all
      if (freeTankRef.current) {
        freeTankRef.current.checked = true
      }
      if (likeForLikeRef.current) {
        likeForLikeRef.current.checked = true
      }
      if (fullToFullRef.current) {
        fullToFullRef.current.checked = true
      }
      if (fullToEmptyRef.current) {
        fullToEmptyRef.current.checked = true
      }

      const _values = allTypes

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
          <input ref={freeTankRef} type="checkbox" className="fuel-policy-checkbox" onChange={handleCheckFreeTankChange} />
          <span
            onClick={handleFreeTankClick}
            role="button"
            tabIndex={0}
          >
            {strings.FUEL_POLICY_FREE_TANK}
          </span>
        </div>
        <div className="filter-element">
          <input ref={likeForLikeRef} type="checkbox" className="fuel-policy-checkbox" onChange={handleCheckLikeForLikeChange} />
          <span
            onClick={handleLikeForLikeClick}
            role="button"
            tabIndex={0}
          >
            {strings.FUEL_POLICY_LIKE_FOR_LIKE}
          </span>
        </div>
        <div className="filter-element">
          <input ref={fullToFullRef} type="checkbox" className="fuel-policy-checkbox" onChange={handleCheckFullToFullChange} />
          <span
            onClick={handleFullToFullClick}
            role="button"
            tabIndex={0}
          >
            {strings.FUEL_POLICY_FULL_TO_FULL}
          </span>
        </div>
        <div className="filter-element">
          <input ref={fullToEmptyRef} type="checkbox" className="fuel-policy-checkbox" onChange={handleCheckFullToEmptyChange} />
          <span
            onClick={handleFullToEmptyClick}
            role="button"
            tabIndex={0}
          >
            {strings.FUEL_POLICY_FULL_TO_EMPTY}
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
