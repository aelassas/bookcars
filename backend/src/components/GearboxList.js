import React, { useState, useEffect } from 'react';
import Env from '../config/env.config';
import {
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import { strings } from "../lang/cars";

const GearboxList = (props) => {
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
                <MenuItem value={Env.GEARBOX_TYPE.AUTOMATIC}>{strings.GEARBOX_AUTOMATIC}</MenuItem>
                <MenuItem value={Env.GEARBOX_TYPE.MANUAL}>{strings.GEARBOX_MANUAL}</MenuItem>
            </Select>
        </div>
    );
};

export default GearboxList;