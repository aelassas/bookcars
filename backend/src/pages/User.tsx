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
} from '@mui/material'
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings as ulStrings } from '@/lang/user-list'
import * as UserService from '@/services/UserService'
import * as helper from '@/common/helper'
import Layout from '@/components/Layout'
import Backdrop from '@/components/SimpleBackdrop'
import Avatar from '@/components/Avatar'
import BookingList from '@/components/BookingList'
import NoMatch from './NoMatch'
import * as SupplierService from '@/services/SupplierService'

import '@/assets/css/user.css'

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

  return (
    <Layout onLoad={onLoad} strict>
      {loggedUser && user && visible && (
        <div className="user">
          <div className="col-1">
            <section className="user-avatar-sec">
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
            </section>
            <Typography variant="h4" className="user-name">
              {user.fullName}
            </Typography>
            {user.bio && (
              <Typography variant="h6" className="user-info">
                {user.bio}
              </Typography>
            )}
            {user.location && (
              <Typography variant="h6" className="user-info">
                {user.location}
              </Typography>
            )}
            {user.phone && (
              <Typography variant="h6" className="user-info">
                {user.phone}
              </Typography>
            )}
            {user.license && (
              <div className="license">
                <span>{commonStrings.LICENSE}</span>
                <Link href={bookcarsHelper.joinURL(env.CDN_LICENSES, user.license)} target="_blank">
                  {user.license}
                </Link>
              </div>
            )}
            <div className="user-actions">
              {edit && (
                <Tooltip title={commonStrings.UPDATE}>
                  <IconButton onClick={() => navigate(`/update-user?u=${user._id}`)}>
                    <EditIcon />
                  </IconButton>
                </Tooltip>
              )}
              {edit && (
                <Tooltip title={commonStrings.DELETE}>
                  <IconButton data-id={user._id} onClick={handleDelete}>
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              )}
            </div>
          </div>
          <div className="col-2">
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
          </div>
        </div>
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
