import React, { useEffect, useRef } from 'react'
import { strings as commonStrings } from '../lang/common'
import { strings } from '../lang/cars'
import Accordion from './Accordion'

import '../assets/css/deposit-filter.css'

const DepositFilter = (
  {
    className,
    onChange
  }: {
    className?: string
    onChange: (value: number) => void
  }
) => {
  const deposit2500Ref = useRef<HTMLInputElement>(null)
  const deposit5000Ref = useRef<HTMLInputElement>(null)
  const deposit7500Ref = useRef<HTMLInputElement>(null)
  const depositAllRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (depositAllRef.current) {
      depositAllRef.current.checked = true
    }
  }, [])

  const handleAllDepositClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    if (!checkbox.checked) {
      checkbox.checked = !checkbox.checked
      const event = e
      event.currentTarget = checkbox
      handleAllDepositChange(event)
    }
  }

  const handleAllDepositChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      const value = -1
      if (deposit2500Ref.current) {
        deposit2500Ref.current.checked = false
      }
      if (deposit5000Ref.current) {
        deposit5000Ref.current.checked = false
      }
      if (deposit7500Ref.current) {
        deposit7500Ref.current.checked = false
      }
      if (onChange) {
        onChange(value)
      }
    }
  }

  const handleDepositLessThan2500Click = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    if (!checkbox.checked) {
      checkbox.checked = !checkbox.checked
      const event = e
      event.currentTarget = checkbox
      handleDepositLessThan2500Change(event)
    }
  }

  const handleDepositLessThan2500Change = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      const value = 2500
      if (depositAllRef.current) {
        depositAllRef.current.checked = false
      }
      if (deposit5000Ref.current) {
        deposit5000Ref.current.checked = false
      }
      if (deposit7500Ref.current) {
        deposit7500Ref.current.checked = false
      }
      if (onChange) {
        onChange(value)
      }
    }
  }

  const handleDepositLessThan5000Click = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    if (!checkbox.checked) {
      checkbox.checked = !checkbox.checked
      const event = e
      event.currentTarget = checkbox
      handleDepositLessThan5000Change(event)
    }
  }

  const handleDepositLessThan5000Change = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      const value = 5000
      if (depositAllRef.current) {
        depositAllRef.current.checked = false
      }
      if (deposit2500Ref.current) {
        deposit2500Ref.current.checked = false
      }
      if (deposit7500Ref.current) {
        deposit7500Ref.current.checked = false
      }
      if (onChange) {
        onChange(value)
      }
    }
  }

  const handleDepositLessThan7500Click = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    if (!checkbox.checked) {
      checkbox.checked = !checkbox.checked
      const event = e
      event.currentTarget = checkbox
      handleDepositLessThan7500Change(event)
    }
  }

  const handleDepositLessThan7500Change = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      const value = 7500

      if (depositAllRef.current) {
        depositAllRef.current.checked = false
      }
      if (deposit2500Ref.current) {
        deposit2500Ref.current.checked = false
      }
      if (deposit5000Ref.current) {
        deposit5000Ref.current.checked = false
      }

      if (onChange) {
        onChange(value)
      }
    }
  }

  return (
    <Accordion title={strings.DEPOSIT} className={`${className ? `${className} ` : ''}deposit-filter`}>
      <div className="filter-elements">
        <div className="filter-element">
          <input ref={deposit2500Ref} type="radio" className="deposit-radio" onChange={handleDepositLessThan2500Change} />
          <label onClick={handleDepositLessThan2500Click}>{strings.LESS_THAN_2500}</label>
        </div>
        <div className="filter-element">
          <input ref={deposit5000Ref} type="radio" className="deposit-radio" onChange={handleDepositLessThan5000Change} />
          <label onClick={handleDepositLessThan5000Click}>{strings.LESS_THAN_5000}</label>
        </div>
        <div className="filter-element">
          <input ref={deposit7500Ref} type="radio" className="deposit-radio" onChange={handleDepositLessThan7500Change} />
          <label onClick={handleDepositLessThan7500Click}>{strings.LESS_THAN_7500}</label>
        </div>
        <div className="filter-element">
          <input ref={depositAllRef} type="radio" className="deposit-radio" onChange={handleAllDepositChange} />
          <label onClick={handleAllDepositClick}>{commonStrings.ALL}</label>
        </div>
      </div>
    </Accordion>
  )
}

export default DepositFilter
