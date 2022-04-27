import React, { Component } from 'react';
import Master from '../elements/Master';
import MultipleSelect from '../elements/MultipleSelect';

import '../assets/css/reservations.css';

export default class Reservations extends Component {

    constructor(props) {
        super(props);
        this.state = {
            user: null,
            init: false,
            isLoading: false,
            fetch: false,
            page: 1,
            keyword: '',
            companies: [],
            selectedCompanies: []
        };
    }

    onLoad = (user) => {
        this.setState({ user });
    }

    getCompanies = (page, keyword) => {
        const size = 30;
        const companies = [];
        for (let _id = (page - 1) * size; _id < page * size; _id++) {
            const name = `Company ${_id}`;
            if (!keyword || keyword === '' || name.includes(keyword)) {
                companies.push({ _id, name });
            }
        }
        return companies;
    };

    handleCompanySelected = (values, key, reference) => {
        this.setState({ selectedCompanies: values, keyword: '' });
    };

    componentDidMount() {
    }

    render() {
        const { companies, selectedCompanies, keyword, fetch, isLoading, page } = this.state;

        return (
            <Master onLoad={this.onLoad} strict={true}>
                <MultipleSelect
                    loading={isLoading}
                    label={'Companies'}
                    selectedValues={selectedCompanies}
                    callbackFromMultipleSelect={this.handleCompanySelected}
                    options={companies}
                    required={false}
                    multiple={true}
                    ListboxProps={{
                        onScroll: (event) => {
                            const listboxNode = event.currentTarget;
                            if (fetch && !isLoading && (listboxNode.scrollTop + listboxNode.clientHeight === listboxNode.scrollHeight)) {
                                const p = page + 1;
                                this.setState({ isLoading: true, page: p });

                                setTimeout(_ => {
                                    const newCompanies = this.getCompanies(p, keyword);
                                    const _companies = [...companies, ...newCompanies];
                                    this.setState({ companies: _companies, isLoading: false, fetch: newCompanies.length > 0, init: true });

                                }, 1000);
                            }
                        }
                    }}
                    onFocus={
                        (event) => {
                            if (!this.state.init) {
                                const p = 1;
                                this.setState({ companies: [], isLoading: true, page: p });

                                setTimeout(_ => {
                                    const _companies = this.getCompanies(p, keyword);
                                    this.setState({ companies: _companies, isLoading: false, fetch: _companies.length > 0, page, init: true });

                                }, 1000);
                            }
                        }
                    }
                    onInputChange={
                        (event) => {
                            const value = (event && event.target ? event.target.value : null) || '';

                            if (event.target.type === 'text' && value !== keyword) {
                                const p = 1;
                                this.setState({ companies: [], isLoading: true, page: p, keyword: value });

                                setTimeout(_ => {
                                    const _companies = this.getCompanies(p, value);
                                    this.setState({ companies: _companies, isLoading: false, fetch: _companies.length > 0, page, init: true });

                                }, 1000);
                            }
                        }
                    }
                    onClear={
                        (event) => {
                            console.log('onClear')
                            this.setState({ companies: [], isLoading: true });
                            const page = 1;

                            setTimeout(_ => {
                                const _companies = this.getCompanies(page);
                                this.setState({ companies: _companies, isLoading: false, fetch: _companies.length > 0, page, init: true });

                            }, 1000);
                        }
                    }
                />
            </Master>
        );
    }
}