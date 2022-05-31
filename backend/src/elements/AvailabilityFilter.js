import React, { Component } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/cars';
import Accordion from './Accordion';

import '../assets/css/availability-filter.css'

class AvailabilityFilter extends Component {

    constructor(props) {
        super(props);

        this.state = {
            allChecked: true,
            values: [Env.AVAILABILITY.AVAILABLE, Env.AVAILABILITY.UNAVAILABLE]
        }
    }

    handleAvailableChange = (e) => {
        const { values } = this.state;

        if (e.currentTarget.checked) {
            values.push(Env.AVAILABILITY.AVAILABLE);

            if (values.length === 2) {
                this.setState({ allChecked: true });
            }
        } else {
            values.splice(values.findIndex(v => v === Env.AVAILABILITY.AVAILABLE), 1);
        }

        this.setState({ values }, () => {
            if (this.props.onChange) {
                this.props.onChange(values);
            }
        });
    };

    handleAvailableClick = (e) => {
        const checkbox = e.currentTarget.previousSibling;
        checkbox.checked = !checkbox.checked;
        const event = e;
        event.currentTarget = checkbox;
        this.handleAvailableChange(event);
    };

    handleUnavailableChange = (e) => {
        const { values } = this.state;

        if (e.currentTarget.checked) {
            values.push(Env.AVAILABILITY.UNAVAILABLE);

            if (values.length === 2) {
                this.setState({ allChecked: true });
            }
        } else {
            values.splice(values.findIndex(v => v === Env.AVAILABILITY.UNAVAILABLE), 1);
        }

        this.setState({ values }, () => {
            if (this.props.onChange) {
                this.props.onChange(values);
            }
        });
    };

    handleUnavailableClick = (e) => {
        const checkbox = e.currentTarget.previousSibling;
        checkbox.checked = !checkbox.checked;
        const event = e;
        event.currentTarget = checkbox;
        this.handleUnavailableChange(event);
    };

    handleUncheckAllChange = (e) => {
        const { allChecked } = this.state;
        const checkboxes = document.querySelectorAll('.availability-checkbox');

        if (allChecked) { // uncheck all
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });

            this.setState({ allChecked: false, values: [] });
        } else { // check all
            checkboxes.forEach(checkbox => {
                checkbox.checked = true;
            });

            const values = [Env.MILEAGE.LIMITED, Env.MILEAGE.UNLIMITED];

            this.setState({ allChecked: true, values }, () => {
                if (this.props.onChange) {
                    this.props.onChange(values);
                }
            });
        }
    };

    componentDidMount() {
        const { allChecked } = this.state;

        if (allChecked) {
            const checkboxes = document.querySelectorAll('.availability-checkbox');

            checkboxes.forEach(checkbox => {
                checkbox.checked = true;
            });
        }
    }

    render() {
        const { allChecked } = this.state;

        return (
            <Accordion title={strings.AVAILABILITY} className={`${this.props.className ? `${this.props.className} ` : ''}availability-filter`}>
                <div className='filter-elements'>
                    <div className='filter-element'>
                        <input type='checkbox' className='availability-checkbox' onChange={this.handleAvailableChange} />
                        <label onClick={this.handleAvailableClick}>{strings.AVAILABLE}</label>
                    </div>
                    <div className='filter-element'>
                        <input type='checkbox' className='availability-checkbox' onChange={this.handleUnavailableChange} />
                        <label onClick={this.handleUnavailableClick}>{strings.UNAVAILABLE}</label>
                    </div>
                    <div className='filter-actions'>
                        <span onClick={this.handleUncheckAllChange} className='uncheckall'>
                            {allChecked ? commonStrings.UNCHECK_ALL : commonStrings.CHECK_ALL}
                        </span>
                    </div>
                </div>
            </Accordion>
        );
    }
}

export default AvailabilityFilter;