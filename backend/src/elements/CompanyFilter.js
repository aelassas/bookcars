import React, { Component } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import Helper from '../common/Helper';
import CompanyService from '../services/CompanyService';
import { toast } from 'react-toastify';

import '../assets/css/company-filter.css';

class CompanyFilter extends Component {
    constructor(props) {
        super(props);
        this.state = {
            companies: [],
            checkedCompanies: [],
            allCompaniesChecked: true
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
        const { checkedCompanies } = this.state;
        const companyId = e.currentTarget.getAttribute('data-id');

        if (e.currentTarget.checked) {
            checkedCompanies.push(companyId);
        } else {
            const index = checkedCompanies.indexOf(companyId);
            checkedCompanies.splice(index, 1);
        }

        this.setState({ checkedCompanies }, () => {
            if (this.props.onChange) {
                this.props.onChange(checkedCompanies);
            }
        });
    };

    handleUncheckAllChange = (e) => {
        const { allCompaniesChecked } = this.state;
        const checkboxes = document.querySelectorAll('.company-checkbox');

        if (allCompaniesChecked) { // uncheck all
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });

            this.setState({ allCompaniesChecked: false, checkedCompanies: [] });
        } else { // check all
            checkboxes.forEach(checkbox => {
                checkbox.checked = true;
            });

            const { companies } = this.state, companyIds = Helper.flattenCompanies(companies);
            this.setState({ allCompaniesChecked: true, checkedCompanies: companyIds }, () => {
                if (this.props.onChange) {
                    this.props.onChange(companyIds);
                }
            });
        }
    };

    componentDidMount() {
        CompanyService.getAllCompanies()
            .then(companies => {
                const companyIds = Helper.flattenCompanies(companies);
                this.setState({ companies, checkedCompanies: companyIds }, () => {
                    const { checkedCompanies } = this.state;
                    const checkboxes = document.querySelectorAll('.company-checkbox');

                    checkboxes.forEach(checkbox => {
                        checkbox.checked = true;
                    });

                    if (this.props.onLoad) {
                        this.props.onLoad(checkedCompanies);
                    }
                });
            })
            .catch(() => toast(commonStrings.GENERIC_ERROR, { type: 'error' }));
    }

    render() {
        const { companies, allCompaniesChecked } = this.state;

        return (
            companies.length > 0 ? (
                <div className={`${this.props.className ? `${this.props.className} ` : ''}company-filter`}>
                    <ul className='company-list'>
                        {
                            companies.map(company => (
                                <li key={company._id}>
                                    <input type='checkbox' data-id={company._id} className='company-checkbox' onChange={this.handleCheckCompanyChange} />
                                    <label onClick={this.handleCompanyClick}>
                                        <img src={Helper.joinURL(Env.CDN_USERS, company.avatar)}
                                            alt={company.fullName}
                                            style={{
                                                width: Env.COMPANY_IMAGE_WIDTH,
                                                // height: Env.COMPANY_IMAGE_HEIGHT
                                            }} />
                                    </label>
                                </li>
                            ))
                        }
                    </ul>
                    <div className='filter-actions'>
                        <span onClick={this.handleUncheckAllChange} className='uncheckall'>
                            {allCompaniesChecked ? commonStrings.UNCHECK_ALL : commonStrings.CHECK_ALL}
                        </span>
                    </div>
                </div>
            )
                :
                <></>
        );
    }
}

export default CompanyFilter;