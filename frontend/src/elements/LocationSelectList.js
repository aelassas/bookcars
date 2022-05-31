import React, { Component } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import LocationService from '../services/LocationService';
import Helper from '../common/Helper';
import { toast } from 'react-toastify';
import MultipleSelect from './MultipleSelect';

class LocationSelectList extends Component {

    constructor(props) {
        super(props);
        this.state = {
            init: false,
            loading: false,
            rows: [],
            fetch: false,
            page: 1,
            keyword: '',
            selectedOptions: [],
            rowCount: 0
        };
    }

    fetch = (onFetch) => {
        const { rows, keyword, page } = this.state;
        this.setState({ loading: true });

        LocationService.getLocations(keyword, page, Env.PAGE_SIZE)
            .then(data => {
                const _data = data.length > 0 ? data[0] : {};
                if (_data.length === 0) _data.resultData = [];
                const totalRecords = _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0;
                const _rows = page === 1 ? _data.resultData : [...rows, ..._data.resultData];
                this.setState({ rows: _rows, loading: false, fetch: _data.resultData.length > 0 }, () => {
                    if (onFetch) {
                        onFetch({ rows: _data.resultData, rowCount: totalRecords });
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
        const {
            init,
            loading,
            rows,
            fetch,
            page,
            keyword,
            selectedOptions } = this.state;

        return (
            <MultipleSelect
                loading={loading}
                label={this.props.label || ''}
                callbackFromMultipleSelect={this.handleChange}
                options={rows}
                selectedOptions={selectedOptions}
                required={this.props.required || false}
                multiple={this.props.multiple}
                readOnly={this.props.readOnly}
                freeSolo={this.props.freeSolo}
                type={Env.RECORD_TYPE.LOCATION}
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
                    },
                    style: { overflow: this.props.overflowHidden ? 'hidden' : 'auto' }
                }}
                onFocus={
                    (event) => {
                        if (!init && this.props.init) {
                            const p = 1;
                            this.setState({ rows: [], page: p }, () => {
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
                            this.setState({ rows: [], page: 1, keyword: value }, () => {
                                this.fetch();
                            });
                        }
                    }
                }
                onClear={
                    (event) => {
                        this.setState({ rows: [], page: 1, keyword: '', fetch: true }, () => {
                            this.fetch();
                        });
                    }
                }
            />
        );
    }
}

export default LocationSelectList;