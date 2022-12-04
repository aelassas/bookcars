import React, { useState, useEffect, useRef } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings } from "../lang/cars";
import Accordion from './Accordion';

import '../assets/css/gearbox-filter.css'

const GearboxFilter = (props) => {
    const [allChecked, setAllChecked] = useState(true);
    const [values, setValues] = useState([Env.GEARBOX_TYPE.AUTOMATIC, Env.GEARBOX_TYPE.MANUAL]);

    const automaticRef = useRef();
    const manualRef = useRef();

    useEffect(() => {
        if (allChecked && automaticRef.current && manualRef.current) {
            automaticRef.current.checked = true;
            manualRef.current.checked = true;
        }
    }, [allChecked]);

    const handleCheckAutomaticChange = (e) => {
        if (e.currentTarget.checked) {
            values.push(Env.GEARBOX_TYPE.AUTOMATIC);

            if (values.length === 2) {
                setAllChecked(true);
            }
        } else {
            values.splice(values.findIndex(v => v === Env.GEARBOX_TYPE.AUTOMATIC), 1);

            if (values.length === 0) {
                setAllChecked(false);
            }
        }

        setValues(values);

        if (props.onChange) {
            props.onChange(values);
        }
    };

    const handleAutomaticClick = (e) => {
        const checkbox = e.currentTarget.previousSibling;
        checkbox.checked = !checkbox.checked;
        const event = e;
        event.currentTarget = checkbox;
        handleCheckAutomaticChange(event);
    };

    const handleCheckManualChange = (e) => {
        if (e.currentTarget.checked) {
            values.push(Env.GEARBOX_TYPE.MANUAL);

            if (values.length === 2) {
                setAllChecked(true);
            }
        } else {
            values.splice(values.findIndex(v => v === Env.GEARBOX_TYPE.MANUAL), 1);

            if (values.length === 0) {
                setAllChecked(false);
            }
        }

        setValues(values);

        if (props.onChange) {
            props.onChange(values);
        }
    };

    const handleManualClick = (e) => {
        const checkbox = e.currentTarget.previousSibling;
        checkbox.checked = !checkbox.checked;
        const event = e;
        event.currentTarget = checkbox;
        handleCheckManualChange(event);
    };

    const handleUncheckAllChange = (e) => {
        if (allChecked) { // uncheck all
            automaticRef.current.checked = false;
            manualRef.current.checked = false;

            setAllChecked(false);
            setValues([]);
        } else { // check all
            automaticRef.current.checked = true;
            manualRef.current.checked = true;

            const values = [Env.GEARBOX_TYPE.AUTOMATIC, Env.GEARBOX_TYPE.MANUAL];

            setAllChecked(true);
            setValues(values);

            if (props.onChange) {
                props.onChange(values);
            }
        }
    };

    return (
        <Accordion title={strings.GEARBOX} className={`${props.className ? `${props.className} ` : ''}gearbox-filter`}>
            <div className='filter-elements'>
                <div className='filter-element'>
                    <input ref={automaticRef} type='checkbox' className='gearbox-checkbox' onChange={handleCheckAutomaticChange} />
                    <label onClick={handleAutomaticClick}>{strings.GEARBOX_AUTOMATIC}</label>
                </div>
                <div className='filter-element'>
                    <input ref={manualRef} type='checkbox' className='gearbox-checkbox' onChange={handleCheckManualChange} />
                    <label onClick={handleManualClick}>{strings.GEARBOX_MANUAL}</label>
                </div>
            </div>
            <div className='filter-actions'>
                <span onClick={handleUncheckAllChange} className='uncheckall'>
                    {allChecked ? commonStrings.UNCHECK_ALL : commonStrings.CHECK_ALL}
                </span>
            </div>
        </Accordion>
    );
}

export default GearboxFilter;