import React, { Component } from 'react';
import {
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';

class SeatsList extends Component {

    constructor(props) {
        super(props);
        this.state = {
            seats: ''
        }
    }

    handleChange = (e) => {
        const value = e.target.value || '';
        this.setState({ seats: value }, _ => {
            if (this.props.onChange) {
                this.props.onChange(value);
            }
        });
    };

    render() {
        const { seats } = this.state;

        return (
            <div>
                <InputLabel className={this.props.required ? 'required' : null}>{this.props.label}</InputLabel>
                <Select
                    label={this.props.label}
                    value={seats}
                    onChange={this.handleChange}
                    variant={this.props.variant || 'standard'}
                    required={this.props.required}
                    fullWidth
                >
                    <MenuItem value={2}>2</MenuItem>
                    <MenuItem value={3}>3</MenuItem>
                    <MenuItem value={4}>4</MenuItem>
                    <MenuItem value={5}>5</MenuItem>
                    <MenuItem value={6}>6</MenuItem>
                    <MenuItem value={8}>8</MenuItem>
                </Select>
            </div>
        );
    }
}

export default SeatsList;