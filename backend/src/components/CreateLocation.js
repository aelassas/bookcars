import React, { Component } from 'react';
import Master from '../elements/Master';
import { strings } from '../config/app.config';
import LocationService from '../services/LocationService';
import { toast } from 'react-toastify';
import Error from '../elements/Error';
import {
    Input,
    InputLabel,
    FormControl,
    Button,
    Paper
} from '@mui/material';

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

    error = _ => {
        toast(strings.GENERIC_ERROR, { type: 'error' });
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
                    }).catch(_ => {
                        this.error();
                    });
            }
        }).catch(_ => {
            this.error();
        });
    };

    onLoad = (user) => {
        this.setState({ visible: true });
    };

    componentDidMount() {
    }

    render() {
        const { visible, name, nameError } = this.state;

        return (
            <Master onLoad={this.onLoad} strict={true}>
                <div className='create-location'>
                    <Paper className="location-form location-form-wrapper" elevation={10} style={visible ? null : { display: 'none' }}>
                        <h1 className="location-form-title"> {strings.NEW_LOCATION} </h1>
                        <form onSubmit={this.handleSubmit}>
                            <FormControl fullWidth margin="dense">
                                <InputLabel className='required'>{strings.LOCATION_NAME}</InputLabel>
                                <Input
                                    type="text"
                                    value={name}
                                    required
                                    onChange={this.handleOnChangeName}
                                    onKeyDown={this.handleOnKeyDownName}
                                    autoComplete="off"
                                />
                            </FormControl>

                            <div className="buttons">
                                <Button
                                    type="submit"
                                    variant="contained"
                                    className='btn-primary'
                                    size="small"
                                >
                                    {strings.CREATE}
                                </Button>
                                <Button
                                    variant="contained"
                                    className='btn-secondary'
                                    size="small"
                                    href='/locations'
                                >
                                    {strings.CANCEL}
                                </Button>
                            </div>

                            <div className="form-error">
                                {nameError ?
                                    <div>
                                        {nameError && <Error message={strings.INVALID_LOCATION} />}
                                    </div>
                                    : null}
                            </div>
                        </form>

                    </Paper>
                </div>
            </Master>
        );
    }
}