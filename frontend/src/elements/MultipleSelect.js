import React, { useState, useEffect, forwardRef, useRef, useImperativeHandle } from 'react';
import Env from '../config/env.config';
import {
    Autocomplete,
    TextField,
    InputAdornment
} from '@mui/material';
import {
    LocationOn as LocationIcon
} from '@mui/icons-material';

import '../assets/css/multiple-select.css';

const ListBox = forwardRef(
    function ListBoxBase(props, ref) {
        const { children, ...rest } = props;

        const innerRef = useRef(null);

        useImperativeHandle(ref, () => innerRef.current);

        return (
            // eslint-disable-next-line
            <ul {...rest} ref={innerRef} role='list-box'>{children}</ul>
        );
    },
);

export default function MultipleSelect({
    label,
    callbackFromMultipleSelect,
    reference,
    selectedOptions,
    key,
    required,
    options,
    ListboxProps,
    onFocus,
    onInputChange,
    onClear,
    loading,
    multiple,
    freeSolo,
    type,
    variant,
    onOpen,
    readOnly
}) {
    const [values, setValues] = useState([]);
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        setValues(selectedOptions);
        if (selectedOptions && selectedOptions.length === 0) setInputValue('')
    }, [selectedOptions, type]);

    return (
        <div className='multiple-select'>
            <Autocomplete
                readOnly={readOnly}
                options={options}
                value={multiple ? values : (values.length > 0 ? values[0] : null)}
                getOptionLabel={(option) => (option && option.name) || ''}
                isOptionEqualToValue={(option, value) => option._id === value._id}
                onChange={(event, newValue) => {
                    if (multiple) {
                        setValues(newValue);
                        callbackFromMultipleSelect(newValue, key, reference);
                        if (newValue.length === 0 && onClear) {
                            onClear();
                        }
                    } else {
                        const value = (newValue && [newValue]) || [];
                        setValues(value);
                        callbackFromMultipleSelect(value, key, reference);
                        if (!newValue) {
                            if (onClear) {
                                onClear();
                            }
                        }
                    }
                }}
                clearOnBlur={false}
                clearOnEscape={false}
                loading={loading}
                multiple={multiple}
                freeSolo={freeSolo}
                renderInput={(params) => {

                    if (type === Env.RECORD_TYPE.LOCATION && !multiple && values.length === 0) {
                        return (
                            <TextField
                                {...params}
                                label={label}
                                variant={variant || 'outlined'}
                                required={required && values && values.length === 0}
                                InputProps={{
                                    ...params.InputProps,
                                    endAdornment: (
                                        <>
                                        </>
                                    ),
                                }}
                            />
                        );
                    }

                    if (type === Env.RECORD_TYPE.LOCATION && !multiple && values.length === 1 && values[0]) {

                        return (
                            <TextField
                                {...params}
                                label={label}
                                variant={variant || 'outlined'}
                                required={required && values && values.length === 0}
                                InputProps={{
                                    ...params.InputProps,
                                    startAdornment: (
                                        <>
                                            <InputAdornment position='start'>
                                                <LocationIcon />
                                            </InputAdornment>
                                            {params.InputProps.startAdornment}
                                        </>
                                    ),
                                }}
                            />
                        );
                    }

                    return (
                        <TextField
                            {...params}
                            label={label}
                            variant={variant || 'outlined'}
                            required={required && values && values.length === 0}
                        />
                    );
                }}
                inputValue={inputValue}
                onInputChange={(event, newInputValue) => {
                    setInputValue(newInputValue);
                    if (onInputChange) onInputChange(event);
                }}
                renderOption={(props, option, { selected }) => {
                    if (type === Env.RECORD_TYPE.LOCATION) {
                        return (
                            <li {...props} className={`${props.className} ms-option`}>
                                <span className='option-image'>
                                    <LocationIcon />
                                </span>
                                <span className='option-name'>{option.name}</span>
                            </li>
                        );
                    }

                    return (
                        <li {...props} className={`${props.className} ms-option`}>
                            <span>{option.name}</span>
                        </li>
                    );

                }}
                ListboxProps={ListboxProps || null}
                onFocus={onFocus || null}
                ListboxComponent={ListBox}
                onOpen={onOpen || null}
            />
        </div>
    );
}
