import React, { useState, useEffect } from 'react';
import Env from '../config/env.config';
import * as Helper from '../common/Helper';
import { strings as commonStrings } from '../lang/common';
import * as UserService from '../services/UserService';
import {
    Button,
    Avatar as MaterialAvatar,
    Badge,
    Box,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import {
    AccountCircle,
    PhotoCamera as PhotoCameraIcon,
    BrokenImageTwoTone as DeleteIcon
} from '@mui/icons-material';

const Avatar = (props) => {
    const [error, setError] = useState(false);
    const [open, setOpen] = useState(false);
    const [user, setUser] = useState(null);

    const handleChange = (e) => {

        if (props.onBeforeUpload) {
            props.onBeforeUpload();
        }

        const { _id } = user;
        const reader = new FileReader();
        const file = e.target.files[0];

        reader.onloadend = () => {
            UserService.updateAvatar(_id, file).then(
                status => {
                    if (status === 200) {
                        UserService.getUser(_id)
                            .then(user => {
                                if (user) {
                                    setUser(user);
                                    if (props.onChange) {
                                        props.onChange(user);
                                    }
                                } else {
                                    Helper.error();
                                    if (props.onChange) {
                                        props.onChange(user);
                                    }
                                }
                            }).catch(err => {
                                Helper.error(err);
                                if (props.onChange) {
                                    props.onChange(user);
                                }
                            });
                    } else {
                        Helper.error();
                        if (props.onChange) {
                            props.onChange(user);
                        }
                    }
                }
            ).catch(err => {
                Helper.error(err);
                if (props.onChange) {
                    props.onChange(user);
                }
            });
        };

        reader.readAsDataURL(file);
    };

    const handleUpload = (e) => {
        const upload = document.getElementById('upload');
        upload.value = '';
        setTimeout(() => {
            upload.click(e);
        }, 0);
    };

    const openDialog = () => {
        setOpen(true);
    };

    const handleDeleteAvatar = (e) => {
        e.preventDefault();
        openDialog();
    };

    const closeDialog = () => {
        setOpen(false);
    };

    const handleCancelDelete = (e) => {
        closeDialog();
    };

    const handleDelete = (e) => {
        const { _id } = user;
        UserService.deleteAvatar(_id)
            .then(status => {
                if (status === 200) {
                    UserService.getUser(_id)
                        .then(user => {
                            if (user) {
                                setUser(user);
                                if (props.onChange) {
                                    props.onChange(user);
                                }
                                closeDialog();
                            } else {
                                Helper.error();
                            }
                        }).catch(err => {
                            Helper.error(err);
                        });
                } else {
                    Helper.error();
                }
            }).catch(err => {
                Helper.error(err);
            });
    };

    useEffect(() => {
        const language = UserService.getLanguage();
        commonStrings.setLanguage(language);

        const currentUser = UserService.getCurrentUser();
        if (currentUser) {
            setUser(props.user);
        } else {
            setError(true);
        }
    }, [props.user]);


    const { loggedUser, size, readonly, className } = props;
    return (
        !error && loggedUser && user
            ?
            <div className={className}>
                {loggedUser._id === user._id && !readonly
                    ?
                    <div>
                        <input id="upload" type="file" hidden onChange={handleChange} />
                        {user.avatar
                            ?
                            <Badge
                                overlap="circular"
                                anchorOrigin={{
                                    vertical: 'top',
                                    horizontal: 'right',
                                }}
                                badgeContent={
                                    <Box borderRadius="50%" className="avatar-action-box" onClick={handleDeleteAvatar}>
                                        <DeleteIcon className='avatar-action-icon' />
                                    </Box>
                                }
                            >
                                <Badge
                                    overlap="circular"
                                    anchorOrigin={{
                                        vertical: 'bottom',
                                        horizontal: 'right',
                                    }}
                                    badgeContent={
                                        <Box borderRadius="50%" className="avatar-action-box" onClick={handleUpload}>
                                            <PhotoCameraIcon className='avatar-action-icon' />
                                        </Box>
                                    }
                                >
                                    <MaterialAvatar
                                        src={Helper.joinURL(Env.CDN_USERS, user.avatar)}
                                        className="avatar"
                                    />
                                </Badge>
                            </Badge>
                            :
                            <Badge
                                overlap="circular"
                                anchorOrigin={{
                                    vertical: 'bottom',
                                    horizontal: 'right',
                                }}
                                badgeContent={
                                    <div>
                                        <Box borderRadius="50%" className="avatar-action-box" onClick={handleUpload}>
                                            <PhotoCameraIcon className={user.language === 'ar' ? 'avatar-action-icon-rtl' : 'avatar-action-icon'} />
                                        </Box>
                                    </div>}
                            >
                                <MaterialAvatar className="avatar">
                                    <AccountCircle className="avatar" />
                                </MaterialAvatar>
                            </Badge>
                        }
                    </div>
                    :
                    (
                        user.avatar
                            ?
                            <MaterialAvatar
                                src={Helper.joinURL(Env.CDN_USERS, user.avatar)}
                                className={size ? 'avatar-' + size : 'avatar'} />
                            :
                            <AccountCircle className={size ? 'avatar-' + size : 'avatar'} color={props.color || 'inherit'} />
                    )
                }
                <Dialog
                    disableEscapeKeyDown
                    maxWidth="xs"
                    open={open}
                >
                    <DialogTitle className='dialog-header'>{commonStrings.CONFIRM_TITLE}</DialogTitle>
                    <DialogContent>{commonStrings.DELETE_AVATAR_CONFIRM}</DialogContent>
                    <DialogActions className='dialog-actions'>
                        <Button onClick={handleCancelDelete} className='btn-secondary'>{commonStrings.CANCEL}</Button>
                        <Button onClick={handleDelete} className='btn-primary'>{commonStrings.DELETE}</Button>
                    </DialogActions>
                </Dialog>
            </div>
            :
            null
    );
};

export default Avatar;