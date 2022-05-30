import React, { Component } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/cars';
import Accordion from './Accordion';

import '../assets/css/mileage-filter.css'

class MileageFilter extends Component {

    constructor(props) {
        super(props);

        this.state = {
            allChecked: true,
            values: [Env.MILEAGE.LIMITED, Env.MILEAGE.UNLIMITED]
        }
    }

    handleLimitedMileageChange = (e) => {
        const { values } = this.state;

        if (e.currentTarget.checked) {
            values.push(Env.MILEAGE.LIMITED);

            if (values.length === 2) {
                this.setState({ allChecked: true });
            }
        } else {
            values.splice(values.findIndex(v => v === Env.MILEAGE.LIMITED), 1);
        }

        this.setState({ values }, () => {
            if (this.props.onChange) {
                this.props.onChange(values);
            }
        });
    };

    handleLimitedMileageClick = (e) => {
        const checkbox = e.currentTarget.previousSibling;
        checkbox.checked = !checkbox.checked;
        const event = e;
        event.currentTarget = checkbox;
        this.handleLimitedMileageChange(event);
    };

    handleUnlimitedMileageChange = (e) => {
        const { values } = this.state;

        if (e.currentTarget.checked) {
            values.push(Env.MILEAGE.UNLIMITED);

            if (values.length === 2) {
                this.setState({ allChecked: true });
            }
        } else {
            values.splice(values.findIndex(v => v === Env.MILEAGE.UNLIMITED), 1);
        }

        this.setState({ values }, () => {
            if (this.props.onChange) {
                this.props.onChange(values);
            }
        });
    };

    handleUnlimitedMileageClick = (e) => {
        const checkbox = e.currentTarget.previousSibling;
        checkbox.checked = !checkbox.checked;
        const event = e;
        event.currentTarget = checkbox;
        this.handleUnlimitedMileageChange(event);
    };

    handleUncheckAllChange = (e) => {
        const { allChecked } = this.state;
        const checkboxes = document.querySelectorAll('.mileage-checkbox');

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
            const checkboxes = document.querySelectorAll('.mileage-checkbox');

            checkboxes.forEach(checkbox => {
                checkbox.checked = true;
            });
        }
    }

    render() {
        const { allChecked } = this.state;

        return (
            <Accordion title={strings.MILEAGE} className={`${this.props.className ? `${this.props.className} ` : ''}mileage-filter`}>
                <div className='filter-elements'>
                    <div className='filter-element'>
                        <input type='checkbox' className='mileage-checkbox' onChange={this.handleLimitedMileageChange} />
                        <label onClick={this.handleLimitedMileageClick}>{strings.LIMITED}</label>
                    </div>
                    <div className='filter-element'>
                        <input type='checkbox' className='mileage-checkbox' onChange={this.handleUnlimitedMileageChange} />
                        <label onClick={this.handleUnlimitedMileageClick}>{strings.UNLIMITED}</label>
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

export default MileageFilter;