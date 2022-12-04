import React, { useState, useEffect } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import {
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import * as Helper from '../common/Helper';

import '../assets/css/status-list.css';

const StatusList = (props) => {
    const [value, setValue] = useState('');

    useEffect(() => {
        if (props.value && props.value !== value) {
            setValue(props.value);
        }

    }, [props.value, value])

    const handleChange = (e) => {
        setValue(e.target.value);

        if (props.onChange) {
            props.onChange(e.target.value);
        }
    };

    return (
        <div style={props.style}>
            {props.disabled ?
                <span className={`bs-s-sv bs-s-${value}`} style={{ marginTop: 5 }}>{Helper.getBookingStatus(value)}</span>
                :
                <>
                    <InputLabel className={props.required ? 'required' : null}>{props.label}</InputLabel>
                    <Select
                        label={props.label}
                        value={value}
                        onChange={handleChange}
                        variant={props.variant || 'standard'}
                        required={props.required}
                        fullWidth
                        renderValue={(value) => (
                            <span className={`bs-s-sv bs-s-${value}`}>{Helper.getBookingStatus(value)}</span>
                        )}
                    >
                        <MenuItem value={Env.BOOKING_STATUS.VOID} className='bs-s bs-s-void'>{commonStrings.BOOKING_STATUS_VOID}</MenuItem>
                        <MenuItem value={Env.BOOKING_STATUS.PENDING} className='bs-s bs-s-pending'>{commonStrings.BOOKING_STATUS_PENDING}</MenuItem>
                        <MenuItem value={Env.BOOKING_STATUS.DEPOSIT} className='bs-s bs-s-deposit'>{commonStrings.BOOKING_STATUS_DEPOSIT}</MenuItem>
                        <MenuItem value={Env.BOOKING_STATUS.PAID} className='bs-s bs-s-paid'>{commonStrings.BOOKING_STATUS_PAID}</MenuItem>
                        <MenuItem value={Env.BOOKING_STATUS.RESERVED} className='bs-s bs-s-reserved'>{commonStrings.BOOKING_STATUS_RESERVED}</MenuItem>
                        <MenuItem value={Env.BOOKING_STATUS.CANCELLED} className='bs-s bs-s-cancelled'>{commonStrings.BOOKING_STATUS_CANCELLED}</MenuItem>
                    </Select>
                </>
            }
        </div>
    );
}

export default StatusList;