import React, { Component } from 'react';
import Master from '../elements/Master';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/create-location';
import LocationService from '../services/LocationService';
import { toast } from 'react-toastify';
import {
    Input,
    InputLabel,
    FormControl,
    FormHelperText,
    Button,
    Paper
} from '@mui/material';
import UserService from '../services/UserService';

import '../assets/css/create-location.css';

export default class CreateLocation extends Component {

    constructor(props) {
        super(props);
        this.state = {
            visible: false,
            name: '',
            nameError: false
        };
    }

    handleOnChangeName = (e) => {
        this.setState({ name: e.target.value });
    };

    handleOnKeyDownName = (e) => {
        if (e.key === 'Enter') {
            this.handleSubmit(e);
        }
    };

    error = () => {
        toast(commonStrings.GENERIC_ERROR, { type: 'error' });
    };

    handleSubmit = (e) => {
        e.preventDefault();

        const { name } = this.state;
        const data = { name };

        LocationService.validate(data).then(status => {
            if (status === 204) {
                this.setState({ nameError: true });
            } else {
                this.setState({ nameError: false });

                LocationService.create(data)
                    .then(status => {
                        if (status === 200) {
                            this.setState({ name: '' });
                            toast(strings.LOCATION_CREATED, { type: 'info' });
                        } else {
                            this.error();
                        }
                    }).catch(() => {
                        UserService.signout();
                    });
            }
        }).catch(() => {
            UserService.signout();
        });
    };

    onLoad = (user) => {
        this.setState({ visible: true });
    };

    render() {
        const { visible, name, nameError } = this.state;

        return (
            <Master onLoad={this.onLoad} strict={true}>
                <div className='create-location'>
                    <Paper className="location-form location-form-wrapper" elevation={10} style={visible ? null : { display: 'none' }}>
                        <h1 className="location-form-title"> {strings.NEW_LOCATION_HEADING} </h1>
                        <form onSubmit={this.handleSubmit}>
                            <FormControl fullWidth margin="dense">
                                <InputLabel className='required'>{strings.LOCATION_NAME}</InputLabel>
                                <Input
                                    type="text"
                                    value={name}
                                    error={nameError}
                                    required
                                    onChange={this.handleOnChangeName}
                                    onKeyDown={this.handleOnKeyDownName}
                                    autoComplete="off"
                                />
                                <FormHelperText error={nameError}>
                                    {nameError ? strings.INVALID_LOCATION : ''}
                                </FormHelperText>
                            </FormControl>

                            <div className="buttons">
                                <Button
                                    type="submit"
                                    variant="contained"
                                    className='btn-primary btn-margin-bottom'
                                    size="small"
                                >
                                    {commonStrings.CREATE}
                                </Button>
                                <Button
                                    variant="contained"
                                    className='btn-secondary btn-margin-bottom'
                                    size="small"
                                    href='/locations'
                                >
                                    {commonStrings.CANCEL}
                                </Button>
                            </div>
                        </form>

                    </Paper>
                </div>
            </Master>
        );
    }
}