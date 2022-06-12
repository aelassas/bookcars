import React, { Component } from 'react';
import { strings as commonStrings } from '../lang/common';
import Helper from '../common/Helper';

import '../assets/css/status-filter.css';
import Accordion from './Accordion';

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
        const checkboxes = document.querySelectorAll('.status-checkbox');

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

    componentDidMount() {
        const statuses = Helper.getBookingStatuses();

        this.setState({ statuses, checkedStatuses: Helper.clone(statuses.map(status => status.value)) }, () => {
            const checkboxes = document.querySelectorAll('.status-checkbox');

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
                    className={`${this.props.className ? `${this.props.className} ` : ''}status-filter`}
                >
                    <ul className='status-list'>
                        {
                            statuses.map(status => (
                                <li key={status.value}>
                                    <input type='checkbox' data-value={status.value} className='status-checkbox' onChange={this.handleCheckStatusChange} />
                                    <label onClick={this.handleStatusClick} className={`bs bs-${status.value}`}>{Helper.getBookingStatus(status.value)}</label>
                                </li>
                            ))
                        }
                    </ul>
                    <div className='filter-actions'>
                        <span onClick={this.handleUncheckAllChange} className='uncheckall'>
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