import React, { Component } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings as bfStrings } from '../lang/booking-filter';
import { strings as blStrings } from '../lang/booking-list';
import { strings } from '../lang/booking-car-list';
import * as CarService from '../services/CarService';
import MultipleSelect from './MultipleSelect';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button
} from '@mui/material';
import * as Helper from '../common/Helper';

class CarSelectList extends Component {

    constructor(props) {
        super(props);
        this.state = {
            loading: false,
            init: false,
            fetch: false,
            company: props.company ? props.company : '-1',
            pickupLocation: props.pickupLocation ? props.pickupLocation : '-1',
            keyword: '',
            page: 1,
            cars: [],
            openDialog: false,
            closeDialog: false,
            reload: false,
            selectedOptions: this.props.value ? [this.props.value] : []
        }
    }

    handleChange = (values, key, reference) => {
        if (this.props.onChange) {
            this.props.onChange(values);
        }
    };

    getCars = (cars) => cars.map(car => {
        const { _id, name, image } = car;
        return { _id, name, image };
    });

    fetch = (onFetch) => {
        const { company, pickupLocation, keyword, page, cars, closeDialog } = this.state;
        const data = { company, pickupLocation };

        if (closeDialog) {
            this.setState({ closeDialog: false });
        }

        if (company === '-1' || pickupLocation === '-1') {
            return this.setState({ openDialog: true });
        }

        this.setState({ loading: true });

        CarService.getBookingCars(keyword, data, page, Env.PAGE_SIZE)
            .then(data => {
                const _data = this.getCars(data);
                const _cars = page === 1 ? _data : [...cars, ..._data];
                this.setState({ cars: _cars, loading: false, init: true, reload: false, fetch: data.length > 0 }, () => {
                    if (onFetch) {
                        onFetch();
                    }
                });
            })
            .catch((err) => Helper.error(err));
    };

    handleCloseDialog = () => {
        this.setState({ openDialog: false, closeDialog: true });
    }

    static getDerivedStateFromProps(nextProps, prevState) {
        const { company, pickupLocation } = prevState;

        if (nextProps.company && company !== nextProps.company) {
            return { company: nextProps.company };
        }

        if (nextProps.pickupLocation && pickupLocation !== nextProps.pickupLocation) {
            return { pickupLocation: nextProps.pickupLocation };
        }

        return null;
    }

    componentDidUpdate(prevProps, prevState) {

        if ((prevState.company !== '-1' && this.state.company === '-1')
            || (prevState.pickupLocation !== '-1' && this.state.pickupLocation === '-1')) {
            return this.setState({ reload: true, selectedOptions: [] }, () => {
                if (this.props.onChange) {
                    this.props.onChange([]);
                }
            });
        }

        if (((this.state.company !== '-1' && this.state.pickupLocation !== '-1')
            && (this.state.company !== prevState.company || this.state.pickupLocation !== prevState.pickupLocation))) {
            return this.setState({ reload: true, selectedOptions: [] });
        }
    }

    render() {
        const { loading, company, pickupLocation, openDialog, fetch, init, reload, keyword, page, cars, selectedOptions } = this.state;

        return (
            <div>
                <MultipleSelect
                    label={this.props.label}
                    callbackFromMultipleSelect={this.handleChange}
                    options={cars}
                    selectedOptions={selectedOptions}
                    loading={loading}
                    required={this.props.required}
                    readOnly={this.props.readOnly}
                    multiple={this.props.multiple}
                    type={Env.RECORD_TYPE.CAR}
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
                    onOpen={
                        (event) => {
                            if (!init || reload) {
                                const p = 1;
                                this.setState({ cars: [], page: p }, () => {
                                    this.fetch();
                                });
                            }
                        }
                    }
                    onInputChange={
                        (event) => {
                            const value = (event && event.target ? event.target.value : null) || '';

                            if (value !== keyword) {
                                this.setState({ cars: [], page: 1, keyword: value }, () => {
                                    this.fetch();
                                });
                            }
                        }
                    }
                    onClear={
                        (event) => {
                            this.setState({ cars: [], page: 1, keyword: '', fetch: true }, () => {
                                this.fetch();
                            });
                        }
                    }
                />

                <Dialog
                    disableEscapeKeyDown
                    maxWidth="xs"
                    open={openDialog}
                >
                    <DialogTitle className='dialog-header'>{commonStrings.INFO}</DialogTitle>
                    <DialogContent className='dialog-content'>
                        {(company === '-1' && pickupLocation === '-1')
                            ? `${strings.REQUIRED_FIELDS}${blStrings.COMPANY} ${commonStrings.AND} ${bfStrings.PICKUP_LOCATION}`
                            : (
                                company === '-1' ? `${strings.REQUIRED_FIELD}${blStrings.COMPANY}`
                                    :
                                    pickupLocation === '-1' ? `${strings.REQUIRED_FIELD}${bfStrings.PICKUP_LOCATION}` : <></>
                            )
                        }
                    </DialogContent>
                    <DialogActions className='dialog-actions'>
                        <Button onClick={this.handleCloseDialog} variant='contained' className='btn-secondary'>{commonStrings.CLOSE}</Button>
                    </DialogActions>
                </Dialog>

            </div>
        );
    }
}

export default CarSelectList;