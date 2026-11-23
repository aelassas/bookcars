import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Input,
  InputLabel,
  FormHelperText,
  FormControl,
  FormControlLabel,
  Switch,
  Button,
  Paper,
  Box,
  Tabs,
  Tab,
  Chip,
  Typography,
  Divider
} from '@mui/material'
import {
  Person as PersonIcon,
  VerifiedUser as KycIcon,
  Lock as SecurityIcon,
  CheckCircle as VerifiedIcon,
  WarningAmber as WarningIcon,
  Shield as ShieldIcon,
  VpnKey as KeyIcon
} from '@mui/icons-material'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import Layout from '@/components/Layout'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/settings'
import * as UserService from '@/services/UserService'
import Backdrop from '@/components/SimpleBackdrop'
import DatePicker from '@/components/DatePicker'
import Avatar from '@/components/Avatar'
import * as helper from '@/utils/helper'
import DriverLicense from '@/components/DriverLicense'
import Footer from '@/components/Footer'
import { useUserContext, UserContextType } from '@/context/UserContext'
import { schema, FormFields } from '@/models/SettingsForm'

import '@/assets/css/settings.css'

const Settings = () => {
  const navigate = useNavigate()

  const { user, setUser } = useUserContext() as UserContextType
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [enableEmailNotifications, setEnableEmailNotifications] = useState(false)
  const [activeTab, setActiveTab] = useState(0)

  const { register, control, handleSubmit, formState: { errors, isSubmitting }, clearErrors, setValue } = useForm<FormFields>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
  })

  const birthDate = useWatch({ control, name: 'birthDate' })

  const handleEmailNotificationsChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (user && user._id) {
        const _user = bookcarsHelper.clone(user) as bookcarsTypes.User
        setEnableEmailNotifications(e.target.checked)

        _user.enableEmailNotifications = e.target.checked

        const payload: bookcarsTypes.UpdateEmailNotificationsPayload = {
          _id: user._id,
          enableEmailNotifications: _user.enableEmailNotifications
        }
        const status = await UserService.updateEmailNotifications(payload)

        if (status === 200) {
          setUser(_user)
          helper.info(strings.SETTINGS_UPDATED)
        }
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const onBeforeUpload = () => {
    setLoading(true)
  }

  const onAvatarChange = (_user: bookcarsTypes.User) => {
    setUser(_user)
    setLoading(false)
  }

  const onSubmit = async (data: FormFields) => {
    try {
      if (!user || !user._id) {
        return
      }

      const payload: bookcarsTypes.UpdateUserPayload = {
        _id: user._id,
        fullName: data.fullName,
        birthDate: data.birthDate,
        phone: data.phone,
        location: data.location || '',
        bio: data.bio || '',
        cnicNumber: data.cnicNumber || '',
        drivingLicenseNumber: data.drivingLicenseNumber || '',
      }

      const status = await UserService.updateUser(payload)

      if (status === 200) {
        setUser({
          ...user,
          fullName: data.fullName,
          phone: data.phone,
          birthDate: data.birthDate,
          location: data.location || undefined,
          bio: data.bio || undefined,
          cnicNumber: data.cnicNumber || undefined,
          drivingLicenseNumber: data.drivingLicenseNumber || undefined,
          kycStatus: data.cnicNumber ? bookcarsTypes.KycStatus.Pending : bookcarsTypes.KycStatus.Unverified,
        })
        helper.info(strings.SETTINGS_UPDATED)
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const onLoad = (_user?: bookcarsTypes.User) => {
    if (_user) {
      setUser(_user)
      setValue('email', _user.email!)
      setValue('fullName', _user.fullName)
      setValue('phone', _user.phone || '')
      setValue('birthDate', new Date(_user.birthDate!))
      setValue('location', _user.location || '')
      setValue('bio', _user.bio || '')
      setValue('cnicNumber', _user.cnicNumber || '')
      setValue('drivingLicenseNumber', _user.drivingLicenseNumber || '')
      setEnableEmailNotifications(_user.enableEmailNotifications ?? true)
      setVisible(true)
      setLoading(false)
    }
  }

  const isKycVerified = user?.kycStatus === bookcarsTypes.KycStatus.Verified

  return (
    <Layout onLoad={onLoad} strict>
      {visible && user && (
        <>
          <div className="settings" style={{ maxWidth: 960, margin: '0 auto', padding: '32px 16px 64px' }}>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <ShieldIcon sx={{ color: 'var(--sr-emerald)', fontSize: 18 }} />
                <Typography sx={{ color: 'var(--sr-emerald)', fontWeight: 800, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  SafarRent • Account & Trust Settings
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--sr-text, #0B1120)', letterSpacing: '-0.02em', mb: 1 }}>
                Account Settings & KYC Vault
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                Manage your profile, verified Pakistani CNIC identity, driving credentials, and security settings.
              </Typography>
            </Box>

            {/* Tab Navigation */}
            <Paper sx={{ mb: 3, borderRadius: '12px', border: '1px solid var(--sr-border, #E2E8F0)', bgcolor: 'var(--sr-surface, #FFFFFF)', overflow: 'hidden' }} elevation={0}>
              <Tabs
                value={activeTab}
                onChange={(_, val) => setActiveTab(val)}
                textColor="primary"
                indicatorColor="primary"
                sx={{
                  borderBottom: '1px solid var(--sr-border, #E2E8F0)',
                  '& .MuiTabs-indicator': { bgcolor: '#107487', height: 3 },
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: 13,
                    py: 1.5,
                    color: 'text.secondary',
                    '&.Mui-selected': { color: 'var(--sr-emerald)' }
                  }
                }}
              >
                <Tab icon={<PersonIcon fontSize="small" />} iconPosition="start" label="Personal Profile" />
                <Tab
                  icon={<KycIcon fontSize="small" />}
                  iconPosition="start"
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>CNIC & Driving License Vault</span>
                      {isKycVerified ? (
                        <Chip label="Verified ✓" size="small" sx={{ bgcolor: 'rgba(5, 150, 105, 0.12)', color: 'var(--sr-emerald)', fontWeight: 800, fontSize: 10, height: 18 }} />
                      ) : (
                        <Chip label="Verify" size="small" sx={{ bgcolor: 'rgba(217, 119, 6, 0.12)', color: 'var(--sr-accent-text)', fontWeight: 800, fontSize: 10, height: 18 }} />
                      )}
                    </Box>
                  }
                />
                <Tab icon={<SecurityIcon fontSize="small" />} iconPosition="start" label="Security & Password" />
              </Tabs>
            </Paper>

            {/* TAB 0: Personal Profile */}
            {activeTab === 0 && (
              <Paper className="settings-form settings-form-wrapper" sx={{ p: 4, borderRadius: '16px', border: '1px solid var(--sr-border, #E2E8F0)' }} elevation={0}>
                <form onSubmit={handleSubmit(onSubmit)}>
                  <Avatar
                    loggedUser={user}
                    user={user}
                    size="large"
                    readonly={false}
                    onBeforeUpload={onBeforeUpload}
                    onChange={onAvatarChange}
                    color="disabled"
                    className="avatar-ctn"
                  />
                  <FormControl fullWidth margin="dense">
                    <InputLabel className="required">{commonStrings.FULL_NAME}</InputLabel>
                    <Input {...register('fullName')} type="text" required autoComplete="off" />
                  </FormControl>
                  <FormControl fullWidth margin="dense">
                    <InputLabel className="required">{commonStrings.EMAIL}</InputLabel>
                    <Input {...register('email')} type="text" disabled />
                  </FormControl>
                  <FormControl fullWidth margin="dense" error={!!errors.phone}>
                    <InputLabel className="required">{commonStrings.PHONE}</InputLabel>
                    <Input
                      {...register('phone')}
                      type="text"
                      required
                      autoComplete="off"
                      onChange={() => {
                        if (errors.phone) {
                          clearErrors('phone')
                        }
                      }}
                    />
                    <FormHelperText>{errors.phone?.message || ''}</FormHelperText>
                  </FormControl>
                  <FormControl fullWidth margin="dense" error={!!errors.birthDate}>
                    <DatePicker
                      label={commonStrings.BIRTH_DATE}
                      variant="standard"
                      required
                      value={birthDate || undefined}
                      onChange={(date) => {
                        if (date) {
                          if (errors.birthDate) {
                            clearErrors('birthDate')
                          }
                          setValue('birthDate', date, { shouldValidate: true })
                        }
                      }}
                      language={user.language}
                    />
                    <FormHelperText>{errors.birthDate?.message || ''}</FormHelperText>
                  </FormControl>
                  <FormControl fullWidth margin="dense">
                    <InputLabel>{commonStrings.LOCATION}</InputLabel>
                    <Input {...register('location')} type="text" autoComplete="off" />
                  </FormControl>
                  <FormControl fullWidth margin="dense">
                    <InputLabel>{commonStrings.BIO}</InputLabel>
                    <Input {...register('bio')} type="text" autoComplete="off" />
                  </FormControl>

                  {/* Notification preference */}
                  <Box sx={{ mt: 2, mb: 1, p: 2, bgcolor: 'var(--sr-surface-raised, #F8FAFC)', borderRadius: '10px' }}>
                    <FormControlLabel
                      control={<Switch checked={enableEmailNotifications} onChange={handleEmailNotificationsChange} color="primary" />}
                      label={strings.SETTINGS_EMAIL_NOTIFICATIONS}
                    />
                  </Box>

                  <div className="buttons" style={{ marginTop: 24 }}>
                    <Button
                      type="submit"
                      variant="contained"
                      className="btn-primary"
                      disabled={isSubmitting}
                      sx={{ bgcolor: '#107487', '&:hover': { bgcolor: '#047857' }, fontWeight: 700, px: 3, textTransform: 'none', borderRadius: '8px' }}
                    >
                      {commonStrings.SAVE}
                    </Button>
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={(e) => {
                        e.preventDefault()
                        navigate('/')
                      }}
                      sx={{ textTransform: 'none', borderRadius: '8px', ml: 1 }}
                    >
                      {commonStrings.CANCEL}
                    </Button>
                  </div>
                </form>
              </Paper>
            )}

            {/* TAB 1: CNIC & Driving License KYC Vault */}
            {activeTab === 1 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Status Alert Banner */}
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: '12px',
                    bgcolor: isKycVerified ? 'rgba(5, 150, 105, 0.08)' : 'rgba(217, 119, 6, 0.08)',
                    border: `1px solid ${isKycVerified ? 'rgba(5, 150, 105, 0.25)' : 'rgba(217, 119, 6, 0.25)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2
                  }}
                >
                  {isKycVerified ? <VerifiedIcon sx={{ color: 'var(--sr-emerald)', fontSize: 28 }} /> : <WarningIcon sx={{ color: 'var(--sr-accent-text)', fontSize: 28 }} />}
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isKycVerified ? 'var(--sr-emerald)' : 'var(--sr-accent-text)' }}>
                      {isKycVerified ? 'CNIC Identity & Self-Drive Verified' : 'KYC Verification In Progress'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {isKycVerified
                        ? 'Your Pakistani CNIC and Driving License are approved for instant key handover with zero blank cheques.'
                        : 'Submit your 13-digit Pakistani CNIC and license below for admin dispatch clearance.'}
                    </Typography>
                  </Box>
                </Box>

                {/* Form Card for CNIC & License Numbers */}
                <Paper className="settings-form settings-form-wrapper" sx={{ p: 4, borderRadius: '16px', border: '1px solid var(--sr-border, #E2E8F0)' }} elevation={0}>
                  <form onSubmit={handleSubmit(onSubmit)}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                      Identification Numbers
                    </Typography>
                    <FormControl fullWidth margin="dense" error={!!errors.cnicNumber}>
                      <InputLabel>CNIC Number (12345-1234567-1)</InputLabel>
                      <Input {...register('cnicNumber')} type="text" autoComplete="off" />
                      <FormHelperText>{errors.cnicNumber?.message || `Current status: ${user.kycStatus || bookcarsTypes.KycStatus.Unverified}`}</FormHelperText>
                    </FormControl>
                    <FormControl fullWidth margin="dense" error={!!errors.drivingLicenseNumber} sx={{ mt: 2 }}>
                      <InputLabel>Driving License Number</InputLabel>
                      <Input {...register('drivingLicenseNumber')} type="text" autoComplete="off" />
                      <FormHelperText>{errors.drivingLicenseNumber?.message || 'Required for self-drive bookings.'}</FormHelperText>
                    </FormControl>

                    <Button
                      type="submit"
                      variant="contained"
                      className="btn-primary"
                      disabled={isSubmitting}
                      sx={{ mt: 3, bgcolor: '#107487', '&:hover': { bgcolor: '#047857' }, fontWeight: 700, textTransform: 'none', borderRadius: '8px' }}
                    >
                      Update Identity Numbers
                    </Button>
                  </form>
                </Paper>

                {/* Document Upload Dropzones */}
                <Paper className="settings-form settings-form-wrapper" sx={{ p: 4, borderRadius: '16px', border: '1px solid var(--sr-border, #E2E8F0)' }} elevation={0}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                    {commonStrings.DRIVER_LICENSE} & Smart Card Upload
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    Upload clear photos of the front and back of your official license card (JPEG or PNG).
                  </Typography>
                  <DriverLicense user={user} />
                </Paper>
              </Box>
            )}

            {/* TAB 2: Security & Password */}
            {activeTab === 2 && (
              <Paper className="settings-form settings-form-wrapper" sx={{ p: 4, borderRadius: '16px', border: '1px solid var(--sr-border, #E2E8F0)' }} elevation={0}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <KeyIcon sx={{ color: 'var(--sr-emerald)', fontSize: 24 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Account Security & Credentials
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Keep your account safe by updating your password regularly. Never share your password or OTP tokens with anyone.
                </Typography>

                <Box sx={{ p: 2.5, borderRadius: '10px', bgcolor: 'var(--sr-surface-raised, #F8FAFC)', border: '1px solid var(--sr-border, #E2E8F0)', mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                    Change Master Password
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    You will be asked to enter your current password and choose a strong new one.
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => navigate('/change-password')}
                    sx={{
                      bgcolor: '#107487',
                      '&:hover': { bgcolor: '#047857' },
                      fontWeight: 700,
                      fontSize: 13,
                      textTransform: 'none',
                      borderRadius: '8px'
                    }}
                  >
                    Change Password
                  </Button>
                </Box>
              </Paper>
            )}
          </div>

          <Footer />
        </>
      )}
      {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
    </Layout>
  )
}

export default Settings
