import React, { Component } from 'react';
import Env from '../config/env.config';
import {
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import { strings } from "../lang/cars";

class CarTypeList extends Component {

    constructor(props) {
        super(props);
        this.state = {
            carType: ''
        }
    }

    handleChange = (e) => {
        this.setState({ carType: e.target.value }, _ => {
            if (this.props.onChange) {
                this.props.onChange(e.target.value);
            }
        });
    }

    render() {
        const { carType } = this.state;

        return (
            <div>
                <InputLabel className={this.props.required ? 'required' : null}>{this.props.label}</InputLabel>
                <Select
                    label={this.props.label}
                    value={carType}
                    onChange={this.handleChange}
                    variant={this.props.variant || 'standard'}
                    required={this.props.required}
                    fullWidth
                >
                    <MenuItem value={Env.CAR_TYPE.DIESEL}>{strings.DIESEL}</MenuItem>
                    <MenuItem value={Env.CAR_TYPE.GASOLINE}>{strings.GASOLINE}</MenuItem>
                </Select>
            </div>
        );
    }
}

export default CarTypeList;