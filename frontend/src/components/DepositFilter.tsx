import React, { useEffect, useRef } from 'react'
import { strings as commonStrings } from '@/lang/common'
import env from '@/config/env.config'
import { strings } from '@/lang/cars'
import Accordion from './Accordion'

import '@/assets/css/deposit-filter.css'

interface DepositFilterProps {
  className?: string
  collapse?: boolean
  onChange?: (value: number) => void
}

const DepositFilter = ({
  className,
  collapse,
  onChange
}: DepositFilterProps) => {
  const depositValue1Ref = useRef<HTMLInputElement>(null)
  const depositValue2Ref = useRef<HTMLInputElement>(null)
  const depositValue3Ref = useRef<HTMLInputElement>(null)
  const depositAllRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (depositAllRef.current) {
      depositAllRef.current.checked = true
    }
  }, [])

  const handleAllDepositChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      const value = -1
      if (depositValue1Ref.current) {
        depositValue1Ref.current.checked = false
      }
      if (depositValue2Ref.current) {
        depositValue2Ref.current.checked = false
      }
      if (depositValue3Ref.current) {
        depositValue3Ref.current.checked = false
      }
      if (onChange) {
        onChange(value)
      }
    }
  }

  const handleAllDepositClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    if (!checkbox.checked) {
      checkbox.checked = !checkbox.checked
      const event = e
      event.currentTarget = checkbox
      handleAllDepositChange(event)
    }
  }

  const handleDepositLessThanValue1Change = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      const value = env.DEPOSIT_FILTER_VALUE_1
      if (depositAllRef.current) {
        depositAllRef.current.checked = false
      }
      if (depositValue2Ref.current) {
        depositValue2Ref.current.checked = false
      }
      if (depositValue3Ref.current) {
        depositValue3Ref.current.checked = false
      }
      if (onChange) {
        onChange(value)
      }
    }
  }

  const handleDepositLessThanValue1Click = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    if (!checkbox.checked) {
      checkbox.checked = !checkbox.checked
      const event = e
      event.currentTarget = checkbox
      handleDepositLessThanValue1Change(event)
    }
  }

  const handleDepositLessThanValue2Change = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      const value = env.DEPOSIT_FILTER_VALUE_2
      if (depositAllRef.current) {
        depositAllRef.current.checked = false
      }
      if (depositValue1Ref.current) {
        depositValue1Ref.current.checked = false
      }
      if (depositValue3Ref.current) {
        depositValue3Ref.current.checked = false
      }
      if (onChange) {
        onChange(value)
      }
    }
  }

  const handleDepositLessThanValue2Click = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    if (!checkbox.checked) {
      checkbox.checked = !checkbox.checked
      const event = e
      event.currentTarget = checkbox
      handleDepositLessThanValue2Change(event)
    }
  }

  const handleDepositLessThanValue3Change = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      const value = env.DEPOSIT_FILTER_VALUE_3

      if (depositAllRef.current) {
        depositAllRef.current.checked = false
      }
      if (depositValue1Ref.current) {
        depositValue1Ref.current.checked = false
      }
      if (depositValue2Ref.current) {
        depositValue2Ref.current.checked = false
      }

      if (onChange) {
        onChange(value)
      }
    }
  }

  const handleDepositLessThanValue3Click = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    if (!checkbox.checked) {
      checkbox.checked = !checkbox.checked
      const event = e
      event.currentTarget = checkbox
      handleDepositLessThanValue3Change(event)
    }
  }

  return (
    <Accordion title={strings.DEPOSIT} collapse={collapse} className={`${className ? `${className} ` : ''}deposit-filter`}>
      <div className="filter-elements">
        <div className="filter-element">
          <input ref={depositValue1Ref} type="radio" className="deposit-radio" onChange={handleDepositLessThanValue1Change} />
          <span
            onClick={handleDepositLessThanValue1Click}
            role="button"
            tabIndex={0}
          >
            {strings.LESS_THAN_VALUE_1}
          </span>
        </div>
        <div className="filter-element">
          <input ref={depositValue2Ref} type="radio" className="deposit-radio" onChange={handleDepositLessThanValue2Change} />
          <span
            onClick={handleDepositLessThanValue2Click}
            role="button"
            tabIndex={0}
          >
            {strings.LESS_THAN_VALUE_2}
          </span>
        </div>
        <div className="filter-element">
          <input ref={depositValue3Ref} type="radio" className="deposit-radio" onChange={handleDepositLessThanValue3Change} />
          <span
            onClick={handleDepositLessThanValue3Click}
            role="button"
            tabIndex={0}
          >
            {strings.LESS_THAN_VALUE_3}
          </span>
        </div>
        <div className="filter-element">
          <input ref={depositAllRef} type="radio" className="deposit-radio" onChange={handleAllDepositChange} />
          <span
            onClick={handleAllDepositClick}
            role="button"
            tabIndex={0}
          >
            {commonStrings.ALL}
          </span>
        </div>
      </div>
    </Accordion>
  )
}

export default DepositFilter
