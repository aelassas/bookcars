import React, { Component } from 'react';
import {
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';

class DoorsList extends Component {

    constructor(props) {
        super(props);
        this.state = {
            doors: ''
        }
    }

    handleChange = (e) => {
        const value = e.target.value || '';
        this.setState({ doors: value }, _ => {
            if (this.props.onChange) {
                this.props.onChange(value);
            }
        });
    };

    render() {
        const { doors } = this.state;

        return (
            <div>
                <InputLabel className={this.props.required ? 'required' : null}>{this.props.label}</InputLabel>
                <Select
                    label={this.props.label}
                    value={doors}
                    onChange={this.handleChange}
                    variant={this.props.variant || 'standard'}
                    required={this.props.required}
                    fullWidth
                >
                    <MenuItem value={2}>2</MenuItem>
                    <MenuItem value={3}>3</MenuItem>
                    <MenuItem value={4}>4</MenuItem>
                    <MenuItem value={5}>5</MenuItem>
                </Select>
            </div>
        );
    }
}

export default DoorsList;