import React, { useState } from 'react';
import Master from '../elements/Master';
import { strings as commonStrings } from '../lang/common';
import { strings as clStrings } from '../lang/create-location';
import { strings } from '../lang/update-location';
import * as LocationService from '../services/LocationService';
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
import * as UserService from '../services/UserService';
import * as Helper from '../common/Helper';

import '../assets/css/update-location.css';
import Env from '../config/env.config';

const UpdateLocation = () => {
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [names, setNames] = useState([]);
    const [nameErrors, setNameErrors] = useState([]);
    const [noMatch, setNoMatch] = useState(false);
    const [error, setError] = useState(false);
    const [location, setLocation] = useState();
    const [nameChanged, setNameChanged] = useState(false);

    const err = () => {
        setLoading(false);
        Helper.error();
    }

    const checkName = () => {
        let nameChanged = false;

        for (let i = 0; i < names.length; i++) {
            const name = names[i];
            if (name.name !== location.values[i].value) {
                nameChanged = true;
                break;
            }
        }

        setNameChanged(nameChanged);
        return nameChanged;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            let nameChanged = checkName();

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

            setNameErrors(Helper.cloneArray(nameErrors));

            if (isValid) {
                const status = await LocationService.update(location._id, names);

                if (status === 200) {
                    for (let i = 0; i < names.length; i++) {
                        const name = names[i];
                        location.values[i].value = name.name;
                    }

                    setLocation(Helper.clone(location));
                    Helper.info(strings.LOCATION_UPDATED);
                } else {
                    err();
                }
            }
        }
        catch (err) {
            UserService.signout();
        }
    };

    const onLoad = (user) => {
        if (user && user.verified) {
            setLoading(true);

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

                                setLocation(location);
                                setNames(names);
                                setVisible(true);
                                setLoading(false);
                            } else {
                                setLoading(false);
                                setNoMatch(true);
                            }
                        })
                        .catch(() => {
                            setLoading(false);
                            setError(true);
                            setVisible(false);
                        });
                } else {
                    setLoading(false);
                    setNoMatch(true);
                }
            } else {
                setLoading(false);
                setNoMatch(true);
            }
        }
    }

    return (
        <Master onLoad={onLoad} strict={true}>
            {!error && !noMatch && location &&
                <div className='update-location'>
                    <Paper className="location-form location-form-wrapper" elevation={10} style={visible ? null : { display: 'none' }}>
                        <h1 className="location-form-title"> {strings.UPDATE_LOCATION} </h1>
                        <form onSubmit={handleSubmit}>
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
                                                checkName();
                                                setNames(Helper.cloneArray(names));
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
};

export default UpdateLocation;