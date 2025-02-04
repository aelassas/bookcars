import React, { useState } from 'react'
import {
  Typography,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Link
} from '@mui/material'
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings as clStrings } from '@/lang/supplier-list'
import * as SupplierService from '@/services/SupplierService'
import * as helper from '@/common/helper'
import Layout from '@/components/Layout'
import Backdrop from '@/components/SimpleBackdrop'
import Avatar from '@/components/Avatar'
import CarList from '@/components/CarList'
import InfoBox from '@/components/InfoBox'
import Error from './Error'
import NoMatch from './NoMatch'

import '@/assets/css/supplier.css'

const Supplier = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState<bookcarsTypes.User>()
  const [supplier, setSupplier] = useState<bookcarsTypes.User>()
  const [suppliers, setSuppliers] = useState<string[]>([])
  const [error, setError] = useState(false)
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [noMatch, setNoMatch] = useState(false)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [rowCount, setRowCount] = useState(-1)
  const [language, setLanguage] = useState(env.DEFAULT_LANGUAGE)

  const onBeforeUpload = () => {
    setLoading(true)
  }

  const onAvatarChange = (avatar: string) => {
    if (user && supplier && user._id === supplier._id) {
      const _user = bookcarsHelper.clone(user)
      _user.avatar = avatar

      setUser(_user)
    }

    setLoading(false)
  }

  const handleDelete = () => {
    setOpenDeleteDialog(true)
  }

  const handleConfirmDelete = async () => {
    if (supplier) {
      try {
        setOpenDeleteDialog(false)

        const status = await SupplierService.deleteSupplier(supplier._id as string)

        if (status === 200) {
          navigate('/suppliers')
        } else {
          helper.error()
        }
      } catch (err) {
        helper.error(err)
      }
    } else {
      helper.error()
    }
  }

  const handleCancelDelete = () => {
    setOpenDeleteDialog(false)
  }

  const handleCarListLoad: bookcarsTypes.DataEvent<bookcarsTypes.Car> = (data) => {
    if (data) {
      setRowCount(data.rowCount)
    }
  }

  const handleCarDelete = (_rowCount: number) => {
    setRowCount(_rowCount)
  }

  const onLoad = async (_user?: bookcarsTypes.User) => {
    setUser(_user)
    setLanguage(_user?.language as string)

    if (_user && _user.verified) {
      const params = new URLSearchParams(window.location.search)
      if (params.has('c')) {
        const id = params.get('c')
        if (id && id !== '') {
          try {
            const _supplier = await SupplierService.getSupplier(id)

            if (_supplier) {
              setSupplier(_supplier)
              setSuppliers([_supplier._id as string])
              setVisible(true)
              setLoading(false)
            } else {
              setLoading(false)
              setNoMatch(true)
            }
          } catch {
            setLoading(false)
            setError(true)
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

  const edit = user && supplier && (user.type === bookcarsTypes.RecordType.Admin || user._id === supplier._id)

  return (
    <Layout onLoad={onLoad} strict>
      {visible && supplier && suppliers && (
        <div className="supplier">
          <div className="col-1">
            <section className="supplier-avatar-sec">
              {edit ? (
                <Avatar
                  record={supplier}
                  type={bookcarsTypes.RecordType.Supplier}
                  mode="update"
                  size="large"
                  hideDelete
                  onBeforeUpload={onBeforeUpload}
                  onChange={onAvatarChange}
                  readonly={!edit}
                  color="disabled"
                  className="supplier-avatar"
                />
              ) : (
                <div className="car-supplier">
                  <span className="car-supplier-logo">
                    <img src={bookcarsHelper.joinURL(env.CDN_USERS, supplier.avatar)} alt={supplier.fullName} style={{ width: env.SUPPLIER_IMAGE_WIDTH }} />
                  </span>
                  <span className="car-supplier-info">{supplier.fullName}</span>
                </div>
              )}
            </section>
            {edit && (
              <Typography variant="h4" className="supplier-name">
                {supplier.fullName}
              </Typography>
            )}
            {supplier.bio && (
              helper.isValidURL(supplier.bio)
                ? (<Link href={supplier.bio} className="supplier-bio-link">{supplier.bio}</Link>) : (
                  <Typography variant="h6" className="supplier-info">
                    {supplier.bio}
                  </Typography>
                )
            )}
            {supplier.location && supplier.location !== '' && (
              <Typography variant="h6" className="supplier-info">
                {supplier.location}
              </Typography>
            )}
            {supplier.phone && supplier.phone !== '' && (
              <Typography variant="h6" className="supplier-info">
                {supplier.phone}
              </Typography>
            )}
            <div className="supplier-actions">
              {edit && (
                <Tooltip title={commonStrings.UPDATE}>
                  <IconButton href={`/update-supplier?c=${supplier._id}`}>
                    <EditIcon />
                  </IconButton>
                </Tooltip>
              )}
              {edit && (
                <Tooltip title={commonStrings.DELETE}>
                  <IconButton data-id={supplier._id} onClick={handleDelete}>
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              )}
            </div>
            {rowCount > 0 && <InfoBox value={`${rowCount} ${rowCount > 1 ? commonStrings.CARS : commonStrings.CAR}`} className="car-count" />}
          </div>
          <div className="col-2">
            <CarList
              user={user}
              suppliers={suppliers}
              keyword=""
              reload={false}
              language={language}
              onLoad={handleCarListLoad}
              onDelete={handleCarDelete}
              hideSupplier
            />
          </div>
        </div>
      )}
      <Dialog disableEscapeKeyDown maxWidth="xs" open={openDeleteDialog}>
        <DialogTitle className="dialog-header">{commonStrings.CONFIRM_TITLE}</DialogTitle>
        <DialogContent>{clStrings.DELETE_SUPPLIER}</DialogContent>
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
      {error && <Error />}
      {noMatch && <NoMatch hideHeader />}
    </Layout>
  )
}

export default Supplier
