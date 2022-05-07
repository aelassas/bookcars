import React, { useState, useEffect } from 'react';
import Env from '../config/env.config';
import { strings } from '../config/app.config';
import Helper from '../common/Helper';
import UserService from '../services/UserService';
import { toast } from 'react-toastify';
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
    BrokenImageTwoTone as DeleteIcon,
    CorporateFare as CompanyIcon,
} from '@mui/icons-material';

export const Avatar = (props) => {
    const [error, setError] = useState(false);
    const [open, setOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [avatar, setAvatar] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const handleChange = (e) => {

        if (props.onBeforeUpload) {
            props.onBeforeUpload();
        }

        const reader = new FileReader();
        const file = e.target.files[0];

        reader.onloadend = () => {
            if (user && props.mode === 'update') {
                const { _id } = user;

                UserService.updateAvatar(_id, file)
                    .then(status => {
                        if (status === 200) {
                            UserService.getUser(_id).then(user => {
                                if (user) {
                                    setUser(user);
                                    setAvatar(user.avatar);

                                    if (props.onChange) {
                                        props.onChange(user);
                                    }
                                } else {
                                    toast(strings.GENERIC_ERROR, { type: 'error' });
                                }
                            }).catch(err => {
                                toast(strings.GENERIC_ERROR, { type: 'error' });
                            });
                        } else {
                            toast(strings.GENERIC_ERROR, { type: 'error' });
                        }
                    })
                    .catch(err => {
                        toast(strings.GENERIC_ERROR, { type: 'error' });
                    });
            } else if (!user && props.mode === 'create') {
                UserService.createAvatar(file)
                    .then(data => {
                        setAvatar(data);

                        if (props.onChange) {
                            props.onChange(data);
                        }
                    })
                    .catch(err => {
                        toast(strings.GENERIC_ERROR, { type: 'error' });
                    });
            }
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

        if (user && props.mode === 'update') {
            const { _id } = user;
            UserService.deleteAvatar(_id)
                .then(status => {
                    if (status === 200) {
                        UserService.getUser(_id).then(user => {
                            if (user) {
                                setUser(user);
                                setAvatar(null);
                                if (props.onChange) {
                                    props.onChange(user);
                                }
                                closeDialog();
                            } else {
                                toast(strings.GENERIC_ERROR, { type: 'error' });
                            }
                        }).catch(err => {
                            toast(strings.GENERIC_ERROR, { type: 'error' });
                        });
                    } else {
                        toast(strings.GENERIC_ERROR, { type: 'error' });
                    }
                })
                .catch(err => {
                    toast(strings.GENERIC_ERROR, { type: 'error' });
                });
        } else if (!user && props.mode === 'create') {
            UserService.deleteTempAvatar(avatar)
                .then(status => {
                    if (status === 200) {
                        setAvatar(null);
                        if (props.onChange) {
                            props.onChange();
                        }
                        closeDialog();
                    } else {
                        toast(strings.GENERIC_ERROR, { type: 'error' });
                    }
                })
                .catch(err => {
                    toast(strings.GENERIC_ERROR, { type: 'error' });
                });
        }
    };

    const cdn = _ => {
        return props.mode === 'create' ? Env.CDN_TEMP_USERS : Env.CDN_USERS;
    };

    useEffect(() => {
        const language = UserService.getLanguage();
        strings.setLanguage(language);

        const currentUser = UserService.getCurrentUser();
        if (currentUser) {
            if (props.user) {
                setUser(props.user);
                setAvatar(props.user.avatar);
                setIsLoading(false);
            } else {
                setIsLoading(false);
            }
        } else {
            setError(true);
        }
    }, [props.user]);

    const { size, readonly, className } = props;
    return (
        !error && !isLoading ?
            <div className={className}>
                {avatar ?
                    readonly ?
                        (props.type === Env.USER_TYPE.COMPANY ?
                            <img className='company-avatar-img' src={avatar.startsWith('http') ? avatar : Helper.joinURL(cdn(), avatar)} alt={user && user.fullName} />
                            :
                            <MaterialAvatar
                                src={avatar.startsWith('http') ? avatar : Helper.joinURL(cdn(), avatar)}
                                className={size ? 'avatar-' + size : 'avatar'} />
                        )
                        :
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
                                className={props.type === Env.USER_TYPE.COMPANY && 'company-avatar'}
                                badgeContent={
                                    <Box borderRadius="50%" className="avatar-action-box" onClick={handleUpload}>
                                        <PhotoCameraIcon className='avatar-action-icon' />
                                    </Box>
                                }
                            >
                                {props.type === Env.USER_TYPE.COMPANY ?
                                    <img className='company-avatar-img' src={avatar.startsWith('http') ? avatar : Helper.joinURL(cdn(), avatar)} alt={user && user.fullName} />
                                    :
                                    <MaterialAvatar
                                        src={avatar.startsWith('http') ? avatar : Helper.joinURL(cdn(), avatar)}
                                        className={size ? 'avatar-' + size : 'avatar'} />
                                }
                            </Badge>
                        </Badge>
                    :
                    readonly ?
                        props.type === Env.USER_TYPE.COMPANY ?
                            <CompanyIcon className='company-avatar-img' color={props.color || 'inherit'} />
                            : <AccountCircle className={size ? 'avatar-' + size : 'avatar'} color={props.color || 'inherit'} />
                        :
                        <Badge
                            overlap="circular"
                            anchorOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
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
                                {props.type === Env.USER_TYPE.COMPANY ?
                                    <CompanyIcon className={size ? 'avatar-' + size : 'avatar'} color={props.color || 'inherit'} />
                                    : <AccountCircle className={size ? 'avatar-' + size : 'avatar'} color={props.color || 'inherit'} />}
                            </Badge>
                        </Badge>
                }
                <Dialog
                    disableEscapeKeyDown
                    maxWidth="xs"
                    open={open}
                >
                    <DialogTitle>{strings.CONFIRM_TITLE}</DialogTitle>
                    <DialogContent>{strings.DELETE_AVATAR_CONFIRM}</DialogContent>
                    <DialogActions>
                        <Button onClick={handleCancelDelete} className='btn-secondary'>{strings.CANCEL}</Button>
                        <Button onClick={handleDelete} color="error" variant='contained'>{strings.DELETE}</Button>
                    </DialogActions>
                </Dialog>
                {!readonly && <input id="upload" type="file" hidden onChange={handleChange} />}
            </div>
            :
            null
    );
}