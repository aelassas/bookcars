import React, { Component } from 'react';
import Master from '../elements/Master';
import { strings as commonStrings } from '../lang/common';
import { strings as clStrings } from '../lang/create-location';
import { strings } from '../lang/update-location';
import LocationService from '../services/LocationService';
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
import UserService from '../services/UserService';
import Helper from '../common/Helper';

import '../assets/css/update-location.css';
import Env from '../config/env.config';

export default class UpdateLocation extends Component {

    constructor(props) {
        super(props);
        this.state = {
            visible: false,
            loading: false,
            names: [],
            nameErrors: [],
            noMatch: false,
            error: false,
            location: null,
            nameChanged: false
        };
    }

    handleOnChangeName = (e) => {
        this.setState({ name: e.target.value });
    };

    handleOnBlurName = e => {
        const data = { name: e.target.value, };
        const { location } = this.state;

        if (data.name !== location.name) {
            LocationService.validate(data).then(status => {
                if (status === 204) {
                    this.setState({ nameError: true });
                } else {
                    this.setState({ nameError: false });
                }
            }).catch(() => {
                UserService.signout();
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

    error = () => {
        this.setState({ loading: false });
        Helper.error();
    }

    checkName = () => {
        const { location, names } = this.state;
        let nameChanged = false;
        for (let i = 0; i < names.length; i++) {
            const name = names[i];
            if (name.name !== location.values[i].value) {
                nameChanged = true;
                break;
            }
        }

        this.setState({ nameChanged });
        return nameChanged;
    }

    handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const { location, names, nameErrors } = this.state;

            let nameChanged = this.checkName();

            if (!nameChanged) {
                return;
            }

            let isValid = true;

            for (let i = 0; i < nameErrors.length; i++) nameErrors[i] = false;

            for (let i = 0; i < names.length; i++) {
                const name = names[i];
                if (name.name !== location.values[i].value) {
                    const _isValid = await LocationService.validate(name) === 200;
                    isValid = isValid && _isValid;
                    if (!_isValid) nameErrors[i] = true;
                }
            }

            this.setState({ nameErrors });

            if (isValid) {
                const status = await LocationService.update(location._id, names);

                if (status === 200) {
                    for (let i = 0; i < names.length; i++) {
                        const name = names[i];
                        location.values[i].value = name.name;
                    }
                    this.setState({ location });
                    Helper.info(strings.LOCATION_UPDATED);
                } else {
                    this.error();
                }
            }
        }
        catch (err) {
            UserService.signout();
        }
    };

    onLoad = (user) => {
        this.setState({ loading: true }, () => {
            const params = new URLSearchParams(window.location.search);
            if (params.has('l')) {
                const id = params.get('l');
                if (id && id !== '') {
                    LocationService.getLocation(id)
                        .then(location => {
                            if (location) {
                                Env._LANGUAGES.forEach(lang => {
                                    if (!location.values.some(value => value.language === lang.code)) {
                                        location.values.push({ language: lang.code, name: '' });
                                    }
                                });

                                const names = location.values.map(value => ({ language: value.language, name: value.value }));

                                this.setState({
                                    location,
                                    names,
                                    loading: false,
                                    visible: true
                                });
                            } else {
                                this.setState({ loading: false, noMatch: true });
                            }
                        })
                        .catch(() => {
                            this.setState({ loading: false, error: true, visible: false });
                        });
                } else {
                    this.setState({ loading: false, noMatch: true });
                }
            } else {
                this.setState({ loading: false, noMatch: true });
            }
        });
    }

    render() {
        const { visible, loading, noMatch, error, location, names, nameErrors, nameChanged } = this.state;

        return (
            <Master onLoad={this.onLoad} strict={true}>
                {!error && !noMatch && location &&
                    <div className='update-location'>
                        <Paper className="location-form location-form-wrapper" elevation={10} style={visible ? null : { display: 'none' }}>
                            <h1 className="location-form-title"> {strings.UPDATE_LOCATION} </h1>
                            <form onSubmit={this.handleSubmit}>
                                {
                                    location.values.map((value, index) => (
                                        <FormControl key={index} fullWidth margin="dense">
                                            <InputLabel className='required'>{Env._LANGUAGES.filter(l => l.code === value.language)[0].label}</InputLabel>
                                            <Input
                                                type="text"
                                                value={(names[index] && names[index].name) || ''}
                                                error={nameErrors[index]}
                                                required
                                                onChange={(e) => {
                                                    nameErrors[index] = false;
                                                    names[index].name = e.target.value;
                                                    this.checkName();
                                                    this.setState({ names });
                                                }}
                                                autoComplete="off"
                                            />
                                            <FormHelperText error={nameErrors[index]}>
                                                {(nameErrors[index] && clStrings.INVALID_LOCATION) || ''}
                                            </FormHelperText>
                                        </FormControl>
                                    ))
                                }

                                <div className="buttons">
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        className='btn-primary btn-margin-bottom'
                                        size="small"
                                        disabled={!nameChanged}
                                    >
                                        {commonStrings.SAVE}
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
                    </div>}
                {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
                {error && <Error />}
                {noMatch && <NoMatch hideHeader />}
            </Master>
        );
    }
}