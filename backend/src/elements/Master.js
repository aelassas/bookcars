import React, { Component } from 'react';
import { strings } from '../lang/master';
import Header from './Header';
import * as UserService from '../services/UserService';
import Unauthorized from '../components/Unauthorized';
import Error from '../components/Error';
import { Button } from '@mui/material';
import Env from '../config/env.config';
import * as Helper from '../common/Helper';

export default class Master extends Component {

    constructor(props) {
        super(props);
        this.state = {
            loading: true,
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
                Helper.info(strings.VALIDATION_EMAIL_SENT);
            } else {
                Helper.error(null, strings.VALIDATION_EMAIL_ERROR);
            }
        }).catch(err => {
            Helper.error(null, strings.VALIDATION_EMAIL_ERROR);
        });
    };

    error = () => {
        this.setState({ error: true, loading: false }, () => {
            if (this.props.onError) {
                this.props.onError();
            }
        });
    };

    exit = () => {
        if (this.props.strict) {
            UserService.signout();
        } else {
            UserService.signout(false);
            this.setState({ loading: false }, () => {
                if (this.props.onLoad) {
                    this.props.onLoad();
                }
            });
        }
    };

    static getDerivedStateFromProps(nextProps, prevState) {
        const { user } = prevState;

        if (user && nextProps.user && user.avatar !== nextProps.user.avatar) {
            return { user: nextProps.user };
        }

        return null;
    }

    componentDidMount() {
        const currentUser = UserService.getCurrentUser();

        if (currentUser) {
            UserService.validateAccessToken()
                .then(status => {
                    if (status === 200) {
                        UserService.getUser(currentUser.id).then(user => {
                            if (user) {

                                if (user.blacklisted) {
                                    this.setState({ user, unauthorized: true, loading: false });
                                    return;
                                }

                                if (this.props.admin && user.type !== Env.RECORD_TYPE.ADMIN) {
                                    this.setState({ user, unauthorized: true, loading: false });
                                    return;
                                }

                                this.setState({ loading: false, user }, () => {
                                    if (this.props.onLoad) {
                                        this.props.onLoad(user);
                                    }
                                });
                            } else {
                                this.exit();
                            }
                        }).catch(() => {
                            this.exit();
                        });
                    } else {
                        this.exit();
                    }
                }).catch(() => {
                    this.exit();
                });
        } else {
            this.exit();
        }
    }

    render() {
        const { loading, user, error, unauthorized } = this.state;

        return (
            <>
                <Header user={user} hidden={this.props.hideHeader || loading} notificationCount={this.props.notificationCount} />
                {(((!user && !loading) || (user && user.verified) || !this.props.strict)) && !error && !unauthorized ? (
                    <div className='content' style={this.props.style}>{this.props.children}</div>
                ) :
                    (!loading && !unauthorized && !error &&
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
            </>
        );
    }
}