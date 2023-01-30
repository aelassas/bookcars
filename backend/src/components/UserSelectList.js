import React, { useState, useEffect } from 'react';
import Env from '../config/env.config';
import * as UserService from '../services/UserService';
import * as Helper from '../common/Helper';
import MultipleSelect from './MultipleSelect';

const UserSelectList = (props) => {
    const [init, setInit] = useState(false);
    const [loading, setLoading] = useState(false);
    const [drivers, setDrivers] = useState([]);
    const [fetch, setFetch] = useState(false);
    const [page, setPage] = useState(1);
    const [keyword, setKeyword] = useState('');
    const [selectedOptions, setSelectedOptions] = useState([]);

    useEffect(() => {
        const _value = props.multiple ? props.value : [props.value];
        if (props.value && !Helper.arrayEqual(selectedOptions, _value)) {
            setSelectedOptions(_value);
        }
    }, [props.multiple, props.value, selectedOptions]);

    const getDrivers = (users) => users.map(user => {
        const { _id, fullName, avatar } = user;
        return { _id, name: fullName, image: avatar };
    });

    const _fetch = (page, keyword, onFetch) => {
        setLoading(true);

        UserService.getDrivers(keyword, page, Env.PAGE_SIZE)
            .then(data => {
                const _data = data.length > 0 ? getDrivers(data[0].resultData) : [];
                const _drivers = page === 1 ? _data : [...drivers, ..._data];

                setDrivers(_drivers);
                setFetch(_data.length > 0);
                setLoading(false);

                if (onFetch) {
                    onFetch();
                }
            })
            .catch(() => {
                UserService.signout();
            });
    };

    const handleChange = (values, key, reference) => {
        if (props.onChange) {
            props.onChange(values);
        }
    };

    return (
        <MultipleSelect
            loading={loading}
            label={props.label || ''}
            callbackFromMultipleSelect={handleChange}
            options={drivers}
            selectedOptions={selectedOptions}
            required={props.required || false}
            multiple={props.multiple}
            type={Env.RECORD_TYPE.USER}
            variant={props.variant || 'standard'}
            ListboxProps={{
                onScroll: (event) => {
                    const listboxNode = event.currentTarget;
                    if (fetch && !loading && (listboxNode.scrollTop + listboxNode.clientHeight >= (listboxNode.scrollHeight - Env.PAGE_OFFSET))) {
                        const p = page + 1;
                        setPage(p);
                        _fetch(p, keyword);
                    }
                }
            }}
            onFocus={
                (event) => {
                    if (!init) {
                        const p = 1;
                        setPage(p);
                        setDrivers([]);
                        _fetch(p, keyword, () => {
                            setInit(true);
                        });
                    }
                }
            }
            onInputChange={
                (event) => {
                    const value = (event && event.target ? event.target.value : null) || '';

                    //if (event.target.type === 'text' && value !== keyword) {
                    if (value !== keyword) {
                        setDrivers([]);
                        setPage(1);
                        setKeyword(value);
                        _fetch(1, value);
                    }
                }
            }
            onClear={
                (event) => {
                    setDrivers([]);
                    setPage(1);
                    setKeyword('');
                    setFetch(true);
                    _fetch(1, '');
                }
            }
        />
    );
}

export default UserSelectList;