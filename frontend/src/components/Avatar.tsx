import React, { useState, useEffect } from 'react'
import {
  Button,
  Avatar as MaterialAvatar,
  Badge,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material'
import {
  AccountCircle,
  PhotoCamera as PhotoCameraIcon,
  BrokenImageTwoTone as DeleteIcon
} from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import * as helper from '@/utils/helper'
import { strings as commonStrings } from '@/lang/common'
import * as UserService from '@/services/UserService'

interface AvatarProps {
  loggedUser?: bookcarsTypes.User
  user?: bookcarsTypes.User
  size: 'small' | 'medium' | 'large',
  readonly?: boolean,
  color?: 'disabled' | 'action' | 'inherit' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning',
  className?: string,
  onBeforeUpload?: () => void,
  onChange?: (user: bookcarsTypes.User) => void,
}

const Avatar = ({
  loggedUser,
  user: avatarUser,
  size,
  readonly,
  color,
  className,
  onBeforeUpload,
  onChange,
}: AvatarProps) => {
  const [error, setError] = useState(false)
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<bookcarsTypes.User>()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !user) {
      helper.error()
      return
    }

    if (onBeforeUpload) {
      onBeforeUpload()
    }

    const { _id } = user

    if (!_id) {
      helper.error()
      return
    }

    const reader = new FileReader()
    const file = e.target.files[0]

    reader.onloadend = async () => {
      try {
        const status = await UserService.updateAvatar(_id, file)

        if (status === 200) {
          const _user = await UserService.getUser(_id)

          if (_user) {
            setUser(_user)

            if (onChange) {
              onChange(_user)
            }
          } else {
            helper.error()
          }
        } else {
          helper.error()
        }
      } catch (err) {
        helper.error(err)
      }
    }

    reader.readAsDataURL(file)
  }

  const handleUpload = () => {
    const upload = document.getElementById('upload') as HTMLInputElement
    upload.value = ''
    setTimeout(() => {
      upload.click()
    }, 0)
  }

  const openDialog = () => {
    setOpen(true)
  }

  const handleDeleteAvatar = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault()
    openDialog()
  }

  const closeDialog = () => {
    setOpen(false)
  }

  const handleCancelDelete = () => {
    closeDialog()
  }

  const handleDelete = async () => {
    try {
      if (!user) {
        helper.error()
        return
      }

      const { _id } = user

      if (!_id) {
        helper.error()
        return
      }

      const status = await UserService.deleteAvatar(_id)

      if (status === 200) {
        const _user = await UserService.getUser(_id)

        if (_user) {
          setUser(_user)
          if (onChange) {
            onChange(_user)
          }
          closeDialog()
        } else {
          helper.error()
        }
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    }
  }

  useEffect(() => {
    const language = UserService.getLanguage()
    commonStrings.setLanguage(language)

    const currentUser = UserService.getCurrentUser()
    if (currentUser) {
      setUser(avatarUser)
    } else {
      setError(true)
    }
  }, [avatarUser])

  const avatarUrl = user?.avatar
    ? (user.avatar?.startsWith('http') ? user.avatar : bookcarsHelper.joinURL(env.CDN_USERS, user.avatar))
    : ''

  return !error && loggedUser && user ? (
    <div className={className}>
      {loggedUser._id === user._id && !readonly ? (
        <div>
          <input id="upload" type="file" hidden onChange={handleChange} />
          {user.avatar ? (
            <Badge
              overlap="circular"
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              badgeContent={(
                <Box borderRadius="50%" className="avatar-action-box" onClick={handleDeleteAvatar}>
                  <DeleteIcon className="avatar-action-icon" />
                </Box>
              )}
            >
              <Badge
                overlap="circular"
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                badgeContent={(
                  <Box borderRadius="50%" className="avatar-action-box" onClick={handleUpload}>
                    <PhotoCameraIcon className="avatar-action-icon" />
                  </Box>
                )}
              >
                <MaterialAvatar src={avatarUrl} className="avatar" />
              </Badge>
            </Badge>
          ) : (
            <Badge
              overlap="circular"
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              badgeContent={(
                <div>
                  <Box borderRadius="50%" className="avatar-action-box" onClick={handleUpload}>
                    <PhotoCameraIcon className={user.language === 'ar' ? 'avatar-action-icon-rtl' : 'avatar-action-icon'} />
                  </Box>
                </div>
              )}
            >
              <MaterialAvatar className="avatar">
                <AccountCircle className="avatar" />
              </MaterialAvatar>
            </Badge>
          )}
        </div>
      ) : avatarUrl ? (
        <>
          <MaterialAvatar src={avatarUrl} className={size ? `avatar-${size}` : 'avatar'} />
        </>
      ) : (
        <AccountCircle className={size ? `avatar-${size}` : 'avatar'} color={color || 'inherit'} />
      )}
      <Dialog disableEscapeKeyDown maxWidth="xs" open={open}>
        <DialogTitle className="dialog-header">{commonStrings.CONFIRM_TITLE}</DialogTitle>
        <DialogContent>{commonStrings.DELETE_AVATAR_CONFIRM}</DialogContent>
        <DialogActions className="dialog-actions">
          <Button onClick={handleCancelDelete} className="btn-secondary" variant="outlined" color="primary">
            {commonStrings.CANCEL}
          </Button>
          <Button onClick={handleDelete} className="btn-primary">
            {commonStrings.DELETE}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  ) : null
}

export default Avatar
