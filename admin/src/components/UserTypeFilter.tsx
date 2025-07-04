import React, { useEffect, useRef, useState } from 'react'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings as commonStrings } from '@/lang/common'
import * as helper from '@/utils/helper'

import '@/assets/css/user-type-filter.css'

interface UserTypeFilterProps {
  className?: string
  onChange?: (types: bookcarsTypes.UserType[]) => void
}

const UserTypeFilter = ({
  className,
  onChange
}: UserTypeFilterProps) => {
  const userTypes = helper.getUserTypes()
  const [checkedUserTypes, setCheckedUserTypes] = useState<bookcarsTypes.UserType[]>(userTypes.map((user) => user.value))
  const [allChecked, setAllChecked] = useState(true)
  const refs = useRef<(HTMLInputElement)[]>([])

  useEffect(() => {
    refs.current.forEach((checkbox: HTMLInputElement) => {
      checkbox.checked = true
    })
  }, [])

  const handleUserTypeChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    const userType = e.currentTarget.getAttribute('data-value') as bookcarsTypes.UserType
    const checkbox = e.currentTarget as HTMLInputElement

    if (checkbox.checked) {
      checkedUserTypes.push(userType)

      if (checkedUserTypes.length === userTypes.length) {
        setAllChecked(true)
      }
    } else {
      const index = checkedUserTypes.findIndex((s) => s === userType)
      checkedUserTypes.splice(index, 1)

      if (checkedUserTypes.length === 0) {
        setAllChecked(false)
      }
    }

    setCheckedUserTypes(checkedUserTypes)

    if (onChange) {
      onChange(bookcarsHelper.clone(checkedUserTypes))
    }
  }

  const handleUserTypeClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleUserTypeChange(event)
  }

  const handleUncheckAllChange = () => {
    if (allChecked) {
      // uncheck all
      refs.current.forEach((checkbox: HTMLInputElement) => {
        checkbox.checked = false
      })

      setAllChecked(false)
      setCheckedUserTypes([])
    } else {
      // check all
      refs.current.forEach((checkbox: HTMLInputElement) => {
        checkbox.checked = true
      })

      const _userTypes = userTypes.map((user) => user.value)
      setAllChecked(true)
      setCheckedUserTypes(_userTypes)

      if (onChange) {
        onChange(bookcarsHelper.clone(_userTypes))
      }
    }
  }

  return (
    <div className={`${className ? `${className} ` : ''}user-type-filter`}>
      <ul className="user-type-list">
        {userTypes.map((userType, index) => (
          <li key={userType.value}>
            <input
              ref={(ref) => {
                refs.current[index] = ref as HTMLInputElement
              }}
              type="checkbox"
              data-value={userType.value}
              className="user-type-checkbox"
              onChange={handleUserTypeChange}
            />
            <span
              onClick={handleUserTypeClick}
              className={`bs bs-${userType.value}`}
              role="button"
              tabIndex={0}
            >
              {helper.getUserType(userType.value)}
            </span>
          </li>
        ))}
      </ul>
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
    </div>
  )
}

export default UserTypeFilter
