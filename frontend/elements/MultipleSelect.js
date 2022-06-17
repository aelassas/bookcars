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
import Image from 'next/image';

import styles from '../styles/multiple-select.module.css';

const ListBox =
    forwardRef(function ListBoxBase(props, ref) {
        const { children, ...rest } = props;

        const innerRef = useRef(null);

        useImperativeHandle(ref, () => innerRef.current);
        return (
            // eslint-disable-next-line
            <ul {...rest} ref={innerRef} role='list-box'>{children}</ul>
        );
    });

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
    readOnly,
    hidePopupIcon,
    customOpen
}) {
    const [init, setInit] = React.useState(selectedOptions.length === 0);
    const [open, setOpen] = React.useState(false);
    const [values, setValues] = useState([]);
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        setValues(selectedOptions);
        if (selectedOptions && selectedOptions.length === 0) setInputValue('')
    }, [selectedOptions, type]);

    return (
        <Autocomplete
            open={customOpen ? open : undefined}
            readOnly={readOnly}
            options={options}
            value={multiple ? values : (values.length > 0 ? values[0] : null)}
            getOptionLabel={(option) => (option && option.name) || ''}
            isOptionEqualToValue={(option, value) => option._id === value._id}
            inputValue={inputValue}
            onInputChange={(event, value) => {
                if (init) {
                    if (!event) {
                        setInputValue(value);
                        setOpen(false);
                        return;
                    }

                    if (value.length === 0) {
                        if (open) setOpen(false);
                    } else {
                        if (!open) setOpen(true);
                    }
                } else {
                    setInit(true);
                }

                setInputValue(value);
                if (onInputChange) onInputChange(event);
            }}
            onClose={() => {
                setOpen(false)
            }}
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
            freeSolo={freeSolo}
            handleHomeEndKeys={false}
            popupIcon={hidePopupIcon ? null : undefined}
            renderInput={(params) => {
                const inputProps = params.inputProps;
                inputProps.autoComplete = 'off';

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
                            inputProps={{
                                ...params.inputProps,
                                value: params.inputProps.value
                            }}
                        />
                    );
                }

                if (type === Env.RECORD_TYPE.LOCATION && !multiple && values.length === 1 && values[0]) {
                    return (
                        <TextField
                            {...params}
                            style={{ paddingRight: '0 !important' }}
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
                                )
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
                                            <div style={{
                                                position: 'relative',
                                                width: Env.COMPANY_IMAGE_WIDTH,
                                                height: Env.COMPANY_IMAGE_HEIGHT
                                            }}>
                                                <Image
                                                    src={Helper.joinURL(Env.CDN_USERS, option.image)}
                                                    alt={option.name}
                                                    layout='fill'
                                                    objectFit='contain'
                                                />
                                            </div>
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
                                            <div style={{
                                                position: 'relative',
                                                width: Env.SELECTED_CAR_OPTION_IMAGE_WIDTH,
                                                height: Env.SELECTED_CAR_OPTION_IMAGE_HEIGHT
                                            }}>
                                                <Image
                                                    src={Helper.joinURL(Env.CDN_CARS, option.image)}
                                                    alt={option.name}
                                                    layout='fill'
                                                    objectFit='contain'
                                                />
                                            </div>
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
                if (type === Env.RECORD_TYPE.LOCATION) {
                    return (
                        <li {...props} className={`${props.className} ${styles.msOption}`}>
                            <span className={styles.optionImage}>
                                <LocationIcon />
                            </span>
                            <span className={styles.optionName}>{option.name}</span>
                        </li>
                    );
                } else if (type === Env.RECORD_TYPE.COMPANY) {
                    return (
                        <li {...props} className={`${props.className} ${styles.msOption}`}>
                            <span className={styles.optionImage}>
                                <div style={{
                                    position: 'relative',
                                    width: Env.COMPANY_IMAGE_WIDTH,
                                    height: Env.COMPANY_IMAGE_HEIGHT
                                }}>
                                    <Image
                                        src={Helper.joinURL(Env.CDN_USERS, option.image)}
                                        alt={option.name}
                                        layout='fill'
                                        objectFit='contain'
                                    />
                                </div>
                            </span>
                            <span className={styles.optionName}>{option.name}</span>
                        </li>
                    );
                } else if (type === Env.RECORD_TYPE.CAR) {
                    return (
                        <li  {...props} className={`${props.className} ${styles.msOption}`}>
                            <span className={styles.optionImage}>
                                <div style={{
                                    position: 'relative',
                                    width: 60,
                                    height: 80
                                }}>
                                    <Image
                                        src={Helper.joinURL(Env.CDN_CARS, option.image)}
                                        alt={option.name}
                                        layout='fill'
                                        objectFit='contain'
                                    />
                                </div>
                            </span>
                            <span className={styles.carOptionName}>{option.name}</span>
                        </li>
                    );
                }

                return (
                    <li {...props} className={`${props.className} ${styles.msOption}`}>
                        <span>{option.name}</span>
                    </li>
                );

            }}
            ListboxProps={ListboxProps || null}
            onFocus={onFocus || null}
            ListboxComponent={ListBox}
            onOpen={onOpen || null}
        />
    );
}
