import React, { useEffect, useRef, useState } from 'react'
import { strings as commonStrings } from '../lang/common'
import * as Helper from '../common/Helper'
import Accordion from '../components/Accordion'
import * as bookcarsTypes from 'bookcars-types'
import * as bookcarsHelper from 'bookcars-helper'

import '../assets/css/status-filter.css'

const StatusFilter = (
  {
    className,
    collapse,
    onChange
  }: {
    className?: string
    collapse?: boolean
    onChange: (value: bookcarsTypes.BookingStatus[]) => void
  }
) => {
  const statuses = Helper.getBookingStatuses()
  const [checkedStatuses, setCheckedStatuses] = useState(statuses.map((status) => status.value))
  const [allChecked, setAllChecked] = useState(true)

  const refs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    refs.current.forEach((checkbox) => {
      if (checkbox) {
        checkbox.checked = true
      }
    })
  }, [])

  const handleStatusClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckStatusChange(event)
  }

  const handleCheckStatusChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    const status = e.currentTarget.getAttribute('data-value') as bookcarsTypes.BookingStatus

    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      checkedStatuses.push(status)

      if (checkedStatuses.length === statuses.length) {
        setAllChecked(true)
      }
    } else {
      const index = checkedStatuses.findIndex((s) => s === status)
      checkedStatuses.splice(index, 1)

      if (checkedStatuses.length === 0) {
        setAllChecked(false)
      }
    }

    setCheckedStatuses(checkedStatuses)
    if (onChange) {
      onChange(bookcarsHelper.clone(checkedStatuses))
    }
  }

  const handleUncheckAllChange = () => {
    if (allChecked) {
      // uncheck all
      refs.current.forEach((checkbox) => {
        if (checkbox) {
          checkbox.checked = false
        }
      })

      setAllChecked(false)
      setCheckedStatuses([])
    } else {
      // check all
      refs.current.forEach((checkbox) => {
        if (checkbox) {
          checkbox.checked = true
        }
      })

      const allStatuses = statuses.map((status) => status.value)
      setAllChecked(true)
      setCheckedStatuses(allStatuses)

      if (onChange) {
        onChange(bookcarsHelper.clone(allStatuses))
      }
    }
  }

  return (
    (statuses.length > 0 && (
      <Accordion title={commonStrings.STATUS} collapse={collapse} className={`${className ? `${className} ` : ''}status-filter`}>
        <ul className="status-list">
          {statuses.map((status, index) => (
            <li key={status.value}>
              <input ref={(ref) => (refs.current[index] = ref)} type="checkbox" data-value={status.value} className="status-checkbox" onChange={handleCheckStatusChange} />
              <label onClick={handleStatusClick} className={`bs bs-${status.value}`}>
                {Helper.getBookingStatus(status.value)}
              </label>
            </li>
          ))}
        </ul>
        <div className="filter-actions">
          <span onClick={handleUncheckAllChange} className="uncheckall">
            {allChecked ? commonStrings.UNCHECK_ALL : commonStrings.CHECK_ALL}
          </span>
        </div>
      </Accordion>
    )) || <></>
  )
}

export default StatusFilter
