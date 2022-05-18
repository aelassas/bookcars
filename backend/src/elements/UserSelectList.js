import React, { Component } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import UserService from '../services/UserService';
import Helper from '../common/Helper';
import { toast } from 'react-toastify';
import MultipleSelect from './MultipleSelect';

class UserSelectList extends Component {

    constructor(props) {
        super(props);
        this.state = {
            init: false,
            loading: false,
            drivers: [],
            fetch: false,
            page: 1,
            keyword: '',
            selectedOptions: []
        };
    }

    getDrivers = (users) => users.map(user => {
        const { _id, fullName, avatar } = user;
        return { _id, name: fullName, image: avatar };
    });

    fetch = (onFetch) => {
        const { drivers, keyword, page } = this.state;

        this.setState({ loading: true });
        UserService.getDrivers(keyword, page, Env.PAGE_SIZE)
            .then(data => {
                const _data = data.length > 0 ? this.getDrivers(data[0].resultData) : [];
                const _drivers = page === 1 ? _data : [...drivers, ..._data];
                this.setState({ drivers: _drivers, loading: false, fetch: _data.length > 0 }, () => {
                    if (onFetch) {
                        onFetch();
                    }
                });
            })
            .catch(() => toast(commonStrings.GENERIC_ERROR, { type: 'error' }));
    };

    handleChange = (values, key, reference) => {
        if (this.props.onChange) {
            this.props.onChange(values);
        }
    };

    static getDerivedStateFromProps(nextProps, prevState) {
        const { selectedOptions } = prevState;

        const _value = nextProps.multiple ? nextProps.value : [nextProps.value];
        if (nextProps.value && !Helper.arrayEqual(selectedOptions, _value)) {
            return { selectedOptions: _value };
        }

        return null;
    }

    render() {
        const { init,
            loading,
            drivers,
            fetch,
            page,
            keyword,
            selectedOptions } = this.state;
        return (
            <MultipleSelect
                loading={loading}
                label={this.props.label || ''}
                callbackFromMultipleSelect={this.handleChange}
                options={drivers}
                selectedOptions={selectedOptions}
                required={this.props.required || false}
                multiple={this.props.multiple}
                type={Env.RECORD_TYPE.USER}
                variant={this.props.variant || 'standard'}
                ListboxProps={{
                    onScroll: (event) => {
                        const listboxNode = event.currentTarget;
                        if (fetch && !loading && (listboxNode.scrollTop + listboxNode.clientHeight >= (listboxNode.scrollHeight - Env.PAGE_OFFSET))) {
                            const p = page + 1;
                            this.setState({ page: p }, () => {
                                this.fetch();
                            });
                        }
                    }
                }}
                onFocus={
                    (event) => {
                        if (!init) {
                            const p = 1;
                            this.setState({ drivers: [], page: p }, () => {
                                this.fetch(() => { this.setState({ init: true }) });
                            });
                        }
                    }
                }
                onInputChange={
                    (event) => {
                        const value = (event && event.target ? event.target.value : null) || '';

                        //if (event.target.type === 'text' && value !== keyword) {
                        if (value !== keyword) {
                            this.setState({ drivers: [], page: 1, keyword: value }, () => {
                                this.fetch();
                            });
                        }
                    }
                }
                onClear={
                    (event) => {
                        this.setState({ drivers: [], page: 1, keyword: '', fetch: true }, () => {
                            this.fetch();
                        });
                    }
                }
            />
        );
    }
}

export default UserSelectList;