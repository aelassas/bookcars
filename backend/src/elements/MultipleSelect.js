import React, { useState, useEffect, forwardRef, useRef, useImperativeHandle } from 'react';
import Env from '../config/env.config';
import Helper from '../common/Helper';
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
    type,
    variant
}) {
    // const [init, setInit] = useState(false);
    const [values, setValues] = useState([]);

    useEffect(_ => {
        // if (!init) {
        if (selectedOptions && selectedOptions.length > 0) {
            setValues(selectedOptions || []);
        }
        // setInit(true);
        // }
    }, [selectedOptions]);

    return (
        <div className='multiple-select'>
            <Autocomplete
                options={options}
                value={multiple ? values : (values.length > 0 ? values[0] : null)}
                getOptionLabel={(option) => (option && option.name) || ''}
                isOptionEqualToValue={(option, value) => value._id && option._id === value._id}
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
                renderInput={(params) => {
                    if (type === Env.RECORD_TYPE.COMPANY && !multiple && values.length === 1 && values[0]) {
                        const option = values[0];

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
                                                <img src={Helper.joinURL(Env.CDN_USERS, option.image)}
                                                    alt={option.name}
                                                    style={{
                                                        width: Env.COMPANY_IMAGE_WIDTH,
                                                        // height: Env.COMPANY_IMAGE_HEIGHT
                                                    }} />
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
                renderOption={(props, option, { selected }) => {
                    if (type === Env.RECORD_TYPE.COMPANY) {
                        return (
                            <li {...props}>
                                <span className='option-image'>
                                    <img src={Helper.joinURL(Env.CDN_USERS, option.image)}
                                        alt={option.name}
                                        style={{
                                            width: Env.COMPANY_IMAGE_WIDTH,
                                            // height: Env.COMPANY_IMAGE_HEIGHT
                                        }} />
                                </span>
                                <span className='option-name'>{option.name}</span>
                            </li>
                        );
                    } else if (type === Env.RECORD_TYPE.LOCATION) {
                        return (
                            <li {...props}>
                                <span className='option-image'>
                                    <LocationIcon />
                                </span>
                                <span className='option-name'>{option.name}</span>
                            </li>
                        );
                    }

                    return (
                        <li {...props}>
                            <span>{option.name}</span>
                        </li>
                    );

                }}
                ListboxProps={ListboxProps || null}
                onFocus={onFocus || null}
                onInputChange={onInputChange || null}
                ListboxComponent={ListBox}
            />
        </div>
    );
}
