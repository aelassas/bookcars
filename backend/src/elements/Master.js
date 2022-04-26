import React, { Component } from 'react';
import { strings } from '../config/app.config';
import Header from '../elements/Header';
import {
    getCurrentUser,
    validateAccessToken,
    getUser,
    signout,
    resendLink
} from '../services/user-service';
import {
    Button
} from '@mui/material';
import { toast } from 'react-toastify';

export default class Master extends Component {

    constructor(props) {
        super(props);
        this.state = {
            isLoading: true,
            user: null,
        };
    }

    handleResend = (e) => {
        e.preventDefault();
        const data = { email: this.state.user.email };

        resendLink(data)
            .then(status => {
                if (status === 200) {
                    toast(strings.VALIDATION_EMAIL_SENT, { type: 'info' });
                } else {
                    toast(strings.VALIDATION_EMAIL_ERROR, { type: 'error' });
                }
            })
            .catch(err => {
                toast(strings.VALIDATION_EMAIL_ERROR, { type: 'error' });
            });
    };

    componentDidMount() {
        const currentUser = getCurrentUser();

        if (currentUser) {
            validateAccessToken().then(status => {
                if (status === 200) {
                    getUser(currentUser.id).then(user => {
                        if (user && ['admin', 'company'].includes(user.type)) {

                            if (user.isBlacklisted) {
                                signout();
                                return;
                            }

                            this.setState({ isLoading: false, user }, _ => {
                                this.props.onLoad(user);
                            });
                        } else {
                            signout();
                        }
                    });
                } else {
                    signout();
                }
            });
        } else {
            signout();
        }
    }

    render() {
        const { isLoading, user } = this.state;

        return (
            <div>
                <Header user={user} />
                {((!user && !isLoading) || (user && user.isVerified)) ? (
                    <div className='content'>{this.props.children}</div>
                ) :
                    (!isLoading && <div className="validate-email">
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
            </div>
        );
    }
}