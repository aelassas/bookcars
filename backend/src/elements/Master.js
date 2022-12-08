import React, { useState, useEffect } from 'react';
import { strings } from '../lang/master';
import Header from './Header';
import * as UserService from '../services/UserService';
import Unauthorized from '../components/Unauthorized';
import { Button } from '@mui/material';
import Env from '../config/env.config';
import * as Helper from '../common/Helper';
import { useInit } from '../common/customHooks';

const Master = (props) => {
    const [user, setUser] = useState();
    const [loading, setLoading] = useState(true);
    const [unauthorized, setUnauthorized] = useState(false);

    useEffect(() => {
        if (props.user && user && user.avatar !== props.user.avatar) {
            setUser(props.user);
        }
    }, [props.user, user]);

    useInit(() => {
        const exit = () => {
            if (props.strict) {
                UserService.signout();
            } else {
                UserService.signout(false);
                setLoading(false);

                if (props.onLoad) {
                    props.onLoad();
                }
            }
        };

        const currentUser = UserService.getCurrentUser();

        if (currentUser) {
            UserService.validateAccessToken()
                .then(status => {
                    if (status === 200) {
                        UserService.getUser(currentUser.id).then(user => {
                            if (user) {

                                if (user.blacklisted) {
                                    setUser(user);
                                    setUnauthorized(true);
                                    setLoading(false);
                                    return;
                                }

                                if (props.admin && user.type !== Env.RECORD_TYPE.ADMIN) {
                                    setUser(user);
                                    setUnauthorized(true);
                                    setLoading(false);
                                    return;
                                }

                                setUser(user);
                                setLoading(false);

                                if (props.onLoad) {
                                    props.onLoad(user);
                                }
                            } else {
                                exit();
                            }
                        }).catch(() => {
                            exit();
                        });
                    } else {
                        exit();
                    }
                }).catch(() => {
                    exit();
                });
        } else {
            exit();
        }
    });

    const handleResend = (e) => {
        e.preventDefault();
        const data = { email: user.email };

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

    return (
        <>
            <Header user={user} hidden={props.hideHeader || loading} notificationCount={props.notificationCount} />
            {(((!user && !loading) || (user && user.verified) || !props.strict)) && !unauthorized
                ?
                <div className='content' style={props.style}>{props.children}</div>
                :
                (!loading && !unauthorized) &&
                <div className="validate-email">
                    <span>{strings.VALIDATE_EMAIL}</span>
                    <Button
                        type="button"
                        variant="contained"
                        size="small"
                        className="btn-primary btn-resend"
                        onClick={handleResend}
                    >{strings.RESEND}</Button>
                </div>
            }
            {unauthorized && <Unauthorized style={{ marginTop: '75px' }} />}
        </>
    );
};

export default Master;