import React, { useState, useEffect } from 'react';
import Env from '../config/env.config';
import { strings } from '../lang/header';
import * as UserService from '../services/UserService';
import * as NotificationService from '../services/NotificationService';
import { toast } from 'react-toastify';
import Avatar from './Avatar';
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
    Settings as SettingsIcon,
    Dashboard as DashboardIcon,
    CorporateFare as CompaniesIcon,
    LocationOn as LocationsIcon,
    DirectionsCar as CarsIcon,
    People as UsersIcon,
    InfoTwoTone as AboutIcon,
    DescriptionTwoTone as TosIcon,
    ExitToApp as SignoutIcon
} from '@mui/icons-material';
import '../assets/css/header.css';

const ListItemLink = (props) => (
    <ListItem button component="a" {...props} />
);

const Header = (props) => {
    const [lang, setLang] = useState(Env.DEFAULT_LANGUAGE);
    const [anchorEl, setAnchorEl] = useState(null);
    const [langAnchorEl, setLangAnchorEl] = useState(null);
    const [mobileMoreAnchorEl, setMobileMoreAnchorEl] = useState(null);
    const [sideAnchorEl, setSideAnchorEl] = useState(null);
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [notificationCount, setNotificationCount] = useState(0);
    const [loading, setIsLoading] = useState(true);
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
            const currentLang = UserService.getLanguage();
            if (isSignedIn) {
                // Update user language
                const data = {
                    id: props.user._id,
                    language: code
                };
                const status = await UserService.updateLanguage(data);
                if (status === 200) {
                    UserService.setLanguage(code);
                    if (code && code !== currentLang) {
                        // Refresh page
                        refreshPage();
                    }
                } else {
                    toast(strings.CHANGE_LANGUAGE_ERROR, { type: 'error' });
                }
            } else {
                UserService.setLanguage(code);
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
                return Env.DEFAULT_LANGUAGE;
        }
    }

    const handleMenuClose = () => {
        setAnchorEl(null);
        handleMobileMenuClose();
    };

    const handleOnSettingsClick = () => {
        window.location.href = '/settings';
    };

    const handleSignout = () => {
        UserService.signout();
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

    const handleNotificationsClick = (e) => {
        window.location.href = '/notifications';
    };

    useEffect(() => {
        const queryLanguage = UserService.getQueryLanguage();

        if (Env.LANGUAGES.includes(queryLanguage)) {
            setLang(queryLanguage);
            strings.setLanguage(queryLanguage);
        } else {
            const language = UserService.getLanguage();
            setLang(language);
            strings.setLanguage(language);
        }
    }, []);

    useEffect(() => {
        if (!props.hidden) {
            if (props.user) {
                NotificationService.getNotificationCounter(props.user._id)
                    .then(notificationCounter => {
                        setIsSignedIn(true);
                        setNotificationCount(notificationCounter.count);
                        setIsLoading(false);
                        setIsLoaded(true);
                    });
            } else {
                setIsLoading(false);
                setIsLoaded(true);
            }
        }
    }, [props.hidden, props.user]);

    useEffect(() => {
        if (!props.hidden) {
            if (props.notificationCount) {
                setNotificationCount(props.notificationCount);
            } else {
                setNotificationCount(0);
            }
        }
    }, [props.hidden, props.notificationCount]);

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
            <MenuItem onClick={handleOnSettingsClick}>
                <SettingsIcon className="header-action" />
                <Typography>{strings.SETTINGS}</Typography>
            </MenuItem>
            <MenuItem onClick={handleSignout}>{
                <SignoutIcon className="header-action" />}
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
            <MenuItem onClick={handleOnSettingsClick}>
                <SettingsIcon className="header-action" />
                <p>{strings.SETTINGS}</p>
            </MenuItem>
            <MenuItem onClick={handleLangMenuOpen}>
                <LanguageIcon className="header-action" />
                <p>{strings.LANGUAGE}</p>
            </MenuItem>
            <MenuItem onClick={handleSignout}>
                <SignoutIcon className="header-action" />
                <p>{strings.SIGN_OUT}</p>
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
            <AppBar position="fixed" sx={{ bgcolor: '#121212' }}>
                <Toolbar className='toolbar'>
                    {isLoaded && !loading && isSignedIn && <IconButton
                        edge="start"
                        sx={classes.menuButton}
                        color="inherit"
                        aria-label="open drawer"
                        onClick={handleSideMenuOpen}
                    >
                        <MenuIcon />
                    </IconButton>}
                    <React.Fragment>
                        <Drawer open={isSideMenuOpen} onClose={handleSideMenuClose}>
                            <List sx={classes.list}>
                                <ListItemLink href="/">
                                    <ListItemIcon>{<DashboardIcon />}</ListItemIcon>
                                    <ListItemText primary={strings.DASHBOARD} />
                                </ListItemLink>
                                <ListItemLink href="/suppliers">
                                    <ListItemIcon>{<CompaniesIcon />}</ListItemIcon>
                                    <ListItemText primary={strings.COMPANIES} />
                                </ListItemLink>
                                <ListItemLink href="/locations">
                                    <ListItemIcon>{<LocationsIcon />}</ListItemIcon>
                                    <ListItemText primary={strings.LOCATIONS} />
                                </ListItemLink>
                                <ListItemLink href="/cars">
                                    <ListItemIcon>{<CarsIcon />}</ListItemIcon>
                                    <ListItemText primary={strings.CARS} />
                                </ListItemLink>
                                <ListItemLink href="/users">
                                    <ListItemIcon>{<UsersIcon />}</ListItemIcon>
                                    <ListItemText primary={strings.USERS} />
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
                        {isSignedIn &&
                            <IconButton aria-label="" color="inherit" onClick={handleNotificationsClick}>
                                <Badge badgeContent={notificationCount > 0 ? notificationCount : null} color="error">
                                    <NotificationsIcon />
                                </Badge>
                            </IconButton>}
                        {((isLoaded) && !loading) &&
                            <Button
                                variant="contained"
                                startIcon={<LanguageIcon />}
                                onClick={handleLangMenuOpen}
                                disableElevation
                                fullWidth
                                className="btn-primary"
                            >
                                {getLang(lang)}
                            </Button>}
                        {isSignedIn &&
                            <IconButton
                                edge="end"
                                aria-label="account"
                                aria-controls={menuId}
                                aria-haspopup="true"
                                onClick={handleAccountMenuOpen}
                                color="inherit"
                            >
                                <Avatar record={props.user} type={props.user.type} size="small" readonly />
                            </IconButton>}
                    </div>
                    <div className='header-mobile'>
                        {(!isSignedIn && !loading) &&
                            <Button
                                variant="contained"
                                startIcon={<LanguageIcon />}
                                onClick={handleLangMenuOpen}
                                disableElevation
                                fullWidth
                                className="btn-primary"
                            >
                                {getLang(lang)}
                            </Button>}
                        {isSignedIn &&
                            <IconButton color="inherit" onClick={handleNotificationsClick}>
                                <Badge badgeContent={notificationCount > 0 ? notificationCount : null} color="error">
                                    <NotificationsIcon />
                                </Badge>
                            </IconButton>}
                        {isSignedIn &&
                            <IconButton
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

export default Header;