import React, { useState, useEffect } from 'react';
import Env from '../config/env.config';
import { strings } from '../config/app.config';
import Helper from '../common/Helper';
import UserService from '../services/UserService';
import CarService from '../services/CarService';
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
    DirectionsCar as CarIcon
} from '@mui/icons-material';

export const Avatar = (props) => {
    const [error, setError] = useState(false);
    const [open, setOpen] = useState(false);
    const [record, setRecord] = useState(null);
    const [avatar, setAvatar] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const validate = (file, onValid) => {
        if (props.width && props.height) {
            const _URL = window.URL || window.webkitURL;
            const img = new Image();
            const objectUrl = _URL.createObjectURL(file);
            img.onload = _ => {
                if (props.width !== img.width || props.height !== img.height) {
                    if (props.onValidate) {
                        props.onValidate(false);
                    }
                } else {
                    if (props.onValidate) {
                        props.onValidate(true);
                    }
                    if (onValid) {
                        onValid();
                    }

                }
                _URL.revokeObjectURL(objectUrl);
            };
            img.src = objectUrl;
        } else {
            if (onValid) {
                onValid();
            }
        }
    }

    const handleChange = (e) => {

        if (props.onBeforeUpload) {
            props.onBeforeUpload();
        }

        const reader = new FileReader();
        const file = e.target.files[0];

        reader.onloadend = () => {
            if (props.type === Env.RECORD_TYPE.ADMIN
                || props.type === Env.RECORD_TYPE.COMPANY) {
                if (props.mode === 'create') {
                    const createAvatar = _ => {
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
                    };

                    validate(file, createAvatar);
                } else if (record && props.mode === 'update') {

                    const updateAvatar = _ => {
                        const { _id } = record;

                        UserService.updateAvatar(_id, file)
                            .then(status => {
                                if (status === 200) {
                                    UserService.getUser(_id).then(user => {
                                        if (user) {
                                            setRecord(user);
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
                    };

                    validate(file, updateAvatar);

                }
            } else if (props.type === Env.RECORD_TYPE.CAR) {
                if (props.mode === 'create') {
                    const createAvatar = _ => {
                        CarService.createImage(file)
                            .then(data => {
                                setAvatar(data);

                                if (props.onChange) {
                                    props.onChange(data);
                                }
                            })
                            .catch(err => {
                                toast(strings.GENERIC_ERROR, { type: 'error' });
                            });
                    };

                    validate(file, createAvatar);
                } else if (props.mode === 'update') {
                    
                    const updateAvatar = _ => {
                        const { _id } = record;

                        CarService.updateImage(_id, file)
                            .then(status => {
                                if (status === 200) {
                                    CarService.getCar(_id).then(car => {
                                        if (car) {
                                            setRecord(car);
                                            setAvatar(car.image);

                                            if (props.onChange) {
                                                props.onChange(car);
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
                    };

                    validate(file, updateAvatar);
                }
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

        if (props.type === Env.RECORD_TYPE.ADMIN || props.type === Env.RECORD_TYPE.COMPANY) {
            if (record && props.mode === 'update') {
                const { _id } = record;
                UserService.deleteAvatar(_id)
                    .then(status => {
                        if (status === 200) {
                            UserService.getUser(_id).then(user => {
                                if (user) {
                                    setRecord(user);
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
            } else if (!record && props.mode === 'create') {
                UserService.deleteTempAvatar(avatar)
                    .then(status => {
                        if (status === 200) {
                            setAvatar(null);
                            if (props.onChange) {
                                props.onChange(null);
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
        } else if (props.type === Env.RECORD_TYPE.CAR) {
            if (!record && props.mode === 'create') {
                CarService.deleteTempImage(avatar)
                    .then(status => {
                        if (status === 200) {
                            setAvatar(null);
                            if (props.onChange) {
                                props.onChange(null);
                            }
                            closeDialog();
                        } else {
                            toast(strings.GENERIC_ERROR, { type: 'error' });
                        }
                    })
                    .catch(err => {
                        toast(strings.GENERIC_ERROR, { type: 'error' });
                    });
            } else if (record && props.mode === 'update') {
                const { _id } = record;
                CarService.deleteImage(_id)
                    .then(status => {
                        if (status === 200) {
                            UserService.getUser(_id).then(car => {
                                if (car) {
                                    setRecord(car);
                                    setAvatar(null);
                                    if (props.onChange) {
                                        props.onChange(car);
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
            }
        }
    };

    const cdn = _ => {
        if (props.type === Env.RECORD_TYPE.CAR) {
            return props.mode === 'create' ? Env.CDN_TEMP_CARS : Env.CDN_CARS;
        }
        return props.mode === 'create' ? Env.CDN_TEMP_USERS : Env.CDN_USERS;
    };

    useEffect(() => {
        const language = UserService.getLanguage();
        strings.setLanguage(language);

        const currentUser = UserService.getCurrentUser();
        if (currentUser) {
            if (props.record) {
                setRecord(props.record);
                if (props.type === Env.RECORD_TYPE.CAR) {
                    setAvatar(props.record.image);
                } else {
                    setAvatar(props.record.avatar);
                }
                setIsLoading(false);
            } else {
                setIsLoading(false);
            }
        } else {
            setError(true);
        }
    }, [props.record, props.type]);

    const { size, readonly, className } = props;

    return (
        !error && !isLoading ?
            <div className={className}>
                {avatar ?
                    readonly ?
                        props.type === Env.RECORD_TYPE.CAR ?
                            <img className='car-avatar-img' src={Helper.joinURL(cdn(), avatar)} alt={record && record.name} />
                            :
                            (props.type === Env.RECORD_TYPE.COMPANY ?
                                <img className='company-avatar-img' src={Helper.joinURL(cdn(), avatar)} alt={record && record.fullName} />
                                :
                                <MaterialAvatar
                                    src={Helper.joinURL(cdn(), avatar)}
                                    className={size ? 'avatar-' + size : 'avatar'}
                                />
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
                                className={props.type === Env.RECORD_TYPE.COMPANY ? 'company-avatar' : null}
                                badgeContent={
                                    <Box borderRadius="50%" className="avatar-action-box" onClick={handleUpload}>
                                        <PhotoCameraIcon className='avatar-action-icon' />
                                    </Box>
                                }
                            >
                                {
                                    props.type === Env.RECORD_TYPE.CAR ?
                                        <img className='car-avatar-img' src={Helper.joinURL(cdn(), avatar)} alt={record && record.name} />
                                        :
                                        (props.type === Env.RECORD_TYPE.COMPANY ?
                                            <img className='company-avatar-img' src={Helper.joinURL(cdn(), avatar)} alt={record && record.fullName} />
                                            :
                                            <MaterialAvatar
                                                src={Helper.joinURL(cdn(), avatar)}
                                                className={size ? 'avatar-' + size : 'avatar'} />
                                        )
                                }
                            </Badge>
                        </Badge>
                    :
                    readonly ?
                        (props.type === Env.RECORD_TYPE.CAR ?
                            <CarIcon className={size ? 'avatar-' + size : 'avatar'} color={props.color || 'inherit'} />
                            :
                            (
                                props.type === Env.RECORD_TYPE.COMPANY ?
                                    <CompanyIcon className='company-avatar-img' color={props.color || 'inherit'} />
                                    : <AccountCircle className={size ? 'avatar-' + size : 'avatar'} color={props.color || 'inherit'} />
                            )
                        )
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
                                {
                                    props.type === Env.RECORD_TYPE.CAR ?
                                        <CarIcon className={size ? 'avatar-' + size : 'avatar'} color={props.color || 'inherit'} />
                                        :
                                        (
                                            props.type === Env.RECORD_TYPE.COMPANY ?
                                                <CompanyIcon className={size ? 'avatar-' + size : 'avatar'} color={props.color || 'inherit'} />
                                                : <AccountCircle className={size ? 'avatar-' + size : 'avatar'} color={props.color || 'inherit'} />
                                        )
                                }
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