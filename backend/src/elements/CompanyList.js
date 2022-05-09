import React, { Component } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import CompanyService from '../services/CompanyService';
import { toast } from 'react-toastify';
import MultipleSelect from './MultipleSelect';

class CompanyList extends Component {

    constructor(props) {
        super(props);
        this.state = {
            isLoading: false,
            companies: []
        }
    }

    handleCompanySelected = (values, key, reference) => {
        if (this.props.onSelected) {
            this.props.onSelected(values);
        }
    };

    getCompanies = (data) => {
        const result = [];
        for (const { _id, fullName, avatar } of data) {
            result.push({ _id, name: fullName, image: avatar });
        }
        return result;
    };

    componentDidMount() {
        this.setState({ isLoading: true });

        CompanyService.getCompanies()
            .then(data => {
                const companies = this.getCompanies(data);
                this.setState({ isLoading: false, companies });
            })
            .catch(_ => toast(commonStrings.GENERIC_ERROR, { type: 'error' }));
    }

    render() {
        const { isLoading, companies } = this.state;

        return (
            <MultipleSelect
                label={this.props.label}
                callbackFromMultipleSelect={this.handleCompanySelected}
                options={companies}
                loading={isLoading}
                required={this.props.required}
                multiple={this.props.multiple}
                type={Env.RECORD_TYPE.COMPANY}
                variant={this.props.variant || 'standard'}
            />
        );
    }
}

export default CompanyList;