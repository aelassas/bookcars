import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Typography,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Link,
  Chip,
  Box,
  Grid,
  Avatar as MuiAvatar,
  Divider,
  Stack,
} from '@mui/material'
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  DirectionsCar as CarIcon,
  VerifiedUser as VerifiedIcon,
  GppMaybe as UnverifiedIcon,
  Person as PersonIcon,
} from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings as ulStrings } from '@/lang/user-list'
import * as UserService from '@/services/UserService'
import * as helper from '@/utils/helper'
import Layout from '@/components/Layout'
import Backdrop from '@/components/SimpleBackdrop'
import Avatar from '@/components/Avatar'
import BookingList from '@/components/BookingList'
import NoMatch from './NoMatch'
import * as SupplierService from '@/services/SupplierService'

import '@/assets/css/user.css'

// ── Design tokens ──────────────────────────────────────────────
const EMERALD = '#107487'
const GOLD = '#995000'
const OBSIDIAN = '#0F172A'
const CRIMSON = '#DC2626'
const CANVAS = 'var(--sr-ink)'

const cardStyle = {
  backgroundColor: 'var(--sr-surface)',
  borderRadius: '16px',
  border: '1px solid #E2E8F0',
  padding: '24px',
}

const sectionHeaderSx = {
  color: 'var(--sr-emerald)',
  fontWeight: 600,
  fontSize: 13,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  mb: 2,
}

const monoFont = { fontFamily: '"JetBrains Mono", "Fira Mono", monospace' }

const getRoleBadge = (type?: string) => {
  if (type === bookcarsTypes.RecordType.Admin) {
return { label: 'Admin', bg: OBSIDIAN, color: '#fff' }
}
  if (type === bookcarsTypes.RecordType.Supplier) {
return { label: 'Supplier', bg: GOLD, color: '#fff' }
}
  return { label: 'Customer', bg: EMERALD, color: '#fff' }
}

const maskCnic = (cnic?: string) => {
  if (!cnic) {
return 'XXXXX-XXXXXXX-X'
}
  const digits = cnic.replace(/\D/g, '')
  if (digits.length !== 13) {
return cnic
}
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`
}

const User = () => {
  const navigate = useNavigate()

  const statuses = helper.getBookingStatuses().map((status) => status.value)

  const [loggedUser, setLoggedUser] = useState<bookcarsTypes.User>()
  const [user, setUser] = useState<bookcarsTypes.User>()
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [noMatch, setNoMatch] = useState(false)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [suppliers, setSuppliers] = useState<string[]>([])
  const [offset, setOffset] = useState(0)
  const [kycSaving, setKycSaving] = useState(false)

  const setKycStatus = async (status: bookcarsTypes.KycStatus) => {
    if (!user?._id) {
return
}
    setKycSaving(true)
    try {
      const result = await UserService.updateKycStatus(user._id, status)
      setUser({ ...user, kycStatus: result.kycStatus })
      helper.info(`KYC status set to ${result.kycStatus}.`)
    } catch (err) {
      helper.error(err)
    } finally {
      setKycSaving(false)
    }
  }

  useEffect(() => {
    if (visible) {
      const col1 = document.querySelector('.col-1')
      if (col1) {
        setOffset(col1.clientHeight)
      }
    }
  }, [visible])

  const onBeforeUpload = () => {
    setLoading(true)
  }

  const onAvatarChange = () => {
    setLoading(false)
  }

  const handleDelete = () => {
    setOpenDeleteDialog(true)
  }

  const handleConfirmDelete = async () => {
    try {
      if (user) {
        setOpenDeleteDialog(false)

        const status = await UserService.deleteUsers([user._id as string])

        if (status === 200) {
          navigate('/users')
        } else {
          helper.error()
          setLoading(false)
        }
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const handleCancelDelete = () => {
    setOpenDeleteDialog(false)
  }

  const onLoad = async (_loggedUser?: bookcarsTypes.User) => {
    if (_loggedUser && _loggedUser.verified) {
      setLoading(true)

      const params = new URLSearchParams(window.location.search)
      if (params.has('u')) {
        const id = params.get('u')
        if (id && id !== '') {
          try {
            const _user = await UserService.getUser(id)

            if (_user) {
              const setState = (_suppliers: string[]) => {
                setSuppliers(_suppliers)
                setLoggedUser(_loggedUser)
                setUser(_user)
                setVisible(true)
                setLoading(false)
              }

              const admin = helper.admin(_loggedUser)
              if (admin) {
                const _suppliers = await SupplierService.getAllSuppliers()
                const supplierIds = bookcarsHelper.flattenSuppliers(_suppliers)
                setState(supplierIds)
              } else {
                setState([_loggedUser._id as string])
              }
            } else {
              setLoading(false)
              setNoMatch(true)
            }
          } catch (err) {
            helper.error(err)
            setLoading(false)
            setVisible(false)
          }
        } else {
          setLoading(false)
          setNoMatch(true)
        }
      } else {
        setLoading(false)
        setNoMatch(true)
      }
    }
  }

  const edit = loggedUser && user && (loggedUser.type === bookcarsTypes.RecordType.Admin || loggedUser._id === user._id || (loggedUser.type === bookcarsTypes.RecordType.Supplier && loggedUser._id === user.supplier))
  const supplier = user && user.type === bookcarsTypes.RecordType.Supplier

  let _suppliers: string[] = []
  if (loggedUser && user) {
    if ((supplier && loggedUser._id === user._id)
      || (loggedUser.type === bookcarsTypes.RecordType.Admin && user.type === bookcarsTypes.RecordType.Supplier)
    ) {
      _suppliers = [user._id as string]
    } else if (loggedUser.type === bookcarsTypes.RecordType.Supplier && user.type === bookcarsTypes.RecordType.User) {
      _suppliers = [loggedUser._id as string]
    } else if (loggedUser.type === bookcarsTypes.RecordType.Admin) {
      _suppliers = suppliers
    }
  }

  const roleBadge = getRoleBadge(user?.type)
  const kycVerified = user?.kycStatus === bookcarsTypes.KycStatus.Verified

  return (
    <Layout onLoad={onLoad} strict>
      {loggedUser && user && visible && (
        <Box sx={{ background: CANVAS, minHeight: '100vh', p: { xs: 2, md: 3 } }}>
          {/* Profile Header */}
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'var(--sr-text)', mb: 3, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            User Profile
          </Typography>

          {/* 2-column profile card */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {/* Left column – identity */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ ...cardStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 1 }}>
                {/* Avatar 80px */}
                <Box sx={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', border: `3px solid ${EMERALD}`, flexShrink: 0 }}>
                  <Avatar
                    record={user}
                    type={user.type}
                    mode="update"
                    size="large"
                    hideDelete
                    onBeforeUpload={onBeforeUpload}
                    onChange={onAvatarChange}
                    color="disabled"
                    className={supplier ? 'supplier-avatar' : 'user-avatar'}
                    readonly
                    verified
                  />
                </Box>

                {/* Name */}
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--sr-text)', mt: 1 }}>
                  {user.fullName}
                </Typography>

                {/* Role badge */}
                <Chip
                  label={roleBadge.label}
                  size="small"
                  sx={{ background: roleBadge.bg, color: roleBadge.color, fontWeight: 700, fontSize: 11 }}
                />

                {/* Joined date */}
                {(user as any).createdAt && (
                  <Typography variant="caption" sx={{ color: 'var(--sr-muted)' }}>
                    Joined {new Date((user as any).createdAt).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </Typography>
                )}

                {/* Bio/location */}
                {user.bio && (
                  <Typography variant="body2" sx={{ color: 'var(--sr-muted)', mt: 1 }}>{user.bio}</Typography>
                )}
                {user.location && (
                  <Typography variant="body2" sx={{ color: 'var(--sr-muted)' }}>📍 {user.location}</Typography>
                )}

                <Divider sx={{ width: '100%', my: 1.5 }} />

                {/* Action buttons */}
                <Stack direction="row" spacing={1} justifyContent="center">
                  {edit && (
                    <Tooltip title={commonStrings.UPDATE}>
                      <IconButton
                        onClick={() => navigate(`/update-user?u=${user._id}`)}
                        sx={{ backgroundColor: 'var(--sr-surface-raised)', color: 'var(--sr-emerald)', '&:hover': { background: 'var(--sr-emerald-soft)' } }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {edit && (
                    <Tooltip title={commonStrings.DELETE}>
                      <IconButton
                        data-id={user._id}
                        onClick={handleDelete}
                        sx={{ background: '#FEF2F2', color: CRIMSON, '&:hover': { background: 'var(--sr-surface-raised)' } }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="View Bookings">
                    <IconButton
                      sx={{ background: '#EFF6FF', color: '#3B82F6', '&:hover': { background: '#DBEAFE' } }}
                    >
                      <CarIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>
            </Grid>

            {/* Right column – details */}
            <Grid size={{ xs: 12, md: 8 }}>
              <Box sx={cardStyle}>
                <Typography sx={sectionHeaderSx}>Account Details</Typography>

                <Grid container spacing={2}>
                  {/* Email */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" sx={{ color: 'var(--sr-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email</Typography>
                    <Typography variant="body2" sx={{ color: 'var(--sr-text)', mt: 0.5 }}>{user.email}</Typography>
                  </Grid>

                  {/* Phone */}
                  {user.phone && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="caption" sx={{ color: 'var(--sr-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Phone</Typography>
                      <Typography variant="body2" sx={{ color: 'var(--sr-text)', mt: 0.5 }}>{user.phone}</Typography>
                    </Grid>
                  )}

                  {/* CNIC – JetBrains Mono masked */}
                  {user.type === bookcarsTypes.RecordType.User && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="caption" sx={{ color: 'var(--sr-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>CNIC</Typography>
                      <Typography variant="body2" sx={{ ...monoFont, color: 'var(--sr-text)', mt: 0.5, fontSize: 13 }}>
                        {maskCnic(user.cnicNumber)}
                      </Typography>
                    </Grid>
                  )}

                  {/* KYC Status chip */}
                  {user.type === bookcarsTypes.RecordType.User && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="caption" sx={{ color: 'var(--sr-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>KYC Status</Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Chip
                          icon={kycVerified ? <VerifiedIcon sx={{ fontSize: 14 }} /> : <UnverifiedIcon sx={{ fontSize: 14 }} />}
                          label={kycVerified ? 'Verified ✓' : user.kycStatus || 'Unverified'}
                          size="small"
                          sx={{
                            background: kycVerified ? 'var(--sr-emerald-soft)' : 'var(--sr-gold-soft)',
                            color: kycVerified ? 'var(--sr-emerald)' : 'var(--sr-accent-text)',
                            fontWeight: 700,
                            fontSize: 11,
                            '& .MuiChip-icon': { color: kycVerified ? 'var(--sr-emerald)' : 'var(--sr-accent-text)' },
                          }}
                        />
                      </Box>
                    </Grid>
                  )}

                  {/* License */}
                  {user.license && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="caption" sx={{ color: 'var(--sr-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Driving License</Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Chip
                          label="License ✓"
                          size="small"
                          sx={{ background: 'var(--sr-emerald-soft)', color: 'var(--sr-emerald)', fontWeight: 700, fontSize: 11 }}
                        />
                        <Box sx={{ mt: 0.5 }}>
                          <Link href={bookcarsHelper.joinURL(env.CDN_LICENSES, user.license)} target="_blank" sx={{ fontSize: 12, color: 'var(--sr-emerald)' }}>
                            {commonStrings.LICENSE}
                          </Link>
                        </Box>
                      </Box>
                    </Grid>
                  )}
                </Grid>

                {/* KYC section for User type */}
                {user.type === bookcarsTypes.RecordType.User && (
                  <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #E2E8F0' }}>
                    <Typography sx={sectionHeaderSx}>KYC Verification</Typography>
                    <Typography variant="body2" sx={{ color: 'var(--sr-muted)', mb: 1 }}>
                      Driving License No: <span style={{ ...monoFont, fontSize: 13 }}>{user.drivingLicenseNumber || 'Not provided'}</span>
                    </Typography>

                    {loggedUser.type === bookcarsTypes.RecordType.Admin && (
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Button
                          size="small"
                          disabled={kycSaving}
                          onClick={() => setKycStatus(bookcarsTypes.KycStatus.Pending)}
                          sx={{ borderRadius: 2, textTransform: 'none', background: 'var(--sr-gold-soft)', color: 'var(--sr-accent-text)', fontWeight: 600, '&:hover': { background: '#FDE68A' } }}
                        >
                          Mark Pending
                        </Button>
                        <Button
                          size="small"
                          disabled={kycSaving}
                          onClick={() => setKycStatus(bookcarsTypes.KycStatus.Verified)}
                          sx={{ borderRadius: 2, textTransform: 'none', background: 'var(--sr-emerald-soft)', color: 'var(--sr-emerald)', fontWeight: 600, '&:hover': { background: '#A7F3D0' } }}
                        >
                          Verify ✓
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          disabled={kycSaving}
                          onClick={() => setKycStatus(bookcarsTypes.KycStatus.Rejected)}
                          sx={{ borderRadius: 2, textTransform: 'none', background: 'var(--sr-surface-raised)', color: CRIMSON, fontWeight: 600, '&:hover': { background: '#FECACA' } }}
                        >
                          Reject
                        </Button>
                      </Stack>
                    )}
                  </Box>
                )}
              </Box>
            </Grid>
          </Grid>

          {/* Bookings section */}
          <Box sx={cardStyle}>
            <Typography sx={sectionHeaderSx}>Bookings</Typography>
            {_suppliers.length > 0 && (
              <BookingList
                containerClassName="user"
                offset={offset}
                loggedUser={loggedUser}
                user={supplier ? undefined : user}
                suppliers={_suppliers}
                statuses={statuses}
                hideDates={env.isMobile}
                checkboxSelection={!env.isMobile}
                hideSupplierColumn={supplier}
                language={loggedUser.language}
              />
            )}
          </Box>
        </Box>
      )}

      <Dialog disableEscapeKeyDown maxWidth="xs" open={openDeleteDialog}>
        <DialogTitle className="dialog-header">{commonStrings.CONFIRM_TITLE}</DialogTitle>
        <DialogContent>{ulStrings.DELETE_USER}</DialogContent>
        <DialogActions className="dialog-actions">
          <Button onClick={handleCancelDelete} variant="contained" className="btn-secondary">
            {commonStrings.CANCEL}
          </Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error">
            {commonStrings.DELETE}
          </Button>
        </DialogActions>
      </Dialog>

      {loading && <Backdrop text={commonStrings.LOADING} />}
      {noMatch && <NoMatch hideHeader />}
    </Layout>
  )
}

export default User
