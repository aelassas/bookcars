import React, { Component } from 'react';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/cars';
import Accordion from './Accordion';
import Helper from '../common/Helper';

import styles from '../styles/deposit-filter.module.css';

class DepositFilter extends Component {

    deposit2500Ref = null;
    deposit5000Ref = null;
    deposit7500Ref = null;
    depositAllRef = null;

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
            this.deposit2500Ref.checked = false;
            this.deposit5000Ref.checked = false;
            this.deposit7500Ref.checked = false;

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
            this.depositAllRef.checked = false;
            this.deposit5000Ref.checked = false;
            this.deposit7500Ref.checked = false;

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
            this.depositAllRef.checked = false;
            this.deposit2500Ref.checked = false;
            this.deposit7500Ref.checked = false;

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
            this.depositAllRef.checked = false;
            this.deposit2500Ref.checked = false;
            this.deposit5000Ref.checked = false;

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
        this.depositAllRef.checked = true;
    }

    render() {
        return (
            <Accordion title={strings.DEPOSIT} className={`${this.props.className ? `${this.props.className} ` : ''}${styles.depositFilter}`}>
                <div className={styles.filterElements}>
                    <div className={styles.filterElement}>
                        <input ref={ref => this.deposit2500Ref = ref} type='radio' className={styles.depositRadio} onChange={this.handleDepositLessThan2500Change} />
                        <label onClick={this.handleDepositLessThan2500Click}>{strings.LESS_THAN_2500}</label>
                    </div>
                    <div className={styles.filterElement}>
                        <input ref={ref => this.deposit5000Ref = ref} type='radio' className={styles.depositRadio} onChange={this.handleDepositLessThan5000Change} />
                        <label onClick={this.handleDepositLessThan5000Click}>{strings.LESS_THAN_5000}</label>
                    </div>
                    <div className={styles.filterElement}>
                        <input ref={ref => this.deposit7500Ref = ref} type='radio' className={styles.depositRadio} onChange={this.handleDepositLessThan7500Change} />
                        <label onClick={this.handleDepositLessThan7500Click}>{strings.LESS_THAN_7500}</label>
                    </div>
                    <div className={styles.filterElement}>
                        <input ref={ref => this.depositAllRef = ref} type='radio' className={styles.depositRadio} onChange={this.handleAllDepositChange} />
                        <label onClick={this.handleAllDepositClick}>{commonStrings.ALL}</label>
                    </div>
                </div>
            </Accordion>
        );
    }
}

export default DepositFilter;