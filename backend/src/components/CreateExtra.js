import React, { Component } from 'react';
import Master from '../elements/Master';
import { strings } from '../config/app.config';
import ExtraService from '../services/ExtraService';
import { toast } from 'react-toastify';
import Backdrop from '../elements/SimpleBackdrop';
import {
    Input,
    InputLabel,
    FormControl,
    FormHelperText,
    Button,
    Paper
} from '@mui/material';

import '../assets/css/create-extra.css';

export default class CreateExtra extends Component {

    constructor(props) {
        super(props);
        this.state = {
            visible: false,
            isLoading: false,
            name: '',
            nameError: false
        };
    }

    handleOnChangeName = (e) => {
        this.setState({ name: e.target.value });
    };

    handleOnBlurName = e => {
        const data = {
            name: e.target.value,
        };

        ExtraService.validate(data).then(status => {
            if (status === 204) {
                this.setState({ nameError: true });
            } else {
                this.setState({ nameError: false });
            }
        }).catch(_ => {
            this.error();
        });
    };

    handleOnKeyDownName = (e) => {
        if (e.key === 'Enter') {
            this.handleSubmit(e);
        }
    }

    error = _ => {
        this.setState({ isLoading: false });
        toast(strings.GENERIC_ERROR, { type: 'error' });
    }

    handleSubmit = (e) => {
        e.preventDefault();

        this.setState({ isLoading: true });

        const { name } = this.state;
        const data = { name };

        ExtraService.validate(data).then(status => {
            if (status === 204) {
                this.setState({ nameError: true, isLoading: false });
            } else {
                this.setState({ nameError: false });

                ExtraService.create(data)
                    .then(status => {
                        if (status === 200) {
                            this.setState({ name: '', isLoading: false });
                            toast(strings.EXTRA_CREATED, { type: 'info' });
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
    }

    componentDidMount() {
    }

    render() {
        const { visible, isLoading, name, nameError } = this.state;

        return (
            <Master onLoad={this.onLoad} strict={true} admin={true}>
                <div className='create-extra'>
                    <Paper className="extra-form extra-form-wrapper" elevation={10} style={visible ? null : { display: 'none' }}>
                        <h1 className="extra-form-title"> {strings.NEW_EXTRA} </h1>
                        <form onSubmit={this.handleSubmit}>
                            <FormControl fullWidth margin="dense">
                                <InputLabel className='required'>{strings.EXTRA}</InputLabel>
                                <Input
                                    type="text"
                                    value={name}
                                    error={nameError}
                                    required
                                    onBlur={this.handleOnBlurName}
                                    onChange={this.handleOnChangeName}
                                    onKeyDown={this.handleOnKeyDownName}
                                    autoComplete="off"
                                />
                                <FormHelperText error={nameError}>
                                    {nameError ? strings.INVALID_EXTRA : ''}
                                </FormHelperText>
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
                                    href='/extras'
                                >
                                    {strings.CANCEL}
                                </Button>
                            </div>
                        </form>

                    </Paper>
                </div>
                {isLoading && <Backdrop text={strings.PLEASE_WAIT} />}
            </Master>
        );
    }
}