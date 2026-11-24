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
  List,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  ListSubheader,
  Divider,
  Box,
  Chip,
  Tooltip
} from '@mui/material'
import {
  Menu as MenuIcon,
  Mail as MailIcon,
  Notifications as NotificationsIcon,
  More as MoreIcon,
  Language as LanguageIcon,
  Settings as SettingsIcon,
  Dashboard as DashboardIcon,
  CorporateFare as SuppliersIcon,
  LocationOn as LocationsIcon,
  DirectionsCar as CarsIcon,
  People as UsersIcon,
  InfoTwoTone as AboutIcon,
  DescriptionTwoTone as TosIcon,
  ExitToApp as SignoutIcon,
  CalendarMonth as SchedulerIcon,
  AccountBalance as BankDetailsIcon,
  MonetizationOn as PricingIcon,
  AutoAwesome as AIIcon,
  Assessment as OperationsIcon,
  Build as MaintenanceIcon,
  FolderShared as DocumentsIcon,
  Add as AddIcon,
  ChevronLeft as ChevronLeftIcon
} from '@mui/icons-material'
import { useNavigate, useLocation } from 'react-router-dom'
import * as bookcarsTypes from ':bookcars-types'
import env from '@/config/env.config'
import { strings } from '@/lang/header'
import { strings as commonStrings } from '@/lang/common'
import * as UserService from '@/services/UserService'
import SafarRentLogo from '@/components/SafarRentLogo'
import RoleSwitchNav from '@/components/RoleSwitchNav'
import ThemeToggle from '@/components/ThemeToggle'
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
  const location = useLocation()

  const { user } = useUserContext() as UserContextType
  const { notificationCount } = useNotificationContext() as NotificationContextType

  const [currentUser, setCurrentUser] = useState<bookcarsTypes.User>()
  const [lang, setLang] = useState(helper.getLanguage(env.DEFAULT_LANGUAGE))
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [langAnchorEl, setLangAnchorEl] = useState<HTMLElement | null>(null)
  const [mobileMoreAnchorEl, setMobileMoreAnchorEl] = useState<HTMLElement | null>(null)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [bankDetails, setBankDetails] = useState<bookcarsTypes.BankDetails | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1200 : true)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1200 && sidebarOpen) {
        setSidebarOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [sidebarOpen])

  useEffect(() => {
    if (sidebarOpen && isSignedIn && window.innerWidth >= 1200) {
      document.body.classList.add('admin-sidebar-open')
    } else {
      document.body.classList.remove('admin-sidebar-open')
    }
    return () => {
      document.body.classList.remove('admin-sidebar-open')
    }
  }, [sidebarOpen, isSignedIn])

  const isMenuOpen = Boolean(anchorEl)
  const isMobileMenuOpen = Boolean(mobileMoreAnchorEl)
  const isLangMenuOpen = Boolean(langAnchorEl)

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
    navigate(0)
  }

  const handleLangMenuClose = async (event: React.MouseEvent<HTMLElement>) => {
    setLangAnchorEl(null)

    const { code } = event.currentTarget.dataset
    if (code) {
      setLang(helper.getLanguage(code))
      const currentLang = UserService.getLanguage()
      if (isSignedIn && user) {
        const data: bookcarsTypes.UpdateLanguagePayload = {
          id: user._id as string,
          language: code,
        }
        const status = await UserService.updateLanguage(data)
        if (status === 200) {
          UserService.setLanguage(code)
          if (code && code !== currentLang) {
            refreshPage()
          }
        } else {
          toast(commonStrings.CHANGE_LANGUAGE_ERROR, { type: 'error' })
        }
      } else {
        UserService.setLanguage(code)
        if (code && code !== currentLang) {
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

  const handleToggleSidebar = () => {
    if (window.innerWidth < 1200) {
      setMobileDrawerOpen(!mobileDrawerOpen)
    } else {
      setSidebarOpen(!sidebarOpen)
    }
  }

  const handleNavClick = (path: string) => {
    navigate(path)
    if (window.innerWidth < 1200) {
      setMobileDrawerOpen(false)
    }
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

  const isCurrent = (path: string) => {
    if (path === '/' && location.pathname === '/') {
return true
}
    if (path !== '/' && location.pathname.startsWith(path)) {
return true
}
    return false
  }

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
      <MenuItem
        onClick={() => {
          handleMenuClose()
          navigate('/ai-intake')
        }}
      >
        <AIIcon className="header-action" />
        <Typography>AI Booking Intake</Typography>
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

  const renderSidebarContent = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'var(--sr-surface)', color: 'var(--sr-text)' }}>
      {/* Brand Header */}
      <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box onClick={() => handleNavClick('/')} sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <SafarRentLogo variant="dark" size="small" showBadge={false} />
          </Box>
          {window.innerWidth < 1200 && (
            <IconButton onClick={() => setMobileDrawerOpen(false)} sx={{ color: 'var(--sr-muted)' }} size="small">
              <ChevronLeftIcon />
            </IconButton>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={currentUser?.type === bookcarsTypes.UserType.Admin ? 'SUPER ADMIN' : 'FLEET PARTNER'}
            size="small"
            sx={{
              bgcolor: '#107487',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: 10,
              letterSpacing: '0.06em',
              fontFamily: 'var(--sr-font-mono, monospace)',
              height: 20
            }}
          />
          <Chip
            label="PKR CONSOLE"
            size="small"
            variant="outlined"
            sx={{
              borderColor: 'rgba(255, 255, 255, 0.2)',
              color: 'var(--sr-muted)',
              fontSize: 9,
              letterSpacing: '0.06em',
              fontFamily: 'var(--sr-font-mono, monospace)',
              height: 20
            }}
          />
        </Box>
      </Box>

      {/* Nav List */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', py: 1.5, px: 1 }}>
        <List dense disablePadding>
          {/* Group 1: Operations */}
          <ListSubheader disableSticky sx={{ bgcolor: 'transparent', color: 'var(--sr-muted)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', px: 1.5, pt: 1, pb: 0.5 }}>
            Operations
          </ListSubheader>

          <ListItemButton
            selected={isCurrent('/operations-dashboard')}
            onClick={() => handleNavClick('/operations-dashboard')}
            sx={sidebarItemStyle(isCurrent('/operations-dashboard'))}
          >
            <ListItemIcon sx={{ minWidth: 36, color: isCurrent('/operations-dashboard') ? '#E8890C' : '#94A3B8' }}>
              <OperationsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Command Center" primaryTypographyProps={{ fontSize: 13, fontWeight: isCurrent('/operations-dashboard') ? 700 : 500 }} />
          </ListItemButton>

          <ListItemButton
            selected={isCurrent('/scheduler')}
            onClick={() => handleNavClick('/scheduler')}
            sx={sidebarItemStyle(isCurrent('/scheduler'))}
          >
            <ListItemIcon sx={{ minWidth: 36, color: isCurrent('/scheduler') ? '#E8890C' : '#94A3B8' }}>
              <SchedulerIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Live Scheduler" primaryTypographyProps={{ fontSize: 13, fontWeight: isCurrent('/scheduler') ? 700 : 500 }} />
          </ListItemButton>

          <ListItemButton
            selected={isCurrent('/')}
            onClick={() => handleNavClick('/')}
            sx={sidebarItemStyle(isCurrent('/'))}
          >
            <ListItemIcon sx={{ minWidth: 36, color: isCurrent('/') ? '#E8890C' : '#94A3B8' }}>
              <DashboardIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="All Bookings" primaryTypographyProps={{ fontSize: 13, fontWeight: isCurrent('/') ? 700 : 500 }} />
          </ListItemButton>

          <Divider sx={{ my: 1.5, borderColor: 'rgba(255, 255, 255, 0.08)' }} />

          {/* Group 2: Fleet & AI */}
          <ListSubheader disableSticky sx={{ bgcolor: 'transparent', color: 'var(--sr-muted)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', px: 1.5, pt: 0.5, pb: 0.5 }}>
            Fleet & AI
          </ListSubheader>

          <ListItemButton
            selected={isCurrent('/cars')}
            onClick={() => handleNavClick('/cars')}
            sx={sidebarItemStyle(isCurrent('/cars'))}
          >
            <ListItemIcon sx={{ minWidth: 36, color: isCurrent('/cars') ? '#E8890C' : '#94A3B8' }}>
              <CarsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Vehicle Fleet" primaryTypographyProps={{ fontSize: 13, fontWeight: isCurrent('/cars') ? 700 : 500 }} />
          </ListItemButton>

          <ListItemButton
            selected={isCurrent('/ai-intake')}
            onClick={() => handleNavClick('/ai-intake')}
            sx={sidebarItemStyle(isCurrent('/ai-intake'), true)}
          >
            <ListItemIcon sx={{ minWidth: 36, color: '#F59E0B' }}>
              <AIIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="✨ AI Fleet Intake" primaryTypographyProps={{ fontSize: 13, fontWeight: isCurrent('/ai-intake') ? 700 : 600, color: 'var(--sr-accent-text)' }} />
          </ListItemButton>

          <ListItemButton
            selected={isCurrent('/maintenance')}
            onClick={() => handleNavClick('/maintenance')}
            sx={sidebarItemStyle(isCurrent('/maintenance'))}
          >
            <ListItemIcon sx={{ minWidth: 36, color: isCurrent('/maintenance') ? '#E8890C' : '#94A3B8' }}>
              <BuildIconSmall />
            </ListItemIcon>
            <ListItemText primary="Maintenance Logs" primaryTypographyProps={{ fontSize: 13, fontWeight: isCurrent('/maintenance') ? 700 : 500 }} />
          </ListItemButton>

          <ListItemButton
            selected={isCurrent('/vehicle-documents')}
            onClick={() => handleNavClick('/vehicle-documents')}
            sx={sidebarItemStyle(isCurrent('/vehicle-documents'))}
          >
            <ListItemIcon sx={{ minWidth: 36, color: isCurrent('/vehicle-documents') ? '#E8890C' : '#94A3B8' }}>
              <DocumentsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Smart Card Vault" primaryTypographyProps={{ fontSize: 13, fontWeight: isCurrent('/vehicle-documents') ? 700 : 500 }} />
          </ListItemButton>

          <Divider sx={{ my: 1.5, borderColor: 'rgba(255, 255, 255, 0.08)' }} />

          {/* Group 3: Network & Finance */}
          <ListSubheader disableSticky sx={{ bgcolor: 'transparent', color: 'var(--sr-muted)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', px: 1.5, pt: 0.5, pb: 0.5 }}>
            Network & Finance
          </ListSubheader>

          <ListItemButton
            selected={isCurrent('/locations')}
            onClick={() => handleNavClick('/locations')}
            sx={sidebarItemStyle(isCurrent('/locations'))}
          >
            <ListItemIcon sx={{ minWidth: 36, color: isCurrent('/locations') ? '#E8890C' : '#94A3B8' }}>
              <LocationsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Pickup Hubs" primaryTypographyProps={{ fontSize: 13, fontWeight: isCurrent('/locations') ? 700 : 500 }} />
          </ListItemButton>

          <ListItemButton
            selected={isCurrent('/suppliers')}
            onClick={() => handleNavClick('/suppliers')}
            sx={sidebarItemStyle(isCurrent('/suppliers'))}
          >
            <ListItemIcon sx={{ minWidth: 36, color: isCurrent('/suppliers') ? '#E8890C' : '#94A3B8' }}>
              <SuppliersIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Fleet Suppliers" primaryTypographyProps={{ fontSize: 13, fontWeight: isCurrent('/suppliers') ? 700 : 500 }} />
          </ListItemButton>

          <ListItemButton
            selected={isCurrent('/pricing')}
            onClick={() => handleNavClick('/pricing')}
            sx={sidebarItemStyle(isCurrent('/pricing'))}
          >
            <ListItemIcon sx={{ minWidth: 36, color: isCurrent('/pricing') ? '#E8890C' : '#94A3B8' }}>
              <PricingIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Dynamic PKR Pricing" primaryTypographyProps={{ fontSize: 13, fontWeight: isCurrent('/pricing') ? 700 : 500 }} />
          </ListItemButton>

          {bankDetails?.showBankDetailsPage && (
            <ListItemButton
              selected={isCurrent('/bank-details')}
              onClick={() => handleNavClick('/bank-details')}
              sx={sidebarItemStyle(isCurrent('/bank-details'))}
            >
              <ListItemIcon sx={{ minWidth: 36, color: isCurrent('/bank-details') ? '#E8890C' : '#94A3B8' }}>
                <BankDetailsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Payout Bank Details" primaryTypographyProps={{ fontSize: 13, fontWeight: isCurrent('/bank-details') ? 700 : 500 }} />
            </ListItemButton>
          )}

          <ListItemButton
            selected={isCurrent('/users')}
            onClick={() => handleNavClick('/users')}
            sx={sidebarItemStyle(isCurrent('/users'))}
          >
            <ListItemIcon sx={{ minWidth: 36, color: isCurrent('/users') ? '#E8890C' : '#94A3B8' }}>
              <UsersIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Renters & KYC" primaryTypographyProps={{ fontSize: 13, fontWeight: isCurrent('/users') ? 700 : 500 }} />
          </ListItemButton>

          <ListItemButton
            selected={isCurrent('/settings')}
            onClick={() => handleNavClick('/settings')}
            sx={sidebarItemStyle(isCurrent('/settings'))}
          >
            <ListItemIcon sx={{ minWidth: 36, color: isCurrent('/settings') ? '#E8890C' : '#94A3B8' }}>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Console Settings" primaryTypographyProps={{ fontSize: 13, fontWeight: isCurrent('/settings') ? 700 : 500 }} />
          </ListItemButton>
        </List>
      </Box>

      {/* Footer Utility links */}
      <Box sx={{ p: 1.5, borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1 }}>
          <Button size="small" onClick={() => handleNavClick('/about')} sx={{ color: 'var(--sr-muted)', fontSize: 11, minWidth: 'auto', p: 0.5, textTransform: 'none' }}>
            About
          </Button>
          <Button size="small" onClick={() => handleNavClick('/tos')} sx={{ color: 'var(--sr-muted)', fontSize: 11, minWidth: 'auto', p: 0.5, textTransform: 'none' }}>
            Terms
          </Button>
          <Button size="small" onClick={() => handleNavClick('/contact')} sx={{ color: 'var(--sr-muted)', fontSize: 11, minWidth: 'auto', p: 0.5, textTransform: 'none' }}>
            Contact
          </Button>
          <Button size="small" onClick={handleSignout} sx={{ color: '#F87171', fontSize: 11, minWidth: 'auto', p: 0.5, textTransform: 'none' }}>
            Sign Out
          </Button>
        </Box>
      </Box>
    </Box>
  )

  return !hidden && (
    <>
      {/* Desktop Persistent Sidebar */}
      {isLoaded && isSignedIn && sidebarOpen && (
        <aside className="admin-sidebar">
          {renderSidebarContent()}
        </aside>
      )}

      {/* Mobile / Collapsed Drawer */}
      <Drawer
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        className="menu side-menu"
        PaperProps={{
          sx: { width: 260, bgcolor: 'var(--sr-surface)', color: 'var(--sr-text)' }
        }}
      >
        {renderSidebarContent()}
      </Drawer>

      {/* Top Utility Bar */}
      <AppBar
        position="fixed"
        className="admin-topbar"
        sx={{
          bgcolor: 'var(--sr-header, #FFFFFF)',
          color: 'var(--sr-text, #0F172A)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          borderBottom: '1px solid var(--sr-border, #E2E8F0)'
        }}
      >
        <Toolbar className="toolbar" sx={{ minHeight: 64, px: { xs: 2, sm: 3 } }}>
          {/* Hamburger toggle */}
          {isLoaded && isSignedIn && (
            <IconButton
              edge="start"
              color="inherit"
              aria-label="toggle sidebar"
              onClick={handleToggleSidebar}
              sx={{ mr: 1.5, color: 'var(--sr-text)' }}
            >
              <MenuIcon />
            </IconButton>
          )}

          {/* Logo fallback for when sidebar is collapsed or mobile */}
          {(!sidebarOpen || !isSignedIn) && (
            <Box className="admin-topbar-brand" onClick={() => navigate('/')} sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', mr: 2 }}>
              <SafarRentLogo variant="dark" size="small" badgeText="CONSOLE" />
            </Box>
          )}

          {/* Quick Context Title on large screens */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--sr-text)', letterSpacing: '-0.01em' }}>
              Rental Management
            </Typography>
            <Chip
              label="Operations"
              size="small"
              sx={{
                bgcolor: 'rgba(5, 150, 105, 0.1)',
                color: 'var(--sr-emerald)',
                fontWeight: 600,
                fontSize: 11,
                height: 22
              }}
            />
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          {/* Right Utility Actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {/* Quick "+ Add Vehicle" CTA Button */}
            {isSignedIn && (
              <Button
                variant="contained"
                size="small"
                className="admin-add-vehicle" aria-label="Add vehicle" startIcon={<AddIcon />}
                onClick={() => navigate('/create-car')}
                sx={{
                  bgcolor: '#171717',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: 13,
                  textTransform: 'none',
                  borderRadius: '8px',
                  boxShadow: 'none',
                  px: 1.8,
                  py: 0.6,
                  '&:hover': {
                    bgcolor: '#000000',
                    boxShadow: 'none'
                  }
                }}
              >
                Add Vehicle
              </Button>
            )}

            <RoleSwitchNav />

            <ThemeToggle />

            {/* Notifications */}
            {isSignedIn && (
              <Tooltip title="Notifications">
                <IconButton aria-label="notifications" color="inherit" onClick={handleNotificationsClick} size="small" sx={{ p: 1 }}>
                  <Badge badgeContent={notificationCount > 0 ? notificationCount : null} color="error">
                    <NotificationsIcon fontSize="small" />
                  </Badge>
                </IconButton>
              </Tooltip>
            )}

            {/* Language Selector */}
            <Button
              variant="outlined"
              size="small"
              startIcon={<LanguageIcon fontSize="small" />}
              onClick={handleLangMenuOpen}
              sx={{
                borderColor: 'var(--sr-border, #CBD5E1)',
                color: 'var(--sr-text, #334155)',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: 12,
                borderRadius: '8px',
                height: 32,
                display: { xs: 'none', sm: 'inline-flex' }
              }}
            >
              {lang?.label}
            </Button>

            {/* User Avatar & Menu */}
            {isSignedIn && user && (
              <IconButton edge="end" aria-label="account" aria-controls={menuId} aria-haspopup="true" onClick={handleAccountMenuOpen} color="inherit" sx={{ ml: 0.5 }}>
                <Avatar record={user} type={user.type} size="small" readonly />
              </IconButton>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {renderMobileMenu}
      {renderMenu}
      {renderLanguageMenu}
    </>
  )
}

function BuildIconSmall() {
  return <MaintenanceIcon fontSize="small" />
}

function sidebarItemStyle(selected: boolean, isAi: boolean = false) {
  if (selected) {
    return {
      mb: 0.5,
      borderRadius: '8px',
      bgcolor: 'rgba(255, 166, 43, 0.18)',
      color: 'var(--sr-accent-text)',
      borderLeft: '3px solid #FFA62B',
      '&:hover': {
        bgcolor: isAi ? 'rgba(245, 158, 11, 0.22)' : 'rgba(5, 150, 105, 0.22)',
      }
    }
  }
  return {
    mb: 0.5,
    borderRadius: '8px',
    color: 'var(--sr-text)',
    borderLeft: '3px solid transparent',
    '&:hover': {
      bgcolor: 'rgba(255, 255, 255, 0.05)',
      color: 'var(--sr-text)'
    }
  }
}

export default Header
