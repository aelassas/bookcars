import React, { useState, useEffect, useRef } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings } from "../lang/cars";
import Accordion from './Accordion';

import '../assets/css/fuel-filter.css'

const FuelFilter = (props) => {
    const [allChecked, setAllChecked] = useState(true);
    const [values, setValues] = useState([Env.CAR_TYPE.DIESEL, Env.CAR_TYPE.GASOLINE]);

    const dieselRef = useRef();
    const gasolineRef = useRef();

    useEffect(() => {
        if (allChecked && dieselRef.current && gasolineRef.current) {
            dieselRef.current.checked = true;
            gasolineRef.current.checked = true;
        }
    }, [allChecked]);

    const handleCheckDieselChange = (e) => {
        if (e.currentTarget.checked) {
            values.push(Env.CAR_TYPE.DIESEL);

            if (values.length === 2) {
                setAllChecked(true);
            }
        } else {
            values.splice(values.findIndex(v => v === Env.CAR_TYPE.DIESEL), 1);

            if (values.length === 0) {
                setAllChecked(false);
            }
        }

        setValues(values);

        if (props.onChange) {
            props.onChange(values);
        }
    };

    const handleDieselClick = (e) => {
        const checkbox = e.currentTarget.previousSibling;
        checkbox.checked = !checkbox.checked;
        const event = e;
        event.currentTarget = checkbox;
        handleCheckDieselChange(event);
    };

    const handleCheckGasolineChange = (e) => {
        if (e.currentTarget.checked) {
            values.push(Env.CAR_TYPE.GASOLINE);

            if (values.length === 2) {
                setAllChecked(true);
            }
        } else {
            values.splice(values.findIndex(v => v === Env.CAR_TYPE.GASOLINE), 1);

            if (values.length === 0) {
                setAllChecked(false);
            }
        }

        setValues(values);

        if (props.onChange) {
            props.onChange(values);
        }
    };

    const handleGasolineClick = (e) => {
        const checkbox = e.currentTarget.previousSibling;
        checkbox.checked = !checkbox.checked;
        const event = e;
        event.currentTarget = checkbox;
        handleCheckGasolineChange(event);
    };

    const handleUncheckAllChange = (e) => {
        if (allChecked) { // uncheck all
            dieselRef.current.checked = false;
            gasolineRef.current.checked = false;

            setAllChecked(false);
            setValues([]);
        } else { // check all
            dieselRef.current.checked = true;
            gasolineRef.current.checked = true;

            const values = [Env.CAR_TYPE.DIESEL, Env.CAR_TYPE.GASOLINE];

            setAllChecked(true);
            setValues(values);

            if (props.onChange) {
                props.onChange(values);
            }
        }
    };

    return (
        <Accordion title={strings.ENGINE} className={`${props.className ? `${props.className} ` : ''}fuel-filter`}>
            <div className='filter-elements'>
                <div className='filter-element'>
                    <input ref={dieselRef} type='checkbox' className='fuel-checkbox' onChange={handleCheckDieselChange} />
                    <label onClick={handleDieselClick}>{strings.DIESEL}</label>
                </div>
                <div className='filter-element'>
                    <input ref={gasolineRef} type='checkbox' className='fuel-checkbox' onChange={handleCheckGasolineChange} />
                    <label onClick={handleGasolineClick}>{strings.GASOLINE}</label>
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

export default FuelFilter;