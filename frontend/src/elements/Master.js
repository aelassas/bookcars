import React, { useState, useEffect } from 'react';
import { strings } from '../lang/master';
import Header from '../elements/Header';
import * as UserService from '../services/UserService';
import { Button } from '@mui/material';
import * as Helper from '../common/Helper';
import { useInit } from '../common/customHooks';

const Master = (props) => {
    const [user, setUser] = useState();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (props.user && user && user.avatar !== props.user.avatar) {
            setUser(props.user);
        }
    }, [props.user, user]);

    useInit(() => {
        const exit = () => {
            if (props.strict) {
                UserService.signout(false, true);
            } else {
                setLoading(false);

                UserService.signout(false, false);

                if (props.onLoad) {
                    props.onLoad();
                }
            }
        }

        const currentUser = UserService.getCurrentUser();

        if (currentUser) {
            UserService.validateAccessToken()
                .then(status => {
                    if (status === 200) {
                        UserService.getUser(currentUser.id)
                            .then(user => {
                                if (user) {

                                    if (user.blacklisted) {
                                        exit();
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
    }, []);

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
            <Header user={user} hidden={loading} hideSignin={props.hideSignin} notificationCount={props.notificationCount} />
            {((!user && !loading) || (user && user.verified))
                ?
                <div className='content'>{props.children}</div>
                :
                !loading && <div className="validate-email">
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
        </>
    );
};

export default Master;