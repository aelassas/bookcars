import React, { useEffect, useRef, useState } from 'react';
import { strings as commonStrings } from '../lang/common';
import * as Helper from '../common/Helper';

import '../assets/css/user-type-filter.css';

const UserTypeFilter = (props) => {
    const userTypes = Helper.getUserTypes();
    const [checkedUserTypes, setCheckedUserTypes] = useState(userTypes.map(user => user.value));
    const [allChecked, setAllChecked] = useState(true);
    const refs = useRef([]);

    useEffect(() => {
        refs.current.forEach(checkbox => {
            checkbox.checked = true;
        })
    }, []);

    const handleUserTypeClick = (e) => {
        const checkbox = e.currentTarget.previousSibling;
        checkbox.checked = !checkbox.checked;
        const event = e;
        event.currentTarget = checkbox;
        handleUserTypeChange(event);
    };

    const handleUserTypeChange = (e) => {
        const user = e.currentTarget.getAttribute('data-value');

        if (e.currentTarget.checked) {
            checkedUserTypes.push(user);

            if (checkedUserTypes.length === userTypes.length) {
                setAllChecked(true);
            }
        } else {
            const index = checkedUserTypes.findIndex(s => s === user);
            checkedUserTypes.splice(index, 1);

            if (checkedUserTypes.length === 0) {
                setAllChecked(false);
            }
        }

        setCheckedUserTypes(checkedUserTypes);

        if (props.onChange) {
            props.onChange(checkedUserTypes);
        }
    };

    const handleUncheckAllChange = (e) => {

        if (allChecked) { // uncheck all
            refs.current.forEach(checkbox => {
                checkbox.checked = false;
            });

            setAllChecked(false);
            setCheckedUserTypes([]);
        } else { // check all
            refs.current.forEach(checkbox => {
                checkbox.checked = true;
            });

            const _userTypes = userTypes.map(user => user.value);
            setAllChecked(true);
            setCheckedUserTypes(_userTypes);

            if (props.onChange) {
                props.onChange(_userTypes);
            }
        }
    };

    return (
        <div className={`${props.className ? `${props.className} ` : ''}user-type-filter`}>
            <ul className='user-type-list'>
                {
                    userTypes.map((userType, index) => (
                        <li key={userType.value}>
                            <input ref={ref => refs.current[index] = ref} type='checkbox' data-value={userType.value} className='user-type-checkbox' onChange={handleUserTypeChange} />
                            <label onClick={handleUserTypeClick} className={`bs bs-${userType.value}`}>{Helper.getUserType(userType.value)}</label>
                        </li>
                    ))
                }
            </ul>
            <div className='filter-actions'>
                <span onClick={handleUncheckAllChange} className='uncheckall'>
                    {allChecked ? commonStrings.UNCHECK_ALL : commonStrings.CHECK_ALL}
                </span>
            </div>
        </div>
    );
};

export default UserTypeFilter;