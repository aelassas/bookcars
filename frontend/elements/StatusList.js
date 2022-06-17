import React, { Component } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import {
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import Helper from '../common/Helper';

import styles from '../styles/status-list.module.css';

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

    getStatusClassName = (value) => (
        value === 'void' ? styles.bsSVoid
            : value === 'pending' ? styles.bsSPending
                : value === 'deposit' ? styles.bsSDeposit
                    : value === 'paid' ? styles.bsSPaid
                        : value === 'reserved' ? styles.bsSReserved
                            : value === 'paid' ? styles.bsSPaid
                                : value === 'cancelled' ? styles.bsSCancelled
                                    : ''
    )

    componentDidMount() {
        Helper.setLanguage(commonStrings);
    }

    render() {
        const { value } = this.state;

        return (
            <div style={this.props.style}>
                {this.props.disabled ?
                    <span className={`${styles.bsSSSv} ${this.getStatusClassName(value)}`} style={{ marginTop: 5 }}>{Helper.getBookingStatus(value)}</span>
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
                                <span className={`${styles.bsSSSv} ${this.getStatusClassName(value)}`}>{Helper.getBookingStatus(value)}</span>
                            )}
                        >
                            <MenuItem value={Env.BOOKING_STATUS.VOID} className={styles.bsSVoid}>{commonStrings.BOOKING_STATUS_VOID}</MenuItem>
                            <MenuItem value={Env.BOOKING_STATUS.PENDING} className={styles.bsSPending}>{commonStrings.BOOKING_STATUS_PENDING}</MenuItem>
                            <MenuItem value={Env.BOOKING_STATUS.DEPOSIT} className={styles.bsSDeposit}>{commonStrings.BOOKING_STATUS_DEPOSIT}</MenuItem>
                            <MenuItem value={Env.BOOKING_STATUS.PAID} className={styles.bsSPaid}>{commonStrings.BOOKING_STATUS_PAID}</MenuItem>
                            <MenuItem value={Env.BOOKING_STATUS.RESERVED} className={styles.bsReserved}>{commonStrings.BOOKING_STATUS_RESERVED}</MenuItem>
                            <MenuItem value={Env.BOOKING_STATUS.CANCELLED} className={styles.bsSCancelled}>{commonStrings.BOOKING_STATUS_CANCELLED}</MenuItem>
                        </Select>
                    </>
                }
            </div>
        );
    }
}

export default StatusList;