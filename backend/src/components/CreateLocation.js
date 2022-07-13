import React, { Component } from 'react';
import Master from '../elements/Master';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/create-location';
import LocationService from '../services/LocationService';
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
import Env from '../config/env.config';

import '../assets/css/create-location.css';

export default class CreateLocation extends Component {

    constructor(props) {
        super(props);
        this.state = {
            visible: false,
            names: [],
            nameErrors: []
        };
    }

    error = () => {
        Helper.error();
    };

    handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const { names, nameErrors } = this.state;

            let isValid = true;

            for (let i = 0; i < nameErrors.length; i++) nameErrors[i] = false;

            for (let i = 0; i < names.length; i++) {
                const name = names[i];
                const _isValid = await LocationService.validate(name) === 200;
                isValid = isValid && _isValid;
                if (!_isValid) nameErrors[i] = true;
            }

            this.setState({ nameErrors });

            if (isValid) {
                const status = await LocationService.create(names);

                if (status === 200) {
                    for (let i = 0; i < names.length; i++) names[i].name = '';
                    this.setState({ names });
                    Helper.info(strings.LOCATION_CREATED);
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
        this.setState({ visible: true });
    };

    render() {
        const { visible, names, nameErrors } = this.state;

        return (
            <Master onLoad={this.onLoad} strict={true}>
                <div className='create-location'>
                    <Paper className="location-form location-form-wrapper" elevation={10} style={visible ? null : { display: 'none' }}>
                        <h1 className="location-form-title"> {strings.NEW_LOCATION_HEADING} </h1>
                        <form onSubmit={this.handleSubmit}>
                            {
                                Env._LANGUAGES.map((language, index) => (
                                    <FormControl key={index} fullWidth margin="dense">
                                        <InputLabel className='required'>{language.label}</InputLabel>
                                        <Input
                                            type="text"
                                            value={(names[index] && names[index].name) || ''}
                                            error={nameErrors[index]}
                                            required
                                            onChange={(e) => {
                                                nameErrors[index] = false;
                                                names[index] = { language: language.code, name: e.target.value };
                                                this.setState({ names });
                                            }}
                                            autoComplete="off"
                                        />
                                        <FormHelperText error={nameErrors[index]}>
                                            {(nameErrors[index] && strings.INVALID_LOCATION) || ''}
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