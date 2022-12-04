import React, { useState, useEffect, forwardRef, useRef, useImperativeHandle } from 'react';
import Env from '../config/env.config';
import * as Helper from '../common/Helper';
import {
    Autocomplete,
    TextField,
    InputAdornment,
    Avatar
} from '@mui/material';
import {
    LocationOn as LocationIcon,
    AccountCircle
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

const MultipleSelect = ({
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
    variant,
    onOpen,
    readOnly
}) => {
    const [values, setValues] = useState([]);
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        setValues(selectedOptions);

        if (selectedOptions && selectedOptions.length === 0) {
            setInputValue('');
        }
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

                    if (event && event.type === 'keydown' && event.key === 'Enter') {
                        return;
                    }

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
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                    }
                }}
                clearOnBlur={false}
                clearOnEscape={false}
                loading={loading}
                multiple={multiple}
                handleHomeEndKeys={false}
                renderInput={(params) => {
                    const inputProps = params.inputProps;
                    inputProps.autoComplete = 'off';

                    if (type === Env.RECORD_TYPE.USER && !multiple && values.length === 1 && values[0]) {
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
                                                {option.image ?
                                                    <Avatar
                                                        src={Helper.joinURL(Env.CDN_USERS, option.image)}
                                                        className='avatar-small suo'
                                                    />
                                                    :
                                                    <AccountCircle className='avatar-small suo' color='disabled' />
                                                }
                                            </InputAdornment>
                                            {params.InputProps.startAdornment}
                                        </>
                                    ),
                                }}
                            />
                        );
                    }

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
                                                    style={{ width: Env.COMPANY_IMAGE_WIDTH }}
                                                />
                                            </InputAdornment>
                                            {params.InputProps.startAdornment}
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

                    if (type === Env.RECORD_TYPE.CAR && !multiple && values.length === 1 && values[0]) {
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
                                                <img src={Helper.joinURL(Env.CDN_CARS, option.image)}
                                                    alt={option.name}
                                                    style={{
                                                        height: Env.SELECTED_CAR_OPTION_IMAGE_HEIGHT
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
                inputValue={inputValue}
                onInputChange={(event, newInputValue) => {
                    setInputValue(newInputValue);
                    if (onInputChange) onInputChange(event);
                }}
                renderOption={(props, option, { selected }) => {
                    if (type === Env.RECORD_TYPE.USER) {
                        return (
                            <li {...props} className={`${props.className} ms-option`}>
                                <span className='option-image'>
                                    {option.image ?
                                        <Avatar
                                            src={Helper.joinURL(Env.CDN_USERS, option.image)}
                                            className='avatar-medium'
                                        />
                                        :
                                        <AccountCircle className='avatar-medium' color='disabled' />
                                    }
                                </span>
                                <span className='option-name'>{option.name}</span>
                            </li>
                        );
                    } else if (type === Env.RECORD_TYPE.COMPANY) {
                        return (
                            <li {...props} className={`${props.className} ms-option`}>
                                <span className='option-image'>
                                    <img src={Helper.joinURL(Env.CDN_USERS, option.image)}
                                        alt={option.name}
                                        style={{ width: Env.COMPANY_IMAGE_WIDTH }}
                                    />
                                </span>
                                <span className='option-name'>{option.name}</span>
                            </li>
                        );
                    } else if (type === Env.RECORD_TYPE.LOCATION) {
                        return (
                            <li {...props} className={`${props.className} ms-option`}>
                                <span className='option-image'>
                                    <LocationIcon />
                                </span>
                                <span className='option-name'>{option.name}</span>
                            </li>
                        );
                    } else if (type === Env.RECORD_TYPE.CAR) {
                        return (
                            <li  {...props} className={`${props.className} ms-option`}>
                                <span className='option-image'>
                                    <img src={Helper.joinURL(Env.CDN_CARS, option.image)}
                                        alt={option.name}
                                        style={{
                                            height: Env.CAR_OPTION_IMAGE_HEIGHT
                                        }} />
                                </span>
                                <span className='car-option-name'>{option.name}</span>
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
};

export default MultipleSelect;
