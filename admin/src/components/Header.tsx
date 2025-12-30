

import React, { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
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
} from '@mui/material'
import {
  Menu as MenuIcon,
  More as MoreIcon,
  Language as LanguageIcon,
  Settings as SettingsIcon,
  ExitToApp as SignoutIcon,
} from '@mui/icons-material'
import {
  LayoutDashboard,
  Calendar,
  Building2,
  Flag,
  MapPin,
  Car,
  Users,
  DollarSign,
  Landmark,
  Settings as SettingsLucide,
  Info,
  FileText,
  Mail,
  Bell,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import * as bookcarsTypes from ':bookcars-types'
import env from '@/config/env.config'
import { strings } from '@/lang/header'
import { strings as commonStrings } from '@/lang/common'
import * as UserService from '@/services/UserService'
import * as BankDetailsService from '@/services/BankDetailsService'
import Avatar from './Avatar'
import * as langHelper from '@/utils/langHelper'
import * as helper from '@/utils/helper'
import { useNotificationContext, NotificationContextType } from '@/context/NotificationContext'
import { useUserContext, UserContextType } from '@/context/UserContext'

import '@/assets/css/header.css'

interface HeaderProps {
  hidden?: boolean
}

const Header = ({
  hidden,
}: HeaderProps) => {
  const navigate = useNavigate()

  const { user } = useUserContext() as UserContextType
  const { notificationCount } = useNotificationContext() as NotificationContextType

  const [currentUser, setCurrentUser] = useState<bookcarsTypes.User>()
  const [lang, setLang] = useState(helper.getLanguage(env.DEFAULT_LANGUAGE))
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [langAnchorEl, setLangAnchorEl] = useState<HTMLElement | null>(null)
  const [mobileMoreAnchorEl, setMobileMoreAnchorEl] = useState<HTMLElement | null>(null)
  const [sideAnchorEl, setSideAnchorEl] = useState<HTMLElement | null>(null)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [bankDetails, setBankDetails] = useState<bookcarsTypes.BankDetails | null>(null)

  const isMenuOpen = Boolean(anchorEl)
  const isMobileMenuOpen = Boolean(mobileMoreAnchorEl)
  const isLangMenuOpen = Boolean(langAnchorEl)
  const isSideMenuOpen = Boolean(sideAnchorEl)

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
      flexGrow: 1,
    },
    menuButton: {
      marginRight: 2,
    },
  }

  const handleAccountMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMobileMenuClose = () => {
    setMobileMoreAnchorEl(null)
  }

  const handleLangMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setLangAnchorEl(event.currentTarget)
  }

  const refreshPage = () => {
    // const params = new URLSearchParams(window.location.search)

    // if (params.has('l')) {
    //   params.delete('l')
    //   // window.location.href = window.location.href.split('?')[0] + ([...params].length > 0 ? `?${params}` : '')
    //   window.location.replace(window.location.href.split('?')[0] + ([...params].length > 0 ? `?${params}` : ''))
    // } else {
    //   // window.location.reload()
    //   window.location.replace(window.location.href)
    // }
    navigate(0)
  }

  const handleLangMenuClose = async (event: React.MouseEvent<HTMLElement>) => {
    setLangAnchorEl(null)

    const { code } = event.currentTarget.dataset
    if (code) {
      setLang(helper.getLanguage(code))
      const currentLang = UserService.getLanguage()
      if (isSignedIn && user) {
        // Update user language
        const data: bookcarsTypes.UpdateLanguagePayload = {
          id: user._id as string,
          language: code,
        }
        const status = await UserService.updateLanguage(data)
        if (status === 200) {
          UserService.setLanguage(code)
          if (code && code !== currentLang) {
            // Refresh page
            refreshPage()
          }
        } else {
          toast(commonStrings.CHANGE_LANGUAGE_ERROR, { type: 'error' })
        }
      } else {
        UserService.setLanguage(code)
        if (code && code !== currentLang) {
          // Refresh page
          refreshPage()
        }
      }
    }
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    handleMobileMenuClose()
  }

  const handleSettingsClick = () => {
    handleMenuClose()
    navigate('/settings')
  }

  const handleSignout = async () => {
    handleMenuClose()
    await UserService.signout()
  }

  const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMoreAnchorEl(event.currentTarget)
  }

  const handleSideMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setSideAnchorEl(event.currentTarget)
  }

  const handleSideMenuClose = () => {
    setSideAnchorEl(null)
  }

  const handleNotificationsClick = () => {
    navigate('/notifications')
  }

  useEffect(() => {
    const language = langHelper.getLanguage()
    setLang(helper.getLanguage(language))
    langHelper.setLanguage(strings, language)
  }, [])

  useEffect(() => {
    if (user) {
      setCurrentUser(user)
      setIsSignedIn(true)
    } else {
      setCurrentUser(undefined)
      setIsSignedIn(false)
    }
  }, [user])

  useEffect(() => {
    const init = async () => {
      if (!hidden) {
        if (currentUser) {
          const _bankDetails = await BankDetailsService.getBankDetails()
          setBankDetails(_bankDetails)

          setIsSignedIn(true)
          setIsLoaded(true)
        }
      }
    }

    init()
  }, [hidden, currentUser])

  const menuId = 'primary-account-menu'
  const renderMenu = (
    <Menu
      anchorEl={anchorEl}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      id={menuId}
      keepMounted
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      open={isMenuOpen}
      onClose={handleMenuClose}
      className="menu"
    >
      <MenuItem onClick={handleSettingsClick}>
        <SettingsIcon className="header-action" />
        <Typography>{strings.SETTINGS}</Typography>
      </MenuItem>
      <MenuItem onClick={handleSignout}>
        <SignoutIcon className="header-action" />
        <Typography>{strings.SIGN_OUT}</Typography>
      </MenuItem>
    </Menu>
  )

  const mobileMenuId = 'mobile-menu'
  const renderMobileMenu = (
    <Menu
      anchorEl={mobileMoreAnchorEl}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      id={mobileMenuId}
      keepMounted
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      open={isMobileMenuOpen}
      onClose={handleMobileMenuClose}
      className="menu"
    >
      <MenuItem onClick={handleSettingsClick}>
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
  )

  const languageMenuId = 'language-menu'
  const renderLanguageMenu = (
    <Menu
      anchorEl={langAnchorEl}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      id={languageMenuId}
      keepMounted
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      open={isLangMenuOpen}
      onClose={handleLangMenuClose}
      className="menu"
    >
      {
        env._LANGUAGES.map((language) => (
          <MenuItem onClick={handleLangMenuClose} data-code={language.code} key={language.code}>
            {language.label}
          </MenuItem>
        ))
      }
    </Menu>
  )

  const sidebarContent = (
    <nav className="flex flex-col py-2">
      <button
        onClick={() => {
          navigate('/')
          handleSideMenuClose()
        }}
        className="nav-item"
      >
        <LayoutDashboard className="nav-icon" />
        <span>{strings.DASHBOARD}</span>
      </button>
      <button
        onClick={() => {
          navigate('/bookings')
          handleSideMenuClose()
        }}
        className="nav-item"
      >
        <Calendar className="nav-icon" />
        <span>Bookings</span>
      </button>
      <button
        onClick={() => {
          navigate('/scheduler')
          handleSideMenuClose()
        }}
        className="nav-item"
      >
        <Calendar className="nav-icon" />
        <span>{strings.SCHEDULER}</span>
      </button>
      <button
        onClick={() => {
          navigate('/suppliers')
          handleSideMenuClose()
        }}
        className="nav-item"
      >
        <Building2 className="nav-icon" />
        <span>{strings.COMPANIES}</span>
      </button>
      <button
        onClick={() => {
          navigate('/countries')
          handleSideMenuClose()
        }}
        className="nav-item"
      >
        <Flag className="nav-icon" />
        <span>{strings.COUNTRIES}</span>
      </button>
      <button
        onClick={() => {
          navigate('/locations')
          handleSideMenuClose()
        }}
        className="nav-item"
      >
        <MapPin className="nav-icon" />
        <span>{strings.LOCATIONS}</span>
      </button>
      <button
        onClick={() => {
          navigate('/cars')
          handleSideMenuClose()
        }}
        className="nav-item"
      >
        <Car className="nav-icon" />
        <span>{strings.CARS}</span>
      </button>
      <button
        onClick={() => {
          navigate('/users')
          handleSideMenuClose()
        }}
        className="nav-item"
      >
        <Users className="nav-icon" />
        <span>{strings.USERS}</span>
      </button>
      <button
        onClick={() => {
          navigate('/pricing')
          handleSideMenuClose()
        }}
        className="nav-item"
      >
        <DollarSign className="nav-icon" />
        <span>{strings.PRICING}</span>
      </button>
      {bankDetails?.showBankDetailsPage && (
        <button
          onClick={() => {
            navigate('/bank-details')
            handleSideMenuClose()
          }}
          className="nav-item"
        >
          <Landmark className="nav-icon" />
          <span>{strings.BANK_DETAILS}</span>
        </button>
      )}
      <button
        onClick={() => {
          navigate('/settings')
          handleSideMenuClose()
        }}
        className="nav-item"
      >
        <SettingsLucide className="nav-icon" />
        <span>{strings.SETTINGS}</span>
      </button>
      
      <div className="my-2 border-t border-neutral-200" />
      
      <button
        onClick={() => {
          navigate('/about')
          handleSideMenuClose()
        }}
        className="nav-item"
      >
        <Info className="nav-icon" />
        <span>{strings.ABOUT}</span>
      </button>
      <button
        onClick={() => {
          navigate('/tos')
          handleSideMenuClose()
        }}
        className="nav-item"
      >
        <FileText className="nav-icon" />
        <span>{strings.TOS}</span>
      </button>
      <button
        onClick={() => {
          navigate('/contact')
          handleSideMenuClose()
        }}
        className="nav-item"
      >
        <Mail className="nav-icon" />
        <span>{strings.CONTACT}</span>
      </button>
    </nav>
  )

  return !hidden && (
    <div style={classes.grow} className="header">
      <AppBar position="fixed" sx={{ bgcolor: '#121212' }} className="top-header">
        <Toolbar className="toolbar">
          {/* Mobile burger menu - only visible on mobile */}
          {isLoaded && isSignedIn && (
            <IconButton 
              edge="start" 
              sx={classes.menuButton} 
              color="inherit" 
              aria-label="open drawer" 
              onClick={handleSideMenuOpen}
              className="mobile-menu-button"
            >
              <MenuIcon />
            </IconButton>
          )}
          <div style={classes.grow} />
          <div className="header-desktop">
            {isSignedIn && (
              <IconButton aria-label="" color="inherit" onClick={handleNotificationsClick}>
                <Badge badgeContent={notificationCount > 0 ? notificationCount : null} color="error">
                  <Bell />
                </Badge>
              </IconButton>
            )}
            {isLoaded && (
              <Button variant="contained" startIcon={<LanguageIcon />} onClick={handleLangMenuOpen} disableElevation className="btn-primary">
                {lang?.label}
              </Button>
            )}
            {isSignedIn && user && (
              <IconButton edge="end" aria-label="account" aria-controls={menuId} aria-haspopup="true" onClick={handleAccountMenuOpen} color="inherit">
                <Avatar record={user} type={user.type} size="small" readonly />
              </IconButton>
            )}
          </div>
          <div className="header-mobile">
            {!isSignedIn && (
              <Button variant="contained" startIcon={<LanguageIcon />} onClick={handleLangMenuOpen} disableElevation className="btn-primary">
                {lang?.label}
              </Button>
            )}
            {isSignedIn && (
              <IconButton color="inherit" onClick={handleNotificationsClick}>
                <Badge badgeContent={notificationCount > 0 ? notificationCount : null} color="error">
                  <Bell />
                </Badge>
              </IconButton>
            )}
            {isSignedIn && (
              <IconButton aria-label="show more" aria-controls={mobileMenuId} aria-haspopup="true" onClick={handleMobileMenuOpen} color="inherit">
                <MoreIcon />
              </IconButton>
            )}
          </div>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer - only visible on mobile */}
      <Drawer open={isSideMenuOpen} onClose={handleSideMenuClose} className="menu side-menu mobile-drawer">
        {sidebarContent}
      </Drawer>

      {/* Desktop Fixed Sidebar - only visible on desktop */}
      {isLoaded && isSignedIn && (
        <div className="desktop-sidebar">
          {sidebarContent}
        </div>
      )}

      {renderMobileMenu}
      {renderMenu}
      {renderLanguageMenu}
    </div>
  )
}

export default Header
