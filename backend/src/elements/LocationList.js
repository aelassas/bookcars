import React, { Component } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import LocationService from '../services/LocationService';
import { toast } from 'react-toastify';
import MultipleSelect from './MultipleSelect';

class LocationList extends Component {

    constructor(props) {
        super(props);
        this.state = {
            init: false,
            isLoading: false,
            locations: [],
            fetchLocations: false,
            page: 1,
            keyword: ''
        };
    }

    fetchLocations = (onFetch) => {
        const { locations, keyword, page } = this.state;
        this.setState({ isLoading: true });

        LocationService.getLocations(keyword, page, Env.PAGE_SIZE)
            .then(data => {
                const _locations = page === 1 ? data : [...locations, ...data];
                this.setState({ locations: _locations, isLoading: false, fetchLocations: data.length > 0 }, _ => {
                    if (onFetch) {
                        onFetch();
                    }
                });
            })
            .catch(_ => toast(commonStrings.GENERIC_ERROR, { type: 'error' }));
    };

    handleChange = (values, key, reference) => {
        if (this.props.onChange) {
            this.props.onChange(values);
        }
    };

    render() {
        const { init,
            isLoading,
            locations,
            fetchLocations,
            page,
            keyword } = this.state;
        return (
            <MultipleSelect
                loading={isLoading}
                label={this.props.label || ''}
                callbackFromMultipleSelect={this.handleChange}
                options={locations}
                selectedOptions={this.props.value && this.props.value.length > 0 ? this.props.value : []}
                required={this.props.required || false}
                multiple={this.props.multiple}
                type={Env.RECORD_TYPE.LOCATION}
                variant={this.props.variant || 'standard'}
                ListboxProps={{
                    onScroll: (event) => {
                        const listboxNode = event.currentTarget;
                        if (fetchLocations && !isLoading && (listboxNode.scrollTop + listboxNode.clientHeight >= (listboxNode.scrollHeight - Env.PAGE_FETCH_OFFSET))) {
                            const p = page + 1;
                            this.setState({ page: p }, _ => {
                                this.fetchLocations();
                            });
                        }
                    }
                }}
                onFocus={
                    (event) => {
                        if (!init) {
                            const p = 1;
                            this.setState({ locations: [], page: p }, _ => {
                                this.fetchLocations(_ => { this.setState({ init: true }) });
                            });
                        }
                    }
                }
                onInputChange={
                    (event) => {
                        const value = (event && event.target ? event.target.value : null) || '';

                        //if (event.target.type === 'text' && value !== keyword) {
                        if (value !== keyword) {
                            this.setState({ locations: [], page: 1, keyword: value }, _ => {
                                this.fetchLocations();
                            });
                        }
                    }
                }
                onClear={
                    (event) => {
                        this.setState({ locations: [], page: 1, keyword: '', fetchLocations: true }, _ => {
                            this.fetchLocations();
                        });
                    }
                }
            />
        );
    }
}

export default LocationList;