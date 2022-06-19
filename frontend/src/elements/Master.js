import React, { Component } from 'react';
import { strings } from '../lang/master';
import Header from '../elements/Header';
import UserService from '../services/UserService';
import { Button } from '@mui/material';
import { toast } from 'react-toastify';

export default class Master extends Component {

    constructor(props) {
        super(props);
        this.state = {
            loading: true,
            user: null,
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

    exit = () => {
        if (this.props.strict) {
            UserService.signout(false, true);
        } else {
            this.setState({ loading: false }, () => {
                UserService.signout(false, false);
                if (this.props.onLoad) {
                    this.props.onLoad();
                }
            });
        }
    }

    componentDidMount() {
        const currentUser = UserService.getCurrentUser();

        if (currentUser) {
            UserService.validateAccessToken()
                .then(status => {
                    if (status === 200) {
                        UserService.getUser(currentUser.id)
                            .then(user => {
                                if (user) {

                                    if (user.blacklisted) {
                                        this.exit();
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
        const { loading, user } = this.state;

        return (
            <>
                <Header user={user} hidden={loading} hideSignin={this.props.hideSignin} />
                {((!user && !loading) || (user && user.verified)) ? (
                    <div className='content'>{this.props.children}</div>
                ) :
                    (!loading && <div className="validate-email">
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
            </>
        );
    }
}