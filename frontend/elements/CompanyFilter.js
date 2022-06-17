import React, { useEffect, useState } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import Helper from '../common/Helper';
import CompanyService from '../services/CompanyService';
import Accordion from './Accordion';
import Image from 'next/image';

import styles from '../styles/company-filter.module.css';

export default function CompanyFilter(props) {
    const [companies, setCompanies] = useState([]);
    const [checkedCompanies, setCheckedCompanies] = useState([]);
    const [allChecked, setAllChecked] = useState(true);

    useEffect(() => {

        async function init() {
            try {
                Helper.setLanguage(commonStrings);
                const companies = await CompanyService.getAllCompanies();
                setCompanies(companies);
                const companyIds = Helper.flattenCompanies(companies);
                setCheckedCompanies(companyIds);
                if (props.onLoad) props.onLoad(companyIds);
            }
            catch (err) {
                Helper.error();
            }
        }

        init();
    }, []);

    useEffect(() => {
        if (companies.length > 0) {
            const checkboxes = document.querySelectorAll(`.${styles.companyCheckbox}`);
            checkboxes.forEach(checkbox => {
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
        const checkboxes = document.querySelectorAll(`.${styles.companyCheckbox}`);

        if (allChecked) { // uncheck all
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });

            setAllChecked(false);
            setCheckedCompanies([]);
        } else { // check all
            checkboxes.forEach(checkbox => {
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
        <Accordion title={commonStrings.SUPPLIER} collapse={props.collapse} offsetHeight={Math.floor((companies.length / 2) * Env.COMPANY_IMAGE_HEIGHT)} className={`${props.className ? `${props.className} ` : ''}${styles.companyFilter}`}>
            <ul className={styles.companyList}>
                {
                    companies.map(company => (
                        <li key={company._id}>
                            <input className={styles.companyCheckbox} type='checkbox' data-id={company._id} onChange={handleCheckCompanyChange} />
                            <label onClick={handleCompanyClick}>
                                <div style={{
                                    position: 'relative',
                                    width: Env.COMPANY_IMAGE_WIDTH,
                                    height: Env.COMPANY_IMAGE_HEIGHT
                                }}>
                                    <Image
                                        src={Helper.joinURL(Env.CDN_USERS, company.avatar)}
                                        alt={company.fullName}
                                        layout='fill'
                                        objectFit='contain'
                                    />
                                </div>
                            </label>
                        </li>
                    ))
                }
            </ul>
            <div className={styles.filterActions}>
                <span onClick={handleUncheckAllChange} className={styles.uncheckall}>
                    {allChecked ? commonStrings.UNCHECK_ALL : commonStrings.CHECK_ALL}
                </span>
            </div>
        </Accordion>
    );
}