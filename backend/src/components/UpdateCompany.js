import React, { Component } from 'react';
import Master from '../elements/Master';
import { strings } from '../config/app.config';
import CompanyService from '../services/CompanyService';
import Error from '../elements/Error';
import Backdrop from '../elements/SimpleBackdrop';
import { toast } from 'react-toastify';
import NoMatch from './NoMatch';
import {
    Input,
    InputLabel,
    FormControl,
    FormHelperText,
    Button,
    Paper
} from '@mui/material';

import '../assets/css/create-company.css';

export default class UpdateCompany extends Component {

    constructor(props) {
        super(props);
        this.state = {
            user: null,
            companyId: '',
            fullName: '',
            phone: '',
            location: '',
            bio: '',
            error: false,
            visible: false,
            isLoading: false,
            fullNameError: false,
            noMatch: false
        };
    }

    handleOnChangeFullName = e => {
        this.setState({
            fullName: e.target.value,
        });
    };

    handleOnChangePhone = e => {
        this.setState({
            phone: e.target.value,
        });
    };

    handleOnChangeLocation = e => {
        this.setState({
            location: e.target.value,
        });
    };

    handleOnChangeBio = e => {
        this.setState({
            bio: e.target.value,
        });
    };

    handleFullNameOnBlur = e => {
        const data = {
            fullName: e.target.value,
        };

        CompanyService.validate(data).then(status => {
            if (status === 204) {
                this.setState({ fullNameError: true });
            } else {
                this.setState({ fullNameError: false });
            }
        }).catch(_ => {
            this.setState({ fullNameError: false });
        });
    };

    preventDefault = (event) => event.preventDefault();

    handleSubmit = e => {
        e.preventDefault();

        this.setState({ isLoading: true });

        const { companyId, fullName, phone, location, bio } = this.state;

        const data = {
            _id: companyId,
            fullName,
            phone,
            location,
            bio
        };

        CompanyService.update(data)
            .then(status => {
                if (status === 200) {
                    window.location = `/company?c=${companyId}`;
                } else {
                    toast(strings.GENERIC_ERROR, { type: 'error' });
                    this.setState({ isLoading: false });
                }
            })
            .catch(_ => {
                toast(strings.GENERIC_ERROR, { type: 'error' });
                this.setState({ isLoading: false });
            });
    };

    handleChange = (e) => {
        e.preventDefault();
    };

    onLoad = (user) => {
        this.setState({ user, isLoading: true }, _ => {
            const params = new URLSearchParams(window.location.search);
            if (params.has('c')) {
                const id = params.get('c');
                if (id && id !== '') {
                    CompanyService.getCompany(id)
                        .then(company => {
                            this.setState({
                                companyId: company._id,
                                fullName: company.fullName,
                                phone: company.phone,
                                location: company.location,
                                bio: company.bio,
                                isLoading: false,
                                visible: true
                            })
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
        const {
            fullName,
            phone,
            location,
            bio,
            error,
            fullNameError,
            visible,
            isLoading,
            noMatch,
            companyId
        } = this.state;

        return (
            <Master onLoad={this.onLoad} strict={true} admin={true}>
                <Paper className="company-form company-form-wrapper" elevation={10} style={visible ? null : { display: 'none' }}>
                    <div className="company">
                        <form onSubmit={this.handleSubmit}>
                            <div>
                                <FormControl fullWidth margin="dense">
                                    <InputLabel>{strings.FULL_NAME}</InputLabel>
                                    <Input
                                        id="full-name"
                                        type="text"
                                        error={fullNameError}
                                        required
                                        onBlur={this.handleFullNameOnBlur}
                                        onChange={this.handleOnChangeFullName}
                                        autoComplete="off"
                                        value={fullName}
                                    />
                                    <FormHelperText error={fullNameError}>
                                        {fullNameError ? strings.INVALID_FULL_NAME : ''}
                                    </FormHelperText>
                                </FormControl>
                                <FormControl fullWidth margin="dense">
                                    <InputLabel>{strings.PHONE}</InputLabel>
                                    <Input
                                        id="phone"
                                        type="text"
                                        onChange={this.handleOnChangePhone}
                                        inputProps={{
                                            autoComplete: 'new-phone',
                                            form: {
                                                autoComplete: 'off',
                                            },
                                        }}
                                        value={phone}
                                    />
                                </FormControl>
                                <FormControl fullWidth margin="dense">
                                    <InputLabel>{strings.LOCATION}</InputLabel>
                                    <Input
                                        id="location"
                                        type="text"
                                        onChange={this.handleOnChangeLocation}
                                        autoComplete="off"
                                        value={location}
                                    />
                                </FormControl>
                                <FormControl fullWidth margin="dense">
                                    <InputLabel>{strings.BIO}</InputLabel>
                                    <Input
                                        id="bio"
                                        type="text"
                                        onChange={this.handleOnChangeBio}
                                        autoComplete="off"
                                        value={bio}
                                    />
                                </FormControl>
                                <div className="buttons">
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        className='btn-primary'
                                        size="small"
                                    >
                                        {strings.SAVE}
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        className='btn-primary btn-margin'
                                        size="small"
                                        href={`/reset-password?u=${companyId}`}
                                    >
                                        {strings.RESET_PASSWORD}
                                    </Button>
                                    <Button
                                        variant="contained"
                                        className='btn-secondary'
                                        size="small"
                                        href="/companies"
                                    >
                                        {strings.CANCEL}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </div>
                </Paper>
                {isLoading && <Backdrop text={strings.PLEASE_WAIT} />}
                {error && <Error message={strings.GENERIC_ERROR} style={{ marginTop: '25px' }} />}
                {noMatch && <NoMatch style={{ marginTop: '-65px' }} />}
            </Master>
        );
    }
}