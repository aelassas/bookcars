import React, { useState, useEffect } from 'react';
import { LANGUAGES, DEFAULT_LANGUAGE } from '../config/env.config';
import { strings } from '../config/app.config';
import {
    getLanguage,
    updateLanguage,
    setLanguage,
    getCurrentUser,
    getQueryLanguage,
    signout
} from '../services/user-service';
import { getNotificationCounter } from '../services/notification-service';
import { getMessageCounter } from '../services/message-service';
import { toast } from 'react-toastify';
import { Avatar } from './Avatar';

import {
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    Badge,
    MenuItem,
    Menu,
    Button,
    Drawer,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,

} from '@mui/material';
import {
    Menu as MenuIcon,
    Mail as MailIcon,
    Notifications as NotificationsIcon,
    More as MoreIcon,
    Language as LanguageIcon,
    Home as HomeIcon,
    InfoTwoTone as AboutIcon,
    DescriptionTwoTone as TosIcon,
    ExitToApp as SignoutIcon,

} from '@mui/icons-material';
import '../assets/css/header.css';

const ListItemLink = (props) => (
    <ListItem button component="a" {...props} />
);

export default function Header(props) {

    const [currentLanguage, setCurrentLanguage] = useState(null);
    const [lang, setLang] = useState(DEFAULT_LANGUAGE);
    const [anchorEl, setAnchorEl] = useState(null);
    const [langAnchorEl, setLangAnchorEl] = useState(null);
    const [mobileMoreAnchorEl, setMobileMoreAnchorEl] = useState(null);
    const [sideAnchorEl, setSideAnchorEl] = useState(null);
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [notificationsCount, setNotificationsCount] = useState(0);
    const [messagesCount, setMessagesCount] = useState(0);
    const [init, setInit] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoaded, setIsLoaded] = useState(false);

    const isMenuOpen = Boolean(anchorEl);
    const isMobileMenuOpen = Boolean(mobileMoreAnchorEl);
    const isLangMenuOpen = Boolean(langAnchorEl);
    const isSideMenuOpen = Boolean(sideAnchorEl);

    const classes = {
        list: {
            width: 250,
        },
        formControl: {
            margin: 1,
            minWidth: 120,
        },
        selectEmpty: {
            marginTop: 2,
        },
        grow: {
            flexGrow: 1
        },
        menuButton: {
            marginRight: 2,
        },
    }

    const handleAccountMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMobileMenuClose = () => {
        setMobileMoreAnchorEl(null);
    };

    const handleLangMenuOpen = (event) => {
        setLangAnchorEl(event.currentTarget);
    };

    const refreshPage = () => {
        let params = new URLSearchParams(window.location.search);

        if (params.has('l')) {
            params.delete('l');
            window.location.href = window.location.href.split('?')[0] + ([...params].length > 0 ? ('?' + params) : '');
        } else {
            window.location.reload();
        }
    };

    const handleLangMenuClose = async (event) => {
        setLangAnchorEl(null);

        const { code } = event.currentTarget.dataset;
        if (code) {
            setLang(code);
            const currentLang = getLanguage();
            if (isSignedIn) {
                // Update user language
                const data = {
                    id: props.user._id,
                    language: code
                };
                const status = await updateLanguage(data);
                if (status === 200) {
                    setLanguage(code);
                    if (code && code !== currentLang) {
                        // Refresh page
                        refreshPage();
                    }
                } else {
                    toast(strings.CHANGE_LANGUAGE_ERROR, { type: 'error' });
                }
            } else {
                setLanguage(code);
                if (code && code !== currentLang) {
                    // Refresh page
                    refreshPage();
                }
            }
        }
    };

    const getLang = (lang) => {
        switch (lang) {
            case 'fr':
                return strings.LANGUAGE_FR;
            case 'en':
                return strings.LANGUAGE_EN;
            default:
                return DEFAULT_LANGUAGE;
        }
    }

    const handleMenuClose = () => {
        setAnchorEl(null);
        handleMobileMenuClose();
    };

    const handleOnProfileClick = () => {
        window.location.href = '/profile';
    };

    const handleSignout = () => {
        signout();
    };

    const handleMobileMenuOpen = (event) => {
        setMobileMoreAnchorEl(event.currentTarget);
    };

    const handleSideMenuOpen = (event) => {
        setSideAnchorEl(event.currentTarget);
    };

    const handleSideMenuClose = () => {
        setSideAnchorEl(null);
    };

    const handleMessagesClick = (e) => {
        window.location.href = '/messages';
    };

    const handleNotificationsClick = (e) => {
        window.location.href = '/notifications';
    };

    useEffect(() => {
        if (!props.hidden) {
            setIsLoading(true);

            let countUpdated = false;
            if (init && (props.messagesCount !== undefined)) {
                setMessagesCount(props.messagesCount);
                countUpdated = true;
            }

            if (init && (props.notificationsCount !== undefined)) {
                setNotificationsCount(props.notificationsCount);
                countUpdated = true;
            }

            if (countUpdated) {
                setIsLoading(false);
                return;
            }

            const queryLanguage = getQueryLanguage();

            if (LANGUAGES.includes(queryLanguage)) {
                setLang(queryLanguage);
                setCurrentLanguage(queryLanguage)
                strings.setLanguage(queryLanguage);
            } else {
                const language = getLanguage();
                setLang(language);
                setCurrentLanguage(language)
                strings.setLanguage(language);
            }

            if (!init && props.user) {
                getNotificationCounter(props.user._id)
                    .then(notificationCounter => {
                        getMessageCounter(props.user._id)
                            .then(messageCounter => {
                                setIsSignedIn(true);
                                setNotificationsCount(notificationCounter.count);
                                setMessagesCount(messageCounter.count);
                                setIsLoading(false);
                                setIsLoaded(true);
                                setInit(true);
                            });
                    });
            } else {
                const currentUser = getCurrentUser();
                if (!currentUser || init) {
                    setIsLoading(false);
                }
            }

        }
    }, [props, init, currentLanguage,isSignedIn]);

    const menuId = 'primary-account-menu';
    const renderMenu = (
        <Menu
            anchorEl={anchorEl}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            id={menuId}
            keepMounted
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            open={isMenuOpen}
            onClose={handleMenuClose}
        >
            <MenuItem onClick={handleOnProfileClick}>
                {
                    <Avatar loggedUser={props.user} user={props.user} size="small" className="profile-action" readonly />
                }
                {strings.PROFILE_HEADING}
            </MenuItem>
            <MenuItem onClick={handleSignout}>{
                <SignoutIcon className="profile-action" />}
                <Typography>{strings.SIGN_OUT}</Typography>
            </MenuItem>
        </Menu>
    );

    const mobileMenuId = 'mobile-menu';
    const renderMobileMenu = (
        <Menu
            anchorEl={mobileMoreAnchorEl}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            id={mobileMenuId}
            keepMounted
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            open={isMobileMenuOpen}
            onClose={handleMobileMenuClose}
        >
            <MenuItem onClick={handleOnProfileClick}>
                <IconButton color="inherit">
                    <Avatar loggedUser={props.user} user={props.user} size="small" readonly />
                </IconButton>
                <p>{strings.PROFILE_HEADING}</p>
            </MenuItem>
            <MenuItem onClick={handleLangMenuOpen}>
                <IconButton
                    aria-label="language of current user"
                    aria-controls="primary-search-account-menu"
                    aria-haspopup="true"
                    color="inherit"
                >
                    <LanguageIcon />
                </IconButton>
                <p>{strings.LANGUAGE}</p>
            </MenuItem>
            <MenuItem onClick={handleSignout}>
                <IconButton color="inherit">
                    <SignoutIcon />
                </IconButton>
                <Typography>{strings.SIGN_OUT}</Typography>
            </MenuItem>
        </Menu>
    );

    const languageMenuId = 'language-menu';
    const renderLanguageMenu = (
        <Menu
            anchorEl={langAnchorEl}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            id={languageMenuId}
            keepMounted
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            open={isLangMenuOpen}
            onClose={handleLangMenuClose}
        >
            <MenuItem onClick={handleLangMenuClose} data-code="fr">{strings.LANGUAGE_FR}</MenuItem>
            <MenuItem onClick={handleLangMenuClose} data-code="en">{strings.LANGUAGE_EN}</MenuItem>
        </Menu>
    );

    return (
        <div style={props.hidden ? { display: 'none' } : classes.grow} >
            <AppBar position="fixed" sx={{ bgcolor: '#f37022' }}>
                <Toolbar>
                    <IconButton
                        edge="start"
                        sx={classes.menuButton}
                        color="inherit"
                        aria-label="open drawer"
                        onClick={handleSideMenuOpen}
                    >
                        <MenuIcon />
                    </IconButton>
                    <React.Fragment>
                        <Drawer open={isSideMenuOpen} onClose={handleSideMenuClose}>
                            <List sx={classes.list}>
                                <ListItemLink href="/">
                                    <ListItemIcon>{<HomeIcon />}</ListItemIcon>
                                    <ListItemText primary={strings.HOME} />
                                </ListItemLink>
                                <ListItemLink href="/about">
                                    <ListItemIcon>{<AboutIcon />}</ListItemIcon>
                                    <ListItemText primary={strings.ABOUT} />
                                </ListItemLink>
                                <ListItemLink href="/tos">
                                    <ListItemIcon>{<TosIcon />}</ListItemIcon>
                                    <ListItemText primary={strings.TOS} />
                                </ListItemLink>
                                <ListItemLink href="/contact">
                                    <ListItemIcon>{<MailIcon />}</ListItemIcon>
                                    <ListItemText primary={strings.CONTACT} />
                                </ListItemLink>
                            </List>
                        </Drawer>
                    </React.Fragment>
                    <div style={classes.grow} />
                    <div className='header-desktop'>
                        {isSignedIn && <IconButton aria-label="" color="inherit" onClick={handleMessagesClick}>
                            <Badge badgeContent={messagesCount > 0 ? messagesCount : null} color="secondary">
                                <MailIcon />
                            </Badge>
                        </IconButton>}
                        {isSignedIn && <IconButton aria-label="" color="inherit" onClick={handleNotificationsClick}>
                            <Badge badgeContent={notificationsCount > 0 ? notificationsCount : null} color="secondary">
                                <NotificationsIcon />
                            </Badge>
                        </IconButton>}
                        {((isLoaded || !init) && !isLoading) && <Button
                            variant="contained"
                            color="primary"
                            // sx={classes.button}
                            startIcon={<LanguageIcon />}
                            onClick={handleLangMenuOpen}
                            disableElevation
                            fullWidth
                            sx={{ bgcolor: '#f37022' }}
                            className="btn-primary"
                        >
                            {getLang(lang)}
                        </Button>}
                        {isSignedIn && <IconButton
                            edge="end"
                            aria-label="account"
                            aria-controls={menuId}
                            aria-haspopup="true"
                            onClick={handleAccountMenuOpen}
                            color="inherit"
                        >
                            <Avatar loggedUser={props.user} user={props.user} size="small" readonly />
                        </IconButton>}
                    </div>
                    <div className='header-mobile'>
                        {(!isSignedIn && !isLoading && !init) && <Button
                            variant="contained"
                            color="primary"
                            // className={classes.button}
                            startIcon={<LanguageIcon />}
                            onClick={handleLangMenuOpen}
                            disableElevation
                            fullWidth
                        >
                            {getLang(lang)}
                        </Button>}
                        {isSignedIn && <IconButton color="inherit" onClick={handleMessagesClick}>
                            <Badge badgeContent={messagesCount > 0 ? messagesCount : null} color="secondary" >
                                <MailIcon />
                            </Badge>
                        </IconButton>}
                        {isSignedIn && <IconButton color="inherit" onClick={handleNotificationsClick}>
                            <Badge badgeContent={notificationsCount > 0 ? notificationsCount : null} color="secondary">
                                <NotificationsIcon />
                            </Badge>
                        </IconButton>}
                        {isSignedIn && <IconButton
                            aria-label="show more"
                            aria-controls={mobileMenuId}
                            aria-haspopup="true"
                            onClick={handleMobileMenuOpen}
                            color="inherit"
                        >
                            <MoreIcon />
                        </IconButton>}
                    </div>
                </Toolbar>
            </AppBar>

            {renderMobileMenu}
            {renderMenu}
            {renderLanguageMenu}
        </div >
    );
};