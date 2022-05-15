import React, { Component } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings as bfStrings } from '../lang/booking-filter';
import { strings as blStrings } from '../lang/booking-list';
import { strings } from '../lang/booking-car-list';
import CarService from '../services/CarService';
import { toast } from 'react-toastify';
import Helper from '../common/Helper';
import MultipleSelect from './MultipleSelect';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button
} from '@mui/material';

class BookingCarList extends Component {

    constructor(props) {
        super(props);
        this.state = {
            loading: false,
            init: false,
            fetch: false,
            company: '-1',
            pickupLocation: '-1',
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

    getCars = (data) => {
        const result = [];
        for (const { _id, name, image } of data) {
            result.push({ _id, name, image });
        }
        return result;
    };

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
        console.log('fetch!')
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
            .catch(() => toast(commonStrings.GENERIC_ERROR, { type: 'error' }));
    };

    handleCloseDialog = () => {
        this.setState({ openDialog: false, closeDialog: true });
    }

    static getDerivedStateFromProps(nextProps, prevState) {
        const { company, pickupLocation, selectedOptions } = prevState;

        if (nextProps.company && company !== nextProps.company) {
            return { company: nextProps.company };
        }

        if (nextProps.pickupLocation && pickupLocation !== nextProps.pickupLocation) {
            return { pickupLocation: nextProps.pickupLocation };
        }

        const _value = nextProps.multiple ? nextProps.value : [nextProps.value];
        if (nextProps.value && !Helper.arrayEqual(selectedOptions, _value)) {
            console.log('getDerivedStateFromProps.value', nextProps.value)
            console.log('getDerivedStateFromProps.selectedOptions', selectedOptions)
            return { selectedOptions: _value };
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

        if (this.state.init
            && ((this.state.company !== '-1' && this.state.pickupLocation !== '-1')
                && (this.state.company !== prevState.company || this.state.pickupLocation !== prevState.pickupLocation))) {
            return this.setState({ reload: true });
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
                    multiple={this.props.multiple}
                    type={Env.RECORD_TYPE.CAR}
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
                    // onFocus={
                    //     (event) => {
                    //         if (!init) {
                    //             const p = 1;
                    //             this.setState({ cars: [], page: p }, () => {
                    //                 this.fetch(() => { this.setState({ init: true }) });
                    //             });
                    //         }
                    //     }
                    // }
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
                            console.log('onClear')
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
                    <DialogTitle className='dialog-header'>{commonStrings.CONFIRM_TITLE}</DialogTitle>
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

export default BookingCarList;