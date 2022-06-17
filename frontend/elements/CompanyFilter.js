import React, { Component } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import Helper from '../common/Helper';
import CompanyService from '../services/CompanyService';
import Accordion from './Accordion';
import { toast } from 'react-toastify';
import Image from 'next/image';

import styles from '../styles/company-filter.module.css';

class CompanyFilter extends Component {

    constructor(props) {
        super(props);
        this.state = {
            companies: [],
            checkedCompanies: [],
            allChecked: true
        }
    }

    handleCompanyClick = (e) => {
        const checkbox = e.currentTarget.previousSibling;
        checkbox.checked = !checkbox.checked;
        const event = e;
        event.currentTarget = checkbox;
        this.handleCheckCompanyChange(event);
    };

    handleCheckCompanyChange = (e) => {
        const { companies, checkedCompanies } = this.state;
        const companyId = e.currentTarget.getAttribute('data-id');

        if (e.currentTarget.checked) {
            checkedCompanies.push(companyId);

            if (checkedCompanies.length === companies.length) {
                this.setState({ allChecked: true });
            }
        } else {
            const index = checkedCompanies.indexOf(companyId);
            checkedCompanies.splice(index, 1);

            if (checkedCompanies.length === 0) {
                this.setState({ allChecked: false });
            }
        }

        this.setState({ checkedCompanies }, () => {
            if (this.props.onChange) {
                this.props.onChange(checkedCompanies);
            }
        });
    };

    handleUncheckAllChange = (e) => {
        const { allChecked } = this.state;
        const checkboxes = document.querySelectorAll(`.${styles.companyCheckbox}`);

        if (allChecked) { // uncheck all
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });

            this.setState({ allChecked: false, checkedCompanies: [] });
        } else { // check all
            checkboxes.forEach(checkbox => {
                checkbox.checked = true;
            });

            const { companies } = this.state, companyIds = Helper.flattenCompanies(companies);
            this.setState({ allChecked: true, checkedCompanies: companyIds }, () => {
                if (this.props.onChange) {
                    this.props.onChange(companyIds);
                }
            });
        }
    };

    componentDidMount() {
        Helper.setLanguage(commonStrings);

        CompanyService.getAllCompanies()
            .then(companies => {
                const companyIds = Helper.flattenCompanies(companies);
                if (this.props.onLoad) {
                    this.props.onLoad(companyIds);
                }

                this.setState({ companies, checkedCompanies: companyIds }, () => {
                    const checkboxes = document.querySelectorAll(`.${styles.companyCheckbox}`);

                    checkboxes.forEach(checkbox => {
                        checkbox.checked = true;
                    });
                });
            })
            .catch(() => toast(commonStrings.GENERIC_ERROR, { type: 'error' }));
    }

    render() {
        const { companies, allChecked } = this.state;

        return (
            companies.length > 0 ? (
                <Accordion title={commonStrings.SUPPLIER} collapse={this.props.collapse} offsetHeight={Math.floor((companies.length / 2) * Env.COMPANY_IMAGE_HEIGHT)} className={`${this.props.className ? `${this.props.className} ` : ''}${styles.companyFilter}`}>
                    <ul className={styles.companyList}>
                        {
                            companies.map(company => (
                                <li key={company._id}>
                                    <input className={styles.companyCheckbox} type='checkbox' data-id={company._id} onChange={this.handleCheckCompanyChange} />
                                    <label onClick={this.handleCompanyClick}>
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
                        <span onClick={this.handleUncheckAllChange} className={styles.uncheckall}>
                            {allChecked ? commonStrings.UNCHECK_ALL : commonStrings.CHECK_ALL}
                        </span>
                    </div>
                </Accordion>
            )
                :
                <></>
        );
    }
}

export default CompanyFilter;