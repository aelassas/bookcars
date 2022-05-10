import React, { Component } from 'react';
import Env from '../config/env.config';
import {
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import { strings } from "../lang/cars";

class FuelPolicyList extends Component {

    constructor(props) {
        super(props);
        this.state = {
            fuelPolicy: ''
        }
    }

    handleChange = (e) => {
        this.setState({ fuelPolicy: e.target.value }, _ => {
            if (this.props.onChange) {
                this.props.onChange(e.target.value);
            }
        });
    }

    render() {
        const { fuelPolicy } = this.state;

        return (
            <div>
                <InputLabel className={this.props.required ? 'required' : null}>{this.props.label}</InputLabel>
                <Select
                    label={this.props.label}
                    value={fuelPolicy}
                    onChange={this.handleChange}
                    variant={this.props.variant || 'standard'}
                    required={this.props.required}
                    fullWidth
                >
                    <MenuItem value={Env.FUEL_POLICY.LIKE_FOR_LIKE}>{strings.FUEL_POLICY_LIKE_FOR_LIKE}</MenuItem>
                    <MenuItem value={Env.FUEL_POLICY.FREE_TANK}>{strings.FUEL_POLICY_FREE_TANK}</MenuItem>
                </Select>
            </div>
        );
    }
}

export default FuelPolicyList;