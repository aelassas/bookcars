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
            gearbox: ''
        }
    }

    handleChange = (e) => {
        this.setState({ gearbox: e.target.value }, _ => {
            if (this.props.onChange) {
                this.props.onChange(e.target.value);
            }
        });
    }

    render() {
        const { gearbox } = this.state;

        return (
            <div>
                <InputLabel className={this.props.required ? 'required' : null}>{this.props.label}</InputLabel>
                <Select
                    label={this.props.label}
                    value={gearbox}
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