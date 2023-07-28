import React, { useEffect, useRef, useState } from 'react'
import Env from '../config/env.config'
import { strings as commonStrings } from '../lang/common'
import * as Helper from '../common/Helper'
import Accordion from './Accordion'

import '../assets/css/company-filter.css'

const SupplierFilter = (props) => {
    const [suppliers, setSuppliers] = useState([])
    const [checkedSuppliers, setCheckedSuppliers] = useState([])
    const [allChecked, setAllChecked] = useState(true)
    const refs = useRef([])

    useEffect(() => {
        setSuppliers(props.companies)
        setCheckedSuppliers(Helper.flattenCompanies(props.companies))
    }, [props.companies])

    useEffect(() => {
        if (suppliers.length > 0) {
            refs.current.forEach(checkbox => {
                checkbox.checked = true
            })

        }
    }, [suppliers])

    const handleCompanyClick = (e) => {
        const checkbox = e.currentTarget.previousSibling
        checkbox.checked = !checkbox.checked
        const event = e
        event.currentTarget = checkbox
        handleCheckCompanyChange(event)
    }

    const handleCheckCompanyChange = (e) => {
        const companyId = e.currentTarget.getAttribute('data-id')

        if (e.currentTarget.checked) {
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

        if (props.onChange) {
            props.onChange(checkedSuppliers)
        }
    }

    const handleUncheckAllChange = () => {

        if (allChecked) { // uncheck all
            refs.current.forEach(checkbox => {
                checkbox.checked = false
            })

            setAllChecked(false)
            setCheckedSuppliers([])
        } else { // check all
            refs.current.forEach(checkbox => {
                checkbox.checked = true
            })

            const companyIds = Helper.flattenCompanies(suppliers)
            setAllChecked(true)
            setCheckedSuppliers(companyIds)

            if (props.onChange) {
                props.onChange(companyIds)
            }
        }
    }

    return (
        suppliers.length > 1 &&
        <Accordion
            title={commonStrings.SUPPLIER}
            collapse={props.collapse}
            offsetHeight={Math.floor((suppliers.length / 2) * Env.COMPANY_IMAGE_HEIGHT)}
            className={`${props.className ? `${props.className} ` : ''}company-filter`}
        >
            <ul className='company-list'>
                {
                    suppliers.map((supplier, index) => (
                        <li key={supplier._id}>
                            <input ref={ref => refs.current[index] = ref} type='checkbox' data-id={supplier._id} className='company-checkbox' onChange={handleCheckCompanyChange} />
                            <label onClick={handleCompanyClick}>
                                <img src={Helper.joinURL(Env.CDN_USERS, supplier.avatar)}
                                    alt={supplier.fullName}
                                />
                            </label>
                        </li>
                    ))
                }
            </ul>
            <div className='filter-actions'>
                <span onClick={handleUncheckAllChange} className='uncheckall'>
                    {allChecked ? commonStrings.UNCHECK_ALL : commonStrings.CHECK_ALL}
                </span>
            </div>
        </Accordion>
    )
}

export default SupplierFilter