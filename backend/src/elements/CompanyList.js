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
            loading: false,
            companies: []
        }
    }

    handleChange = (values, key, reference) => {
        if (this.props.onChange) {
            this.props.onChange(values);
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
        this.setState({ loading: true });

        CompanyService.getCompanies()
            .then(data => {
                const companies = this.getCompanies(data);
                this.setState({ loading: false, companies });
            })
            .catch(() => toast(commonStrings.GENERIC_ERROR, { type: 'error' }));
    }

    render() {
        const { loading, companies } = this.state;

        return (
            <MultipleSelect
                label={this.props.label}
                callbackFromMultipleSelect={this.handleChange}
                options={companies}
                selectedOptions={this.props.value ? [this.props.value] : []}
                loading={loading}
                required={this.props.required}
                multiple={this.props.multiple}
                type={Env.RECORD_TYPE.COMPANY}
                variant={this.props.variant || 'standard'}
            />
        );
    }
}

export default CompanyList;