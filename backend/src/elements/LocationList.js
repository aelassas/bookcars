import React, { Component } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import LocationService from '../services/LocationService';
import Helper from '../common/Helper';
import { toast } from 'react-toastify';
import MultipleSelect from './MultipleSelect';

class LocationList extends Component {

    constructor(props) {
        super(props);
        this.state = {
            init: false,
            loading: false,
            locations: [],
            fetch: false,
            page: 1,
            keyword: '',
            selectedOptions: []
        };
    }

    fetch = (onFetch) => {
        const { locations, keyword, page } = this.state;
        this.setState({ loading: true });

        LocationService.getLocations(keyword, page, Env.PAGE_SIZE)
            .then(data => {
                const _locations = page === 1 ? data : [...locations, ...data];
                this.setState({ locations: _locations, loading: false, fetch: data.length > 0 }, () => {
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
            locations,
            fetch,
            page,
            keyword,
            selectedOptions } = this.state;
        return (
            <MultipleSelect
                loading={loading}
                label={this.props.label || ''}
                callbackFromMultipleSelect={this.handleChange}
                options={locations}
                selectedOptions={selectedOptions}
                required={this.props.required || false}
                multiple={this.props.multiple}
                type={Env.RECORD_TYPE.LOCATION}
                variant={this.props.variant || 'standard'}
                ListboxProps={{
                    onScroll: (event) => {
                        const listboxNode = event.currentTarget;
                        if (fetch && !loading && (listboxNode.scrollTop + listboxNode.clientHeight >= (listboxNode.scrollHeight - Env.PAGE_FETCH_OFFSET))) {
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
                            this.setState({ locations: [], page: p }, () => {
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
                            this.setState({ locations: [], page: 1, keyword: value }, () => {
                                this.fetch();
                            });
                        }
                    }
                }
                onClear={
                    (event) => {
                        this.setState({ locations: [], page: 1, keyword: '', fetch: true }, () => {
                            this.fetch();
                        });
                    }
                }
            />
        );
    }
}

export default LocationList;