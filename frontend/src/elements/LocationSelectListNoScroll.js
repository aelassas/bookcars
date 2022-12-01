import React, { Component } from 'react';
import Env from '../config/env.config';
import * as LocationService from '../services/LocationService';
import * as Helper from '../common/Helper';
import MultipleSelect from './MultipleSelectNoScroll';

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
            .catch((err) => Helper.error(err));
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
                hidePopupIcon={this.props.hidePopupIcon}
                customOpen={this.props.customOpen}
                hidePopupOnload={this.props.hidePopupOnload}
                type={Env.RECORD_TYPE.LOCATION}
                variant={this.props.variant || 'standard'}
                ListboxProps={{
                    style: { overflow: 'hidden' }
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