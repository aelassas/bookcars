import React, { useState, useEffect } from 'react';
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
import * as UserService from '../services/UserService';

const CarSelectList = ({ label, required, multiple, variant, value, company, pickupLocation, onChange }) => {
    const [init, setInit] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetch, setFetch] = useState(true);
    const [_company, set_Company] = useState('-1');
    const [_pickupLocation, set_PickupLocation] = useState('-1');
    const [keyword, setKeyword] = useState('');
    const [page, setPage] = useState(1);
    const [cars, setCars] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [closeDialog, setCloseDialog] = useState(false);
    const [reload, setReload] = useState([]);
    const [selectedOptions, setSelectedOptions] = useState([]);

    useEffect(() => {
        if (value) {
            setSelectedOptions([value]);
        } else {
            setSelectedOptions([]);
        }
    }, [value]);

    useEffect(() => {
        if (company && _company !== company) {
            set_Company(company || '-1');

            if (_company !== '-1' && _pickupLocation !== '-1') {
                setReload(true);
                setSelectedOptions([]);
                setPage(1);
                setKeyword('');

                if (onChange) {
                    onChange([]);
                }
            }
        }
    }, [_company, company, _pickupLocation, onChange]);

    useEffect(() => {
        if (pickupLocation && _pickupLocation !== pickupLocation) {
            set_PickupLocation(pickupLocation || '-1');

            if (_company !== '-1' && _pickupLocation !== '-1') {
                setReload(true);
                setSelectedOptions([]);
                setPage(1);
                setKeyword('');

                if (onChange) {
                    onChange([]);
                }
            }
        }
    }, [_pickupLocation, _company, pickupLocation, onChange]);

    useEffect(() => {
        if (_pickupLocation !== pickupLocation) {
            set_PickupLocation(pickupLocation);
        }
    }, [_pickupLocation, pickupLocation]);

    const handleChange = (values, key, reference) => {
        if (onChange) {
            onChange(values);
        }
    };

    const getCars = (cars) => cars.map(car => {
        const { _id, name, image } = car;
        return { _id, name, image };
    });

    const _fetch = (page, keyword, company, pickupLocation) => {
        const data = { company, pickupLocation };

        if (closeDialog) {
            setCloseDialog(false);
        }

        if (company === '-1' || pickupLocation === '-1') {
            setOpenDialog(true);
            return;
        }

        setLoading(true);

        CarService.getBookingCars(keyword, data, page, Env.PAGE_SIZE)
            .then(data => {
                const _data = getCars(data);
                const _cars = page === 1 ? _data : [...cars, ..._data];

                setCars(_cars);
                setFetch(data.length > 0);
                setReload(false);
                setInit(true);
                setLoading(false);
            })
            .catch(() => {
                UserService.signout()
            });
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setCloseDialog(true);
    }

    return (
        <div>
            <MultipleSelect
                label={label}
                callbackFromMultipleSelect={handleChange}
                options={cars}
                selectedOptions={selectedOptions}
                loading={loading}
                required={required}
                multiple={multiple}
                type={Env.RECORD_TYPE.CAR}
                variant={variant || 'standard'}
                ListboxProps={{
                    onScroll: (event) => {
                        const listboxNode = event.currentTarget;
                        if (fetch && !loading && (listboxNode.scrollTop + listboxNode.clientHeight >= (listboxNode.scrollHeight - Env.PAGE_OFFSET))) {
                            const p = page + 1;
                            setPage(p);
                            _fetch(p, keyword, _company, _pickupLocation);
                        }
                    }
                }}
                onOpen={
                    (event) => {
                        if (!init || reload) {
                            const p = 1;
                            setCars([]);
                            setPage(p);
                            _fetch(p, keyword, _company, _pickupLocation);
                        }
                    }
                }
                onInputChange={
                    (event) => {
                        const value = (event && event.target ? event.target.value : null) || '';

                        if (value !== keyword) {
                            setCars([]);
                            setPage(1);
                            setKeyword(value);
                            _fetch(1, value, _company, _pickupLocation);
                        }
                    }
                }
                onClear={
                    (event) => {
                        setCars([]);
                        setPage(1);
                        setKeyword('');
                        setFetch(true);
                        _fetch(1, '', _company, _pickupLocation);
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
                    {(_company === '-1' && _pickupLocation === '-1')
                        ? `${strings.REQUIRED_FIELDS}${blStrings.COMPANY} ${commonStrings.AND} ${bfStrings.PICKUP_LOCATION}`
                        : (
                            _company === '-1' ? `${strings.REQUIRED_FIELD}${blStrings.COMPANY}`
                                :
                                _pickupLocation === '-1' ? `${strings.REQUIRED_FIELD}${bfStrings.PICKUP_LOCATION}` : <></>
                        )
                    }
                </DialogContent>
                <DialogActions className='dialog-actions'>
                    <Button onClick={handleCloseDialog} variant='contained' className='btn-secondary'>{commonStrings.CLOSE}</Button>
                </DialogActions>
            </Dialog>

        </div>
    );
};

export default CarSelectList;