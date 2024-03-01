import React, { useEffect, useRef, useState } from 'react'
import * as bookcarsTypes from 'bookcars-types'
import * as bookcarsHelper from 'bookcars-helper'
import env from '../config/env.config'
import { strings as commonStrings } from '../lang/common'
import Accordion from './Accordion'

import '../assets/css/company-filter.css'

interface SupplierFilterProps {
  companies: bookcarsTypes.User[]
  collapse?: boolean
  className?: string
  onChange?: (value: string[]) => void
}

const SupplierFilter = ({
  companies,
  collapse,
  className,
  onChange
}: SupplierFilterProps) => {
  const [suppliers, setSuppliers] = useState<bookcarsTypes.User[]>([])
  const [checkedSuppliers, setCheckedSuppliers] = useState<string[]>([])
  const [allChecked, setAllChecked] = useState(true)
  const refs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    setSuppliers(companies)
    setCheckedSuppliers(bookcarsHelper.flattenCompanies(companies))
  }, [companies])

  useEffect(() => {
    if (suppliers.length > 0) {
      refs.current.forEach((checkbox) => {
        if (checkbox) {
          checkbox.checked = true
        }
      })
    }
  }, [suppliers])

  const handleCheckCompanyChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    const companyId = e.currentTarget.getAttribute('data-id') as string

    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      checkedSuppliers.push(companyId)

      if (checkedSuppliers.length === suppliers.length) {
        setAllChecked(true)
      }
    } else {
      const index = checkedSuppliers.indexOf(companyId)
      checkedSuppliers.splice(index, 1)

      if (checkedSuppliers.length === 0) {
        setAllChecked(false)
      }
    }

    setCheckedSuppliers(checkedSuppliers)

    if (onChange) {
      onChange(bookcarsHelper.clone(checkedSuppliers))
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
      setCheckedSuppliers([])
    } else {
      // check all
      refs.current.forEach((checkbox) => {
        if (checkbox) {
          checkbox.checked = true
        }
      })

      const companyIds = bookcarsHelper.flattenCompanies(suppliers)
      setAllChecked(true)
      setCheckedSuppliers(companyIds)

      if (onChange) {
        onChange(bookcarsHelper.clone(companyIds))
      }
    }
  }

  const handleCompanyClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckCompanyChange(event)
  }

  return (
    (suppliers.length > 1
      && (
        <Accordion
          title={commonStrings.SUPPLIER}
          collapse={collapse}
          offsetHeight={Math.floor((suppliers.length / 2) * env.COMPANY_IMAGE_HEIGHT)}
          className={`${className ? `${className} ` : ''}company-filter`}
        >
          <ul className="company-list">
            {suppliers.map((supplier, index) => (
              <li key={supplier._id}>
                <input
                  ref={(ref) => {
                    refs.current[index] = ref
                  }}
                  type="checkbox"
                  data-id={supplier._id}
                  className="company-checkbox"
                  onChange={handleCheckCompanyChange}
                />
                <span
                  role="button"
                  tabIndex={0}
                  onClick={handleCompanyClick}
                >
                  <img src={bookcarsHelper.joinURL(env.CDN_USERS, supplier.avatar)} alt={supplier.fullName} />
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
        </Accordion>
      )
    ) || <></>
  )
}

export default SupplierFilter
