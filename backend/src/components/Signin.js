import React, { Component } from 'react';
import Env from '../config/env.config';
import { strings } from '../config/app.config';
import UserService from '../services/UserService';
import Header from '../elements/Header';
import Error from '../elements/Error';
import {
    Paper,
    FormControl,
    InputLabel,
    Input,
    Button
} from '@mui/material';

import '../assets/css/signin.css';

export default class SignIn extends Component {

    constructor(props) {
        super(props);
        this.state = {
            language: Env.DEFAULT_LANGUAGE,
            email: '',
            password: '',
            error: false,
            visible: false,
            isBlacklisted: false,
        };
    }

    handleOnChangeEmail = (e) => {
        this.setState({
            email: e.target.value
        });
    };

    handleOnChangePassword = (e) => {
        this.setState({
            password: e.target.value
        });
    };

    handleOnPasswordKeyDown = (e) => {
        if (e.key === 'Enter') {
            this.handleSubmit(e);
        }
    };

    handleSubmit = (e) => {
        e.preventDefault();

        const { email, password } = this.state;
        const data = { email, password };

        UserService.signin(data).then(res => {
            console.log(res);
            if (res.status === 200) {
                if (res.data.isBlacklisted) {
                    UserService.signout(false);
                    this.setState({
                        error: false,
                        isBlacklisted: true,
                        loginSuccess: false
                    });
                } else {
                    this.setState({
                        error: false
                    }, () => {
                        window.location = '/' + window.location.search;
                    });
                }
            } else {
                this.setState({
                    error: true,
                    isBlacklisted: false,
                    loginSuccess: false
                });
            }
        }).catch(() => {
            this.setState({
                error: true,
                isBlacklisted: false,
                loginSuccess: false
            });
        });
    };


    componentDidMount() {
        const queryLanguage = UserService.getQueryLanguage();

        if (Env.LANGUAGES.includes(queryLanguage)) {
            strings.setLanguage(queryLanguage);
            this.setState({ language: queryLanguage });
        } else {
            const language = UserService.getLanguage();
            strings.setLanguage(language);
            this.setState({ language });
        }

        const currentUser = UserService.getCurrentUser();
        if (currentUser) {
            UserService.validateAccessToken().then(status => {
                if (status === 200) {
                    UserService.getUser(currentUser.id).then(user => {
                        if (user) {
                            window.location.href = '/' + window.location.search;
                        } else {
                            UserService.signout();
                        }
                    }).catch(err => {
                        UserService.signout();
                    });
                }
            }).catch(err => {
                UserService.signout();
            });
        } else {
            this.setState({ visible: true });
        }
    }

    render() {
        const { visible, error, isBlacklisted } = this.state;

        return (
            <div>
                <Header hideSignin={true} />
                <div className='content' style={visible ? null : { display: 'none' }}>
                    <Paper className='signin-form' elevation={10}>
                        <form onSubmit={this.handleSubmit}>
                            <h1 className="signin-form-title">{strings.SIGN_IN_HEADING}</h1>
                            <FormControl fullWidth margin="dense">
                                <InputLabel htmlFor="email">{strings.EMAIL}</InputLabel>
                                <Input
                                    id="email"
                                    type="text"
                                    name="Email"
                                    onChange={this.handleOnChangeEmail}
                                    autoComplete="email"
                                    required
                                />
                            </FormControl>
                            <FormControl fullWidth margin="dense">
                                <InputLabel htmlFor="password">{strings.PASSWORD}</InputLabel>
                                <Input
                                    id="password"
                                    name="Password"
                                    onChange={this.handleOnChangePassword}
                                    onKeyDown={this.handleOnPasswordKeyDown}
                                    autoComplete="password"
                                    type="password"
                                    required
                                />
                            </FormControl>
                            <div className='signin-buttons'>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    size="small"
                                    className='btn-primary'
                                >
                                    {strings.SIGN_IN}
                                </Button>
                            </div>
                            <div className="form-error">
                                {error && <Error message={strings.ERROR_IN_SIGN_IN} />}
                                {isBlacklisted && <Error message={strings.IS_BLACKLISTED} />}
                            </div>
                        </form>
                    </Paper>
                </div>
            </div>
        );
    }
}