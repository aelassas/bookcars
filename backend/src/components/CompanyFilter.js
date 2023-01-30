import React, { useEffect, useRef, useState } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import * as Helper from '../common/Helper';
import Accordion from './Accordion';

import '../assets/css/company-filter.css';

const CompanyFilter = (props) => {
    const [companies, setCompanies] = useState([]);
    const [checkedCompanies, setCheckedCompanies] = useState([]);
    const [allChecked, setAllChecked] = useState(true);
    const refs = useRef([]);

    useEffect(() => {
        setCompanies(props.companies);
        setCheckedCompanies(Helper.flattenCompanies(props.companies));
    }, [props.companies]);

    useEffect(() => {
        if (companies.length > 0) {
            refs.current.forEach(checkbox => {
                checkbox.checked = true;
            });

        }
    }, [companies]);

    const handleCompanyClick = (e) => {
        const checkbox = e.currentTarget.previousSibling;
        checkbox.checked = !checkbox.checked;
        const event = e;
        event.currentTarget = checkbox;
        handleCheckCompanyChange(event);
    };

    const handleCheckCompanyChange = (e) => {
        const companyId = e.currentTarget.getAttribute('data-id');

        if (e.currentTarget.checked) {
            checkedCompanies.push(companyId);

            if (checkedCompanies.length === companies.length) {
                setAllChecked(true);
            }
        } else {
            const index = checkedCompanies.indexOf(companyId);
            checkedCompanies.splice(index, 1);

            if (checkedCompanies.length === 0) {
                setAllChecked(false);
            }
        }

        setCheckedCompanies(checkedCompanies);

        if (props.onChange) {
            props.onChange(checkedCompanies);
        }
    };

    const handleUncheckAllChange = (e) => {

        if (allChecked) { // uncheck all
            refs.current.forEach(checkbox => {
                checkbox.checked = false;
            });

            setAllChecked(false);
            setCheckedCompanies([]);
        } else { // check all
            refs.current.forEach(checkbox => {
                checkbox.checked = true;
            });

            const companyIds = Helper.flattenCompanies(companies);
            setAllChecked(true);
            setCheckedCompanies(companyIds);

            if (props.onChange) {
                props.onChange(companyIds);
            }
        }
    };

    return (
        companies.length > 0 &&
        <Accordion
            title={commonStrings.SUPPLIER}
            collapse={props.collapse}
            offsetHeight={Math.floor((companies.length / 2) * Env.COMPANY_IMAGE_HEIGHT)}
            className={`${props.className ? `${props.className} ` : ''}company-filter`}
        >
            <ul className='company-list'>
                {
                    companies.map((company, index) => (
                        <li key={company._id}>
                            <input ref={ref => refs.current[index] = ref} type='checkbox' data-id={company._id} className='company-checkbox' onChange={handleCheckCompanyChange} />
                            <label onClick={handleCompanyClick}>
                                <img src={Helper.joinURL(Env.CDN_USERS, company.avatar)}
                                    alt={company.fullName}
                                    style={{ width: Env.COMPANY_IMAGE_WIDTH }}
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
    );
};

export default CompanyFilter;