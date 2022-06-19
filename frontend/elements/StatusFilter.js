import React, { useEffect, useRef, useState } from 'react';
import { strings as commonStrings } from '../lang/common';
import Helper from '../common/Helper';
import Accordion from '../elements/Accordion';

import styles from '../styles/status-filter.module.css';

export default function StatusFilter(props) {
    const statuses = Helper.getBookingStatuses();
    const [checkedStatuses, setCheckedStatuses] = useState(statuses.map(status => status.value));
    const [allChecked, setAllChecked] = useState(true);
    const refs = useRef([]);

    useEffect(() => {
        Helper.setLanguage(commonStrings);

        refs.current.forEach(checkbox => {
            checkbox.checked = true;
        });
    }, []);

    const handleStatusClick = (e) => {
        const checkbox = e.currentTarget.previousSibling;
        checkbox.checked = !checkbox.checked;
        const event = e;
        event.currentTarget = checkbox;
        handleCheckStatusChange(event);
    };

    const handleCheckStatusChange = (e) => {
        const status = e.currentTarget.getAttribute('data-value');

        if (e.currentTarget.checked) {
            checkedStatuses.push(status);

            if (checkedStatuses.length === statuses.length) {
                setAllChecked(true);
            }
        } else {
            const index = checkedStatuses.findIndex(s => s === status);
            checkedStatuses.splice(index, 1);

            if (checkedStatuses.length === 0) {
                setAllChecked(false);
            }
        }

        setCheckedStatuses(checkedStatuses);
        if (props.onChange) {
            props.onChange(checkedStatuses);
        }
    };

    const handleUncheckAllChange = (e) => {

        if (allChecked) { // uncheck all
            refs.current.forEach(checkbox => {
                checkbox.checked = false;
            });

            setAllChecked(false);
            setCheckedStatuses([]);
        } else { // check all
            refs.current.forEach(checkbox => {
                checkbox.checked = true;
            });

            const allStatuses = statuses.map(status => status.value);
            setAllChecked(true);
            setCheckedStatuses(allStatuses);

            if (props.onChange) {
                props.onChange(allStatuses);
            }
        }
    };

    const getStatusClassName = (status) => (
        status.value === 'void' ? styles.bsVoid
            : status.value === 'pending' ? styles.bsPending
                : status.value === 'deposit' ? styles.bsDeposit
                    : status.value === 'paid' ? styles.bsPaid
                        : status.value === 'reserved' ? styles.bsReserved
                            : status.value === 'paid' ? styles.bsPaid
                                : status.value === 'cancelled' ? styles.bsCancelled
                                    : ''
    )

    return (
        statuses.length > 0 &&
        <Accordion
            title={commonStrings.STATUS}
            collapse={props.collapse}
            className={`${props.className ? `${props.className} ` : ''}${styles.statusFilter}`}
        >
            <ul className={styles.statusList}>
                {
                    statuses.map((status, index) => (
                        <li key={status.value}>
                            <input ref={ref => refs.current[index] = ref} type='checkbox' data-value={status.value} className={styles.statusCheckbox} onChange={handleCheckStatusChange} />
                            <label
                                onClick={handleStatusClick}
                                className={`${styles.bs} ${getStatusClassName(status)}`}>
                                {Helper.getBookingStatus(status.value)}
                            </label>
                        </li>
                    ))
                }
            </ul>
            <div className={styles.filterActions}>
                <span onClick={handleUncheckAllChange} className={styles.uncheckall}>
                    {allChecked ? commonStrings.UNCHECK_ALL : commonStrings.CHECK_ALL}
                </span>
            </div>
        </Accordion>
    );
}