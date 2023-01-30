import React, { useState, useEffect, useRef } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/cars';
import Accordion from './Accordion';

import '../assets/css/availability-filter.css'

const AvailabilityFilter = (props) => {
    const [allChecked, setAllChecked] = useState(true);
    const [values, setValues] = useState([Env.AVAILABILITY.AVAILABLE, Env.AVAILABILITY.UNAVAILABLE]);

    const availableRef = useRef();
    const unavailableRef = useRef();

    useEffect(() => {
        if (allChecked && availableRef.current && unavailableRef.current) {
            availableRef.current.checked = true;
            unavailableRef.current.checked = true;
        }
    }, [allChecked]);

    const handleAvailableChange = (e) => {
        if (e.currentTarget.checked) {
            values.push(Env.AVAILABILITY.AVAILABLE);

            if (values.length === 2) {
                setAllChecked(true);
            }
        } else {
            values.splice(values.findIndex(v => v === Env.AVAILABILITY.AVAILABLE), 1);

            if (values.length === 0) {
                setAllChecked(false);
            }
        }

        setValues(values);

        if (props.onChange) {
            props.onChange(values);
        }
    };

    const handleAvailableClick = (e) => {
        const checkbox = e.currentTarget.previousSibling;
        checkbox.checked = !checkbox.checked;
        const event = e;
        event.currentTarget = checkbox;
        handleAvailableChange(event);
    };

    const handleUnavailableChange = (e) => {
        if (e.currentTarget.checked) {
            values.push(Env.AVAILABILITY.UNAVAILABLE);

            if (values.length === 2) {
                setAllChecked(true);
            }
        } else {
            values.splice(values.findIndex(v => v === Env.AVAILABILITY.UNAVAILABLE), 1);

            if (values.length === 0) {
                setAllChecked(false);
            }
        }

        setValues(values);

        if (props.onChange) {
            props.onChange(values);
        }
    };

    const handleUnavailableClick = (e) => {
        const checkbox = e.currentTarget.previousSibling;
        checkbox.checked = !checkbox.checked;
        const event = e;
        event.currentTarget = checkbox;
        handleUnavailableChange(event);
    };

    const handleUncheckAllChange = (e) => {
        if (allChecked) { // uncheck all
            availableRef.current.checked = false;
            unavailableRef.current.checked = false;

            setAllChecked(false);
            setValues([]);
        } else { // check all
            availableRef.current.checked = true;
            unavailableRef.current.checked = true;

            const values = [Env.MILEAGE.LIMITED, Env.MILEAGE.UNLIMITED];

            setAllChecked(true);
            setValues(values);

            if (props.onChange) {
                props.onChange(values);
            }
        }
    };

    return (
        <Accordion title={strings.AVAILABILITY} className={`${props.className ? `${props.className} ` : ''}availability-filter`}>
            <div className='filter-elements'>
                <div className='filter-element'>
                    <input ref={availableRef} type='checkbox' className='availability-checkbox' onChange={handleAvailableChange} />
                    <label onClick={handleAvailableClick}>{strings.AVAILABLE}</label>
                </div>
                <div className='filter-element'>
                    <input ref={unavailableRef} type='checkbox' className='availability-checkbox' onChange={handleUnavailableChange} />
                    <label onClick={handleUnavailableClick}>{strings.UNAVAILABLE}</label>
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

export default AvailabilityFilter;