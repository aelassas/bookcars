import React, { useState, useEffect } from 'react';
import {
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';

const SeatsList = (props) => {
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
                <MenuItem value={2}>2</MenuItem>
                <MenuItem value={3}>3</MenuItem>
                <MenuItem value={4}>4</MenuItem>
                <MenuItem value={5}>5</MenuItem>
                <MenuItem value={6}>6</MenuItem>
                <MenuItem value={7}>7</MenuItem>
                <MenuItem value={8}>8</MenuItem>
                <MenuItem value={9}>9</MenuItem>
            </Select>
        </div>
    );
};

export default SeatsList;