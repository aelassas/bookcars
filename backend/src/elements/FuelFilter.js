import React, { Component } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings } from "../lang/cars";
import Accordion from './Accordion';

import '../assets/css/fuel-filter.css'

class FuelFilter extends Component {

    constructor(props) {
        super(props);

        this.state = {
            allChecked: true,
            values: [Env.CAR_TYPE.DIESEL, Env.CAR_TYPE.GASOLINE]
        }
    }

    handleCheckDieselChange = (e) => {
        const { values } = this.state;

        if (e.currentTarget.checked) {
            values.push(Env.CAR_TYPE.DIESEL);

            if (values.length === 2) {
                this.setState({ allChecked: true });
            }
        } else {
            values.splice(values.findIndex(v => v === Env.CAR_TYPE.DIESEL), 1);
        }

        this.setState({ values }, () => {
            if (this.props.onChange) {
                this.props.onChange(values);
            }
        });
    };

    handleDieselClick = (e) => {
        const checkbox = e.currentTarget.previousSibling;
        checkbox.checked = !checkbox.checked;
        const event = e;
        event.currentTarget = checkbox;
        this.handleCheckDieselChange(event);
    };

    handleCheckGasolineChange = (e) => {
        const { values } = this.state;

        if (e.currentTarget.checked) {
            values.push(Env.CAR_TYPE.GASOLINE);

            if (values.length === 2) {
                this.setState({ allChecked: true });
            }
        } else {
            values.splice(values.findIndex(v => v === Env.CAR_TYPE.GASOLINE), 1);
        }

        this.setState({ values }, () => {
            if (this.props.onChange) {
                this.props.onChange(values);
            }
        });
    };

    handleGasolineClick = (e) => {
        const checkbox = e.currentTarget.previousSibling;
        checkbox.checked = !checkbox.checked;
        const event = e;
        event.currentTarget = checkbox;
        this.handleCheckGasolineChange(event);
    };

    handleUncheckAllChange = (e) => {
        const { allChecked } = this.state;
        const checkboxes = document.querySelectorAll('.fuel-checkbox');

        if (allChecked) { // uncheck all
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });

            this.setState({ allChecked: false, values: [] });
        } else { // check all
            checkboxes.forEach(checkbox => {
                checkbox.checked = true;
            });

            const values = [Env.CAR_TYPE.DIESEL, Env.CAR_TYPE.GASOLINE];

            this.setState({ allChecked: true, values }, () => {
                if (this.props.onChange) {
                    this.props.onChange(values);
                }
            });
        }
    };

    componentDidMount() {
        const checkboxes = document.querySelectorAll('.fuel-checkbox');

        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
        });
    }

    render() {
        const { allChecked } = this.state;

        return (
            <Accordion title={strings.ENGINE} className={`${this.props.className ? `${this.props.className} ` : ''}fuel-filter`}>
                <div className='filter-elements'>
                    <div className='filter-element'>
                        <input type='checkbox' className='fuel-checkbox' onChange={this.handleCheckDieselChange} />
                        <label onClick={this.handleDieselClick}>{strings.DIESEL}</label>
                    </div>
                    <div className='filter-element'>
                        <input type='checkbox' className='fuel-checkbox' onChange={this.handleCheckGasolineChange} />
                        <label onClick={this.handleGasolineClick}>{strings.GASOLINE}</label>
                    </div>
                </div>
                <div className='filter-actions'>
                    <span onClick={this.handleUncheckAllChange} className='uncheckall'>
                        {allChecked ? commonStrings.UNCHECK_ALL : commonStrings.CHECK_ALL}
                    </span>
                </div>
            </Accordion>
        );
    }
}

export default FuelFilter;