import React, { useState, useEffect, useRef } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/cars';
import Accordion from './Accordion';

import '../assets/css/mileage-filter.css'

const MileageFilter = (props) => {
    const [allChecked, setAllChecked] = useState(true);
    const [values, setValues] = useState([Env.MILEAGE.LIMITED, Env.MILEAGE.UNLIMITED]);

    const limitedRef = useRef();
    const unlimitedRef = useRef();

    useEffect(() => {
        if (allChecked && limitedRef.current && unlimitedRef.current) {
            limitedRef.current.checked = true;
            unlimitedRef.current.checked = true;
        }
    }, [allChecked]);

    const handleLimitedMileageChange = (e) => {
        if (e.currentTarget.checked) {
            values.push(Env.MILEAGE.LIMITED);

            if (values.length === 2) {
                setAllChecked(true);
            }
        } else {
            values.splice(values.findIndex(v => v === Env.MILEAGE.LIMITED), 1);

            if (values.length === 0) {
                setAllChecked(false);
            }
        }

        setValues(values);

        if (props.onChange) {
            props.onChange(values);
        }
    };

    const handleLimitedMileageClick = (e) => {
        const checkbox = e.currentTarget.previousSibling;
        checkbox.checked = !checkbox.checked;
        const event = e;
        event.currentTarget = checkbox;
        handleLimitedMileageChange(event);
    };

    const handleUnlimitedMileageChange = (e) => {
        if (e.currentTarget.checked) {
            values.push(Env.MILEAGE.UNLIMITED);

            if (values.length === 2) {
                setAllChecked(true);
            }
        } else {
            values.splice(values.findIndex(v => v === Env.MILEAGE.UNLIMITED), 1);

            if (values.length === 0) {
                setAllChecked(false);
            }
        }

        setValues(values);

        if (props.onChange) {
            props.onChange(values);
        }
    };

    const handleUnlimitedMileageClick = (e) => {
        const checkbox = e.currentTarget.previousSibling;
        checkbox.checked = !checkbox.checked;
        const event = e;
        event.currentTarget = checkbox;
        handleUnlimitedMileageChange(event);
    };

    const handleUncheckAllChange = (e) => {
        if (allChecked) { // uncheck all
            limitedRef.current.checked = false;
            unlimitedRef.current.checked = false;

            setAllChecked(false);
            setValues([]);
        } else { // check all
            limitedRef.current.checked = true;
            unlimitedRef.current.checked = true;

            const values = [Env.MILEAGE.LIMITED, Env.MILEAGE.UNLIMITED];

            setAllChecked(true);
            setValues(values);

            if (props.onChange) {
                props.onChange(values);
            }
        }
    };

    return (
        <Accordion title={strings.MILEAGE} className={`${props.className ? `${props.className} ` : ''}mileage-filter`}>
            <div className='filter-elements'>
                <div className='filter-element'>
                    <input ref={limitedRef} type='checkbox' className='mileage-checkbox' onChange={handleLimitedMileageChange} />
                    <label onClick={handleLimitedMileageClick}>{strings.LIMITED}</label>
                </div>
                <div className='filter-element'>
                    <input ref={unlimitedRef} type='checkbox' className='mileage-checkbox' onChange={handleUnlimitedMileageChange} />
                    <label onClick={handleUnlimitedMileageClick}>{strings.UNLIMITED}</label>
                </div>
                <div className='filter-actions'>
                    <span onClick={handleUncheckAllChange} className='uncheckall'>
                        {allChecked ? commonStrings.UNCHECK_ALL : commonStrings.CHECK_ALL}
                    </span>
                </div>
            </div>
        </Accordion>
    );
}

export default MileageFilter;