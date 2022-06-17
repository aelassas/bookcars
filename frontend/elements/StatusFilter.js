import React, { Component } from 'react';
import { strings as commonStrings } from '../lang/common';
import Helper from '../common/Helper';
import Accordion from '../elements/Accordion';

import styles from '../styles/status-filter.module.css';

class StatusFilter extends Component {

    constructor(props) {
        super(props);
        this.state = {
            statuses: [],
            checkedStatuses: [],
            allChecked: true
        }
    }

    handleStatusClick = (e) => {
        const checkbox = e.currentTarget.previousSibling;
        checkbox.checked = !checkbox.checked;
        const event = e;
        event.currentTarget = checkbox;
        this.handleCheckStatusChange(event);
    };

    handleCheckStatusChange = (e) => {
        const { statuses, checkedStatuses } = this.state;
        const status = e.currentTarget.getAttribute('data-value');

        if (e.currentTarget.checked) {
            checkedStatuses.push(status);

            if (checkedStatuses.length === statuses.length) {
                this.setState({ allChecked: true });
            }
        } else {
            const index = checkedStatuses.findIndex(s => s === status);
            checkedStatuses.splice(index, 1);

            if (checkedStatuses.length === 0) {
                this.setState({ allChecked: false });
            }
        }

        this.setState({ checkedStatuses }, () => {
            if (this.props.onChange) {
                this.props.onChange(checkedStatuses);
            }
        });
    };

    handleUncheckAllChange = (e) => {
        const { allChecked } = this.state;
        const checkboxes = document.querySelectorAll(`.${styles.statusCheckbox}`);

        if (allChecked) { // uncheck all
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });

            this.setState({ allChecked: false, checkedStatuses: [] });
        } else { // check all
            checkboxes.forEach(checkbox => {
                checkbox.checked = true;
            });

            const statuses = this.state.statuses.map(status => status.value);
            this.setState({ allChecked: true, checkedStatuses: statuses }, () => {
                if (this.props.onChange) {
                    this.props.onChange(statuses);
                }
            });
        }
    };

    getStatusClassName = (status) => (
        status.value === 'void' ? styles.bsVoid
            : status.value === 'pending' ? styles.bsPending
                : status.value === 'deposit' ? styles.bsDeposit
                    : status.value === 'paid' ? styles.bsPaid
                        : status.value === 'reserved' ? styles.bsReserved
                            : status.value === 'paid' ? styles.bsPaid
                                : status.value === 'cancelled' ? styles.bsCancelled
                                    : ''
    )

    componentDidMount() {
        Helper.setLanguage(commonStrings);

        const statuses = Helper.getBookingStatuses();

        this.setState({ statuses, checkedStatuses: Helper.clone(statuses.map(status => status.value)) }, () => {
            const checkboxes = document.querySelectorAll(`.${styles.statusCheckbox}`);

            checkboxes.forEach(checkbox => {
                checkbox.checked = true;
            });

            if (this.props.onLoad) {
                this.props.onLoad(this.state.checkedStatuses);
            }
        });
    }

    render() {
        const { statuses, allChecked } = this.state;

        return (
            statuses.length > 0 ? (
                <Accordion
                    title={commonStrings.STATUS}
                    collapse={this.props.collapse}
                    className={`${this.props.className ? `${this.props.className} ` : ''}${styles.statusFilter}`}
                >
                    <ul className={styles.statusList}>
                        {
                            statuses.map(status => (
                                <li key={status.value}>
                                    <input type='checkbox' data-value={status.value} className={styles.statusCheckbox} onChange={this.handleCheckStatusChange} />
                                    <label
                                        onClick={this.handleStatusClick}
                                        className={`${styles.bs} ${this.getStatusClassName(status)}`}>
                                        {Helper.getBookingStatus(status.value)}
                                    </label>
                                </li>
                            ))
                        }
                    </ul>
                    <div className={styles.filterActions}>
                        <span onClick={this.handleUncheckAllChange} className={styles.uncheckall}>
                            {allChecked ? commonStrings.UNCHECK_ALL : commonStrings.CHECK_ALL}
                        </span>
                    </div>
                </Accordion>
            )
                :
                <></>
        );
    }
}

export default StatusFilter;