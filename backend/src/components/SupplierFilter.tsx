import React, { useEffect, useRef, useState } from 'react'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import Accordion from './Accordion'

import '@/assets/css/supplier-filter.css'

interface SupplierFilterProps {
  suppliers: bookcarsTypes.User[]
  collapse?: boolean
  className?: string
  onChange?: (value: string[]) => void
}

const SupplierFilter = ({
  suppliers: __suppliers,
  collapse,
  className,
  onChange
}: SupplierFilterProps) => {
  const [suppliers, setSuppliers] = useState<bookcarsTypes.User[]>([])
  const [checkedSuppliers, setCheckedSuppliers] = useState<string[]>([])
  const [allChecked, setAllChecked] = useState(false)
  const refs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    setSuppliers(__suppliers)
    // setCheckedSuppliers(bookcarsHelper.flattenSuppliers(supliesFromProps))
  }, [__suppliers])

  // useEffect(() => {
  //   if (suppliers.length > 0) {
  //     refs.current.forEach((checkbox) => {
  //       if (checkbox) {
  //         checkbox.checked = true
  //       }
  //     })
  //   }
  // }, [suppliers])

  const handleCheckSupplierChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    const supplierId = e.currentTarget.getAttribute('data-id') as string

    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      checkedSuppliers.push(supplierId)

      if (checkedSuppliers.length === suppliers.length) {
        setAllChecked(true)
      }
    } else {
      const index = checkedSuppliers.indexOf(supplierId)
      checkedSuppliers.splice(index, 1)

      if (checkedSuppliers.length === 0) {
        setAllChecked(false)
      }
    }

    setCheckedSuppliers(checkedSuppliers)

    if (onChange) {
      if (checkedSuppliers.length === 0) {
        onChange(bookcarsHelper.clone(bookcarsHelper.flattenSuppliers(__suppliers)))
      } else {
        onChange(bookcarsHelper.clone(checkedSuppliers))
      }
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

      const supplierIds = bookcarsHelper.flattenSuppliers(suppliers)
      setAllChecked(true)
      setCheckedSuppliers(supplierIds)

      if (onChange) {
        onChange(bookcarsHelper.clone(supplierIds))
      }
    }
  }

  const handleSupplierClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckSupplierChange(event)
  }

  return (
    (
      (suppliers.length > 1)
      && (
        <Accordion
          title={commonStrings.SUPPLIER}
          collapse={collapse}
          offsetHeight={Math.floor((suppliers.length / 2) * env.SUPPLIER_IMAGE_HEIGHT)}
          className={`${className ? `${className} ` : ''}supplier-filter`}
        >
          <ul className="supplier-list">
            {suppliers.map((supplier, index) => (
              <li key={supplier._id}>
                <input
                  ref={(ref) => {
                    refs.current[index] = ref
                  }}
                  type="checkbox"
                  data-id={supplier._id}
                  className="supplier-checkbox"
                  onChange={handleCheckSupplierChange}
                />
                <span
                  role="button"
                  tabIndex={0}
                  onClick={handleSupplierClick}
                  className="supplier"
                >
                  <img
                    src={bookcarsHelper.joinURL(env.CDN_USERS, supplier.avatar)}
                    alt={supplier.fullName}
                    title={supplier.fullName}
                  />
                </span>
                {!!supplier.carCount && <span className="car-count">{`(${supplier.carCount})`}</span>}
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
