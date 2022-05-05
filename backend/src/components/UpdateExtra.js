import React, { Component } from 'react';
import Master from '../elements/Master';
import { strings } from '../config/app.config';
import ExtraService from '../services/ExtraService';
import { toast } from 'react-toastify';
import NoMatch from './NoMatch';
import Error from './Error';
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

export default class UpdateExtra extends Component {

    constructor(props) {
        super(props);
        this.state = {
            visible: false,
            isLoading: false,
            name: '',
            nameError: false,
            noMatch: false,
            error: false
        };
    }

    handleOnChangeName = (e) => {
        this.setState({ name: e.target.value });
    };

    handleOnBlurName = e => {
        const data = { name: e.target.value, };
        const { extra } = this.state;

        if (data.name !== extra.name) {
            ExtraService.validate(data).then(status => {
                if (status === 204) {
                    this.setState({ nameError: true });
                } else {
                    this.setState({ nameError: false });
                }
            }).catch(_ => {
                this.error();
            });
        } else {
            this.setState({ nameError: false });
        }
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

        const { extra, name } = this.state;
        const data = { _id: extra._id, name };

        const update = _ => {
            ExtraService.update(data)
                .then(status => {
                    if (status === 200) {
                        extra.name = name;
                        this.setState({ isLoading: false, extra });
                        toast(strings.EXTRA_UPDATED, { type: 'info' });
                    } else {
                        this.error();
                    }
                }).catch(_ => {
                    this.error();
                });
        };

        if (name !== extra.name) {
            ExtraService.validate(data).then(status => {
                if (status === 204) {
                    this.setState({ nameError: true, isLoading: false });
                } else {
                    this.setState({ nameError: false });
                    update();
                }
            }).catch(_ => {
                this.error();
            });
        } else {
            this.setState({ nameError: false });
        }

    };

    onLoad = (user) => {
        this.setState({ isLoading: true }, _ => {
            const params = new URLSearchParams(window.location.search);
            if (params.has('e')) {
                const id = params.get('e');
                if (id && id !== '') {
                    ExtraService.getExtra(id)
                        .then(extra => {
                            if (extra) {
                                this.setState({
                                    extra,
                                    name: extra.name,
                                    isLoading: false,
                                    visible: true
                                });
                            } else {
                                this.setState({ isLoading: false, noMatch: true });
                            }
                        })
                        .catch(_ => {
                            this.setState({ isLoading: false, error: true, visible: false });
                        });
                } else {
                    this.setState({ isLoading: false, noMatch: true });
                }
            } else {
                this.setState({ isLoading: false, noMatch: true });
            }
        });
    }

    componentDidMount() {
    }

    render() {
        const { visible, isLoading, noMatch, error, extra, name, nameError } = this.state;

        return (
            <Master onLoad={this.onLoad} strict={true} admin={true}>
                <div className='update-extra'>
                    <Paper className="extra-form extra-form-wrapper" elevation={10} style={visible ? null : { display: 'none' }}>
                        <h1 className="extra-form-title"> {strings.UPDATE_EXTRA} </h1>
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
                                    disabled={extra && extra.name === name}
                                >
                                    {strings.SAVE}
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
                {error && <Error />}
                {noMatch && <NoMatch />}
            </Master>
        );
    }
}