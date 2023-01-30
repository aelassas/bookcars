import React, { useState, useEffect } from 'react';
import Env from '../config/env.config';
import {
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import { strings } from "../lang/cars";

const CarTypeList = (props) => {
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
                <MenuItem value={Env.CAR_TYPE.DIESEL}>{strings.DIESEL}</MenuItem>
                <MenuItem value={Env.CAR_TYPE.GASOLINE}>{strings.GASOLINE}</MenuItem>
            </Select>
        </div>
    );
};

export default CarTypeList;