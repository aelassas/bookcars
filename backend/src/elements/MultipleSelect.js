import React, { useState, useEffect, forwardRef, useRef, useImperativeHandle } from 'react';
import { Autocomplete, TextField } from '@mui/material'

import '../assets/css/auto-complete.css';

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
    selectedValues,
    key,
    required,
    options,
    ListboxProps,
    onFocus,
    onInputChange,
    onClear,
    loading,
    multiple
}) {
    const [values, setValues] = useState([]);

    useEffect(() => {
        setValues(selectedValues);
    }, [selectedValues]);

    return (
        <div className='auto-complete'>
            <Autocomplete
                options={[...values, ...options]}
                filterOptions={() => options}
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
                        setValues([newValue]);
                        callbackFromMultipleSelect([newValue], key, reference);
                        if (!newValue && onClear) {
                            onClear();
                        }
                    }
                }}
                clearOnBlur={false}
                clearOnEscape={false}
                loading={loading}
                multiple={multiple}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label={label}
                        variant="outlined"
                        required={required && values.length === 0}
                    />
                )}
                ListboxProps={ListboxProps || null}
                onFocus={onFocus || null}
                onInputChange={onInputChange || null}
                ListboxComponent={ListBox}
            />
        </div>
    );
}
