import React, { Component } from 'react';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/cars';
import Accordion from './Accordion';
import Helper from '../common/Helper';

import styles from '../styles/deposit-filter.module.css';

class DepositFilter extends Component {

    constructor(props) {
        super(props);

        this.state = {
            value: -1
        }
    }

    handleAllDepositClick = (e) => {
        const checkbox = e.currentTarget.previousSibling;
        if (!checkbox.checked) {
            checkbox.checked = !checkbox.checked;
            const event = e;
            event.currentTarget = checkbox;
            this.handleAllDepositChange(event);
        }
    };

    handleAllDepositChange = (e) => {
        if (e.currentTarget.checked) {
            const value = -1;
            document.querySelector('.deposit-2500').checked = false;
            document.querySelector('.deposit-5000').checked = false;
            document.querySelector('.deposit-7500').checked = false;

            this.setState({ value }, () => {
                if (this.props.onChange) {
                    this.props.onChange(value);
                }
            });
        }
    };

    handleDepositLessThan2500Click = (e) => {
        const checkbox = e.currentTarget.previousSibling;
        if (!checkbox.checked) {
            checkbox.checked = !checkbox.checked;
            const event = e;
            event.currentTarget = checkbox;
            this.handleDepositLessThan2500Change(event);
        }
    };

    handleDepositLessThan2500Change = (e) => {
        if (e.currentTarget.checked) {
            const value = 2500;
            document.querySelector('.all-deposit-radio').checked = false;
            document.querySelector('.deposit-5000').checked = false;
            document.querySelector('.deposit-7500').checked = false;

            this.setState({ value }, () => {
                if (this.props.onChange) {
                    this.props.onChange(value);
                }
            });
        }
    };

    handleDepositLessThan5000Click = (e) => {
        const checkbox = e.currentTarget.previousSibling;
        if (!checkbox.checked) {
            checkbox.checked = !checkbox.checked;
            const event = e;
            event.currentTarget = checkbox;
            this.handleDepositLessThan5000Change(event);
        }
    };

    handleDepositLessThan5000Change = (e) => {
        if (e.currentTarget.checked) {
            const value = 5000;
            document.querySelector('.all-deposit-radio').checked = false;
            document.querySelector('.deposit-2500').checked = false;
            document.querySelector('.deposit-7500').checked = false;

            this.setState({ value }, () => {
                if (this.props.onChange) {
                    this.props.onChange(value);
                }
            });
        }
    };

    handleDepositLessThan7500Click = (e) => {
        const checkbox = e.currentTarget.previousSibling;
        if (!checkbox.checked) {
            checkbox.checked = !checkbox.checked;
            const event = e;
            event.currentTarget = checkbox;
            this.handleDepositLessThan7500Change(event);
        }
    };

    handleDepositLessThan7500Change = (e) => {
        if (e.currentTarget.checked) {
            const value = 7500;
            document.querySelector('.all-deposit-radio').checked = false;
            document.querySelector('.deposit-2500').checked = false;
            document.querySelector('.deposit-5000').checked = false;

            this.setState({ value }, () => {
                if (this.props.onChange) {
                    this.props.onChange(value);
                }
            });
        }
    };

    componentDidMount() {
        Helper.setLanguage(commonStrings);
        Helper.setLanguage(strings);
        document.querySelector('.all-deposit-radio').checked = true;
    }

    render() {
        return (
            <Accordion title={strings.DEPOSIT} className={`${this.props.className ? `${this.props.className} ` : ''}${styles.depositFilter}`}>
                <div className={styles.filterElements}>
                    <div className={styles.filterElement}>
                        <input type='radio' className={`${styles.depositRadio} deposit-2500`} onChange={this.handleDepositLessThan2500Change} />
                        <label onClick={this.handleDepositLessThan2500Click}>{strings.LESS_THAN_2500}</label>
                    </div>
                    <div className={styles.filterElement}>
                        <input type='radio' className={`${styles.depositRadio} deposit-5000`} onChange={this.handleDepositLessThan5000Change} />
                        <label onClick={this.handleDepositLessThan5000Click}>{strings.LESS_THAN_5000}</label>
                    </div>
                    <div className={styles.filterElement}>
                        <input type='radio' className={`${styles.depositRadio} deposit-7500`} onChange={this.handleDepositLessThan7500Change} />
                        <label onClick={this.handleDepositLessThan7500Click}>{strings.LESS_THAN_7500}</label>
                    </div>
                    <div className={styles.filterElement}>
                        <input type='radio' className={`${styles.depositRadio} all-deposit-radio`} onChange={this.handleAllDepositChange} />
                        <label onClick={this.handleAllDepositClick}>{commonStrings.ALL}</label>
                    </div>
                </div>
            </Accordion>
        );
    }
}

export default DepositFilter;