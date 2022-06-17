import React, { Component } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/cars';
import Accordion from './Accordion';
import Helper from '../common/Helper';

import styles from '../styles/mileage-filter.module.css';

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

            if (values.length === 0) {
                this.setState({ allChecked: false });
            }
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

            if (values.length === 0) {
                this.setState({ allChecked: false });
            }
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
        const checkboxes = document.querySelectorAll(`.${styles.mileageCheckbox}`);

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
        Helper.setLanguage(commonStrings);
        Helper.setLanguage(strings);

        const { allChecked } = this.state;

        if (allChecked) {
            const checkboxes = document.querySelectorAll(`.${styles.mileageCheckbox}`);

            checkboxes.forEach(checkbox => {
                checkbox.checked = true;
            });
        }
    }

    render() {
        const { allChecked } = this.state;

        return (
            <Accordion title={strings.MILEAGE} className={`${this.props.className ? `${this.props.className} ` : ''}${styles.mileageFilter}`}>
                <div className={styles.filterElements}>
                    <div className={styles.filterElement}>
                        <input type='checkbox' className={styles.mileageCheckbox} onChange={this.handleLimitedMileageChange} />
                        <label onClick={this.handleLimitedMileageClick}>{strings.LIMITED}</label>
                    </div>
                    <div className={styles.filterElement}>
                        <input type='checkbox' className={styles.mileageCheckbox} onChange={this.handleUnlimitedMileageChange} />
                        <label onClick={this.handleUnlimitedMileageClick}>{strings.UNLIMITED}</label>
                    </div>
                    <div className={styles.filterActions}>
                        <span onClick={this.handleUncheckAllChange} className={styles.uncheckall}>
                            {allChecked ? commonStrings.UNCHECK_ALL : commonStrings.CHECK_ALL}
                        </span>
                    </div>
                </div>
            </Accordion>
        );
    }
}

export default MileageFilter;