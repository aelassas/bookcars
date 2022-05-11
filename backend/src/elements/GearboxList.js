import React, { Component } from 'react';
import Env from '../config/env.config';
import {
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import { strings } from "../lang/cars";

class GearboxList extends Component {

    constructor(props) {
        super(props);
        this.state = {
            value: ''
        }
    }

    handleChange = (e) => {
        this.setState({ value: e.target.value }, _ => {
            if (this.props.onChange) {
                this.props.onChange(e.target.value);
            }
        });
    }

    static getDerivedStateFromProps(props, state) {
        const { value } = state;

        if (value === '' && props.value && props.value !== value) {
            return { value: props.value };
        }

        return null;
    }

    render() {
        const { value } = this.state;

        return (
            <div>
                <InputLabel className={this.props.required ? 'required' : null}>{this.props.label}</InputLabel>
                <Select
                    label={this.props.label}
                    value={value}
                    onChange={this.handleChange}
                    variant={this.props.variant || 'standard'}
                    required={this.props.required}
                    fullWidth
                >
                    <MenuItem value={Env.GEARBOX_TYPE.AUTOMATIC}>{strings.GEARBOX_AUTOMATIC}</MenuItem>
                    <MenuItem value={Env.GEARBOX_TYPE.MANUAL}>{strings.GEARBOX_MANUAL}</MenuItem>
                </Select>
            </div>
        );
    }
}

export default GearboxList;