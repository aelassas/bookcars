import React, { useState, useEffect } from 'react';
import Env from '../config/env.config';
import {
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import { strings } from "../lang/cars";

const FuelPolicyList = (props) => {
    const [value, setValue] = useState('');

    useEffect(() => {
        setValue(props.value || '');
    }, [props.value]);

    const handleChange = (e) => {
        const value = e.target.value || '';
        setValue(value);

        if (props.onChange) {
            props.onChange(value);
        }
    };

    return (
        <div>
            <InputLabel className={props.required ? 'required' : null}>{props.label}</InputLabel>
            <Select
                label={props.label}
                value={value}
                onChange={handleChange}
                variant={props.variant || 'standard'}
                required={props.required}
                fullWidth
            >
                <MenuItem value={Env.FUEL_POLICY.LIKE_FOR_LIKE}>{strings.FUEL_POLICY_LIKE_FOR_LIKE}</MenuItem>
                <MenuItem value={Env.FUEL_POLICY.FREE_TANK}>{strings.FUEL_POLICY_FREE_TANK}</MenuItem>
            </Select>
        </div>
    );
};

export default FuelPolicyList;