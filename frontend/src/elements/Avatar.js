import React, { useState, useEffect } from 'react';
import { strings } from '../config/app.config';
import { CDN } from '../config/env.config';
import { getUser, updateAvatar, deleteAvatar, getCurrentUser, getLanguage } from '../services/user-service';
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
    BrokenImageTwoTone as DeleteIcon
} from '@mui/icons-material';

export const Avatar = (props) => {
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
            updateAvatar(_id, file).then(
                status => {
                    if (status === 200) {
                        getUser(_id).then(user => {
                            if (user) {
                                setUser(user);
                                if (props.onChange) {
                                    const img = document.querySelector('.avatar > img');
                                    img.onload = () => {
                                        props.onChange(user);
                                    };
                                }
                            } else {
                                toast(strings.GENERIC_ERROR, { type: 'error' });
                                if (props.onChange) {
                                    props.onChange(user);
                                }
                            }
                        }).catch(err => {
                            toast(strings.GENERIC_ERROR, { type: 'error' });
                            if (props.onChange) {
                                props.onChange(user);
                            }
                        });
                    } else {
                        toast(strings.GENERIC_ERROR, { type: 'error' });
                        if (props.onChange) {
                            props.onChange(user);
                        }
                    }
                }
            ).catch(err => {
                toast(strings.GENERIC_ERROR, { type: 'error' });
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
        deleteAvatar(_id)
            .then(status => {
                if (status === 200) {
                    getUser(_id).then(user => {
                        if (user) {
                            setUser(user);
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
            }).catch(err => {
                toast(strings.GENERIC_ERROR, { type: 'error' });
            });
    };

    const joinURL = (part1, part2) => {
        if (part1.charAt(part1.length - 1) === '/') {
            part1 = part1.substr(0, part1.length - 1);
        }
        if (part2.charAt(0) === '/') {
            part2 = part2.substr(1);
        }
        return part1 + '/' + part2;
    };

    useEffect(() => {
        const language = getLanguage();
        strings.setLanguage(language);

        const currentUser = getCurrentUser();
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
                                        <DeleteIcon className={user.language === 'ar' ? 'avatar-action-icon-rtl' : 'avatar-action-icon'} />
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
                                            <PhotoCameraIcon className={user.language === 'ar' ? 'avatar-action-icon-rtl' : 'avatar-action-icon'} />
                                        </Box>
                                    }
                                >
                                    <MaterialAvatar
                                        src={user.avatar.startsWith('http') ? user.avatar : joinURL(CDN, user.avatar)}
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
                                src={user.avatar.startsWith('http') ? user.avatar : joinURL(CDN, user.avatar)}
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
                    <DialogTitle>{strings.CONFIRM_TITLE}</DialogTitle>
                    <DialogContent>{strings.DELETE_AVATAR_CONFIRM}</DialogContent>
                    <DialogActions>
                        <Button onClick={handleCancelDelete} color="default">{strings.CANCEL}</Button>
                        <Button onClick={handleDelete} color="secondary">{strings.DELETE}</Button>
                    </DialogActions>
                </Dialog>
            </div>
            :
            null
    );
}