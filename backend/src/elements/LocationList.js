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
            initLocations: false,
            isLoadingLocations: false,
            locations: [],
            selectedLocations: [],
            fetchLocations: false,
            locationsPage: 1,
            locationsKeyword: ''
        };
    }

    fetchLocations = (onFetch) => {
        const { locations, locationsKeyword, locationsPage } = this.state;
        this.setState({ isLoadingLocations: true });

        LocationService.getLocations(locationsKeyword, locationsPage, Env.PAGE_SIZE)
            .then(data => {
                const _locations = locationsPage === 1 ? data : [...locations, ...data];
                this.setState({ locations: _locations, isLoadingLocations: false, fetchLocations: data.length > 0 }, _ => {
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
        const { initLocations,
            isLoadingLocations,
            locations,
            fetchLocations,
            locationsPage,
            locationsKeyword } = this.state;
        return (
            <MultipleSelect
                loading={isLoadingLocations}
                label={this.props.label || ''}
                callbackFromMultipleSelect={this.handleChange}
                options={locations}
                selectedOptions={this.props.selectedOptions}
                required={this.props.required || false}
                multiple={this.props.multiple}
                type={Env.RECORD_TYPE.LOCATION}
                variant={this.props.variant || 'standard'}
                ListboxProps={{
                    onScroll: (event) => {
                        const listboxNode = event.currentTarget;
                        if (fetchLocations && !isLoadingLocations && (listboxNode.scrollTop + listboxNode.clientHeight >= (listboxNode.scrollHeight - Env.PAGE_FETCH_OFFSET))) {
                            const p = locationsPage + 1;
                            this.setState({ locationsPage: p }, _ => {
                                this.fetchLocations();
                            });
                        }
                    }
                }}
                onFocus={
                    (event) => {
                        if (!initLocations) {
                            const p = 1;
                            this.setState({ locations: [], locationsPage: p }, _ => {
                                this.fetchLocations(_ => { this.setState({ initLocations: true }) });
                            });
                        }
                    }
                }
                onInputChange={
                    (event) => {
                        const value = (event && event.target ? event.target.value : null) || '';

                        if (event.target.type === 'text' && value !== locationsKeyword) {
                            this.setState({ locations: [], locationsPage: 1, locationsKeyword: value }, _ => {
                                this.fetchLocations();
                            });
                        }
                    }
                }
                onClear={
                    (event) => {
                        this.setState({ locations: [], locationsPage: 1, locationsKeyword: '', fetchLocations: true }, _ => {
                            this.fetchLocations();
                        });
                    }
                }
            />
        );
    }
}

export default LocationList;