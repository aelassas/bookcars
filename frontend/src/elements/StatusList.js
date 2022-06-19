import React, { Component } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import {
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';

import '../assets/css/status-list.css';
import Helper from '../common/Helper';

class StatusList extends Component {

    constructor(props) {
        super(props);
        this.state = {
            value: ''
        }
    }

    handleChange = (e) => {
        this.setState({ value: e.target.value }, () => {
            if (this.props.onChange) {
                this.props.onChange(e.target.value);
            }
        });
    }

    static getDerivedStateFromProps(props, state) {
        const { value } = state;

        if (value === '' && props.value && props.value !== value) {
            return { value: props.value };
        }

        return null;
    }

    render() {
        const { value } = this.state;

        return (
            <div style={this.props.style}>
                {this.props.disabled ?
                    <span className={`bs-s-sv bs-s-${value}`} style={{ marginTop: 5 }}>{Helper.getBookingStatus(value)}</span>
                    :
                    <>
                        <InputLabel className={this.props.required ? 'required' : null}>{this.props.label}</InputLabel>
                        <Select
                            label={this.props.label}
                            value={value}
                            onChange={this.handleChange}
                            variant={this.props.variant || 'standard'}
                            required={this.props.required}
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
}

export default StatusList;