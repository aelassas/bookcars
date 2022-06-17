import React, { Component } from 'react';
import Env from '../config/env.config';
import { strings as commonStrings } from '../lang/common';
import { strings } from '../lang/sign-in';
import UserService from '../services/UserService';
import Header from '../elements/Header';
import Error from '../elements/Error';
import {
    Paper,
    FormControl,
    InputLabel,
    Input,
    Button,
    Link
} from '@mui/material';
import Helper from '../common/Helper';

import styles from '../styles/signin.module.css';

export default class SignIn extends Component {

    constructor(props) {
        super(props);
        this.state = {
            email: '',
            password: '',
            error: false,
            visible: false,
            blacklisted: false,
            stayConnected: false
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

        const { email, password, stayConnected } = this.state;
        const data = { email, password, stayConnected };

        UserService.signin(data)
            .then(res => {
                if (res.status === 200) {
                    if (res.data.blacklisted) {
                        UserService.signout(false);
                        this.setState({
                            error: false,
                            blacklisted: true,
                            loginSuccess: false
                        });
                    } else {
                        this.setState({
                            error: false
                        }, () => {
                            const params = new URLSearchParams(window.location.search);
                            if (params.has('from')) {
                                const from = params.get('from');
                                if (from === 'create-booking') {
                                    window.location.href = '/create-booking' + window.location.search;
                                } else {
                                    window.location.href = '/';
                                }
                            } else {
                                window.location.href = '/';
                            }
                        });
                    }
                } else {
                    this.setState({
                        error: true,
                        blacklisted: false,
                        loginSuccess: false
                    });
                }
            }).catch(() => {
                this.setState({
                    error: true,
                    blacklisted: false,
                    loginSuccess: false
                });
            });
    };


    componentDidMount() {
        Helper.setLanguage(commonStrings);
        Helper.setLanguage(strings);

        const currentUser = UserService.getCurrentUser();
        if (currentUser) {
            UserService.validateAccessToken().then(status => {
                if (status === 200) {
                    UserService.getUser(currentUser.id).then(user => {
                        if (user) {
                            const params = new URLSearchParams(window.location.search);
                            if (params.has('from')) {
                                const from = params.get('from');
                                if (from === 'create-booking') {
                                    window.location.href = '/create-booking' + window.location.search;
                                } else {
                                    window.location.href = '/' + window.location.search;
                                }
                            } else {
                                window.location.href = '/' + window.location.search;
                            }
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
        const { visible, error, blacklisted } = this.state;

        return (
            <div>
                <Header />
                {visible &&
                    <div className={styles.signin}>
                        <Paper className={styles.signinForm} elevation={10}>
                            <form onSubmit={this.handleSubmit}>
                                <h1 className={styles.signinFormTitle}>{strings.SIGN_IN_HEADING}</h1>
                                <FormControl fullWidth margin="dense">
                                    <InputLabel>{commonStrings.EMAIL}</InputLabel>
                                    <Input
                                        type="text"
                                        onChange={this.handleOnChangeEmail}
                                        autoComplete="email"
                                        required
                                    />
                                </FormControl>
                                <FormControl fullWidth margin="dense">
                                    <InputLabel>{commonStrings.PASSWORD}</InputLabel>
                                    <Input
                                        onChange={this.handleOnChangePassword}
                                        onKeyDown={this.handleOnPasswordKeyDown}
                                        autoComplete="password"
                                        type="password"
                                        required
                                    />
                                </FormControl>

                                <div className={styles.stayConnected}>
                                    <input type='checkbox' onChange={(e) => {
                                        this.setState({ stayConnected: e.currentTarget.checked });
                                    }} />
                                    <label onClick={(e) => {
                                        const checkbox = e.currentTarget.previousSibling;
                                        const checked = !checkbox.checked;
                                        checkbox.checked = checked;
                                        this.setState({ stayConnected: checked });
                                    }}>{strings.STAY_CONNECTED}</label>
                                </div>

                                <div className={styles.resetPassword}>
                                    <Link href='/reset-password'>{strings.RESET_PASSWORD}</Link>
                                </div>

                                <div className={styles.signinButtons}>
                                    <Button
                                        variant="contained"
                                        size="small"
                                        href="/sign-up"
                                        className='btn-secondary btn-margin btn-margin-bottom'
                                    >
                                        {strings.SIGN_UP}
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        size="small"
                                        className='btn-primary btn-margin btn-margin-bottom'
                                    >
                                        {strings.SIGN_IN}
                                    </Button>
                                </div>
                                <div className={styles.formError}>
                                    {error && <Error message={strings.ERROR_IN_SIGN_IN} />}
                                    {blacklisted && <Error message={strings.IS_BLACKLISTED} />}
                                </div>
                            </form>
                        </Paper>
                    </div>}
            </div>
        );
    }
}