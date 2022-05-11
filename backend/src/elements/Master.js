import React, { Component } from 'react';
import { strings } from '../lang/master';
import Header from './Header';
import UserService from '../services/UserService';
import Unauthorized from '../components/Unauthorized';
import Error from '../components/Error';
import { Button } from '@mui/material';
import { toast } from 'react-toastify';
import Env from '../config/env.config';

export default class Master extends Component {

    constructor(props) {
        super(props);
        this.state = {
            isLoading: true,
            user: null,
            error: false,
            unauthorized: false
        };
    }

    handleResend = (e) => {
        e.preventDefault();
        const data = { email: this.state.user.email };

        UserService.resendLink(data).then(status => {
            if (status === 200) {
                toast(strings.VALIDATION_EMAIL_SENT, { type: 'info' });
            } else {
                toast(strings.VALIDATION_EMAIL_ERROR, { type: 'error' });
            }
        }).catch(err => {
            toast(strings.VALIDATION_EMAIL_ERROR, { type: 'error' });
        });
    };

    error = _ => {
        this.setState({ error: true, isLoading: false }, _ => {
            if (this.props.onError) {
                this.props.onError();
            }
        });
    };

    componentDidMount() {
        const currentUser = UserService.getCurrentUser();

        if (currentUser) {
            UserService.validateAccessToken().then(status => {
                if (status === 200) {
                    UserService.getUser(currentUser.id).then(user => {
                        if (user) {

                            if (user.blacklisted) {
                                this.setState({ user, unauthorized: true, isLoading: false });
                                return;
                            }

                            if (this.props.admin && user.type !== Env.RECORD_TYPE.ADMIN) {
                                this.setState({ user, unauthorized: true, isLoading: false });
                                return;
                            }

                            this.setState({ isLoading: false, user }, _ => {
                                if (this.props.onLoad) {
                                    this.props.onLoad(user);
                                }
                            });
                        } else {
                            this.error();
                        }
                    }).catch(_ => {
                        this.error();
                    });
                } else {
                    UserService.signout();
                }
            }).catch(_ => {
                UserService.signout();
            });
        } else {
            if (this.props.strict) {
                UserService.signout();
            } else {
                this.setState({ isLoading: false });
            }
        }
    }

    render() {
        const { isLoading, user, error, unauthorized } = this.state;

        return (
            (<div>
                <Header user={this.props.user || user} hidden={isLoading} />
                {(((!user && !isLoading) || (user && user.isVerified) || !this.props.strict)) && !error && !unauthorized ? (
                    <div className='content' style={this.props.style}>{this.props.children}</div>
                ) :
                    (!isLoading && !unauthorized && !error &&
                        <div className="validate-email">
                            <span>{strings.VALIDATE_EMAIL}</span>
                            <Button
                                type="button"
                                variant="contained"
                                size="small"
                                className="btn-primary btn-resend"
                                onClick={this.handleResend}
                            >{strings.RESEND}</Button>
                        </div>)
                }
                {unauthorized && <Unauthorized style={{ marginTop: '75px' }} />}
                {error && <Error style={{ marginTop: '75px' }} />}
            </div>)
        );
    }
}