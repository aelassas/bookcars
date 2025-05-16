import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip
} from '@mui/material'
import {
  Checkroom as DressTypeIcon,
  Straighten as LengthIcon,
  Palette as ColorIcon,
  Check as CheckIcon,
  Clear as UncheckIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import Layout from '@/components/Layout'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/dresses'
import * as UserService from '@/services/UserService'
import * as DressService from '@/services/DressService'
import * as SupplierService from '@/services/SupplierService'
import Backdrop from '@/components/SimpleBackdrop'
import NoMatch from './NoMatch'
import Error from './Error'
import Avatar from '@/components/Avatar'
import BookingList from '@/components/BookingList'
import * as helper from '@/common/helper'

import '@/assets/css/dress.css'

const Dress = () => {
  const navigate = useNavigate()

  const [user, setUser] = useState<bookcarsTypes.User>()
  const [loading, setLoading] = useState(true)
  const [noMatch, setNoMatch] = useState(false)
  const [error, setError] = useState(false)
  const [visible, setVisible] = useState(false)
  const [dress, setDress] = useState<bookcarsTypes.Dress>()
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [suppliers, setSuppliers] = useState<string[]>([])
  const [statuses, setStatuses] = useState<string[]>([])
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const element = document.querySelector('.dress-sec')
    if (element) {
      setOffset(element.clientHeight + 75)
    }
  }, [dress])

  const handleBeforeUpload = () => {
    setLoading(true)
  }

  const handleImageChange = () => {
    setLoading(false)
  }

  const handleDelete = () => {
    setOpenDeleteDialog(true)
  }

  const handleCancelDelete = () => {
    setOpenDeleteDialog(false)
  }

  const handleConfirmDelete = async () => {
    try {
      if (dress && dress._id) {
        setOpenDeleteDialog(false)
        setLoading(true)

        const status = await DressService.deleteDress(dress._id)

        if (status === 200) {
          navigate('/dresses')
        } else {
          setError(true)
          setLoading(false)
        }
      } else {
        setError(true)
        setLoading(false)
      }
    } catch (err) {
      setError(true)
      setLoading(false)
    }
  }

  const onLoad = async () => {
    setLoading(true)
    setError(false)
    setNoMatch(false)

    try {
      const params = new URLSearchParams(window.location.search)
      if (params.has('dr')) {
        const id = params.get('dr')
        if (id && id !== '') {
          const currentUser = UserService.getCurrentUser()
          if (currentUser) {
            const _user = await UserService.getUser(currentUser.id)
            if (_user) {
              setUser(_user)
              const _dress = await DressService.getDress(id)

              if (_dress) {
                setDress(_dress)
                setVisible(true)

                const _suppliers = [_dress.supplier._id]
                setSuppliers(_suppliers)

                const _statuses = helper.getBookingStatuses().map((status) => status.value)
                setStatuses(_statuses)
              } else {
                setNoMatch(true)
              }
            } else {
              setNoMatch(true)
            }
          } else {
            setNoMatch(true)
          }
        } else {
          setNoMatch(true)
        }
      } else {
        setNoMatch(true)
      }
    } catch (err) {
      setError(true)
    }

    setLoading(false)
  }

  const edit = user && dress && (helper.admin(user) || dress.supplier._id === user._id)

  return (
    <Layout onLoad={onLoad} strict>
      {visible && dress && dress.supplier && (
        <div className="dress">
          <div className="col-1">
            <section className="dress-sec">
              <div className="name">
                <h2>{dress.name}</h2>
              </div>
              <div className="dress-img">
                <Avatar
                  type={bookcarsTypes.RecordType.Dress}
                  mode="update"
                  record={dress}
                  size="large"
                  readonly={!edit}
                  hideDelete
                  onBeforeUpload={handleBeforeUpload}
                  onChange={handleImageChange}
                  color="disabled"
                  className="avatar-ctn"
                />
                <div className="dress-supplier">
                  <span className="dress-supplier-logo">
                    <img src={bookcarsHelper.joinURL(env.CDN_USERS, dress.supplier.avatar)} alt={dress.supplier.fullName} />
                  </span>
                  <span className="dress-supplier-info">{dress.supplier.fullName}</span>
                </div>
              </div>
              <div className="dress-info">
                <ul className="dress-info-list">
                  <li className="dress-type">
                    <Tooltip title={helper.getDressTypeTooltip(dress.type)} placement="top">
                      <div className="dress-info-list-item">
                        <DressTypeIcon />
                        <span className="dress-info-list-text">{helper.getDressType(dress.type)}</span>
                      </div>
                    </Tooltip>
                  </li>
                  <li className="dress-size">
                    <Tooltip title={helper.getDressSizeTooltip(dress.size)} placement="top">
                      <div className="dress-info-list-item">
                        <span className="dress-info-list-text">{helper.getDressSize(dress.size)}</span>
                      </div>
                    </Tooltip>
                  </li>
                  <li className="dress-color">
                    <Tooltip title={strings.COLOR || 'Color'} placement="top">
                      <div className="dress-info-list-item">
                        <ColorIcon />
                        <span className="dress-info-list-text">{dress.color}</span>
                      </div>
                    </Tooltip>
                  </li>
                  <li className="dress-length">
                    <Tooltip title={strings.LENGTH || 'Length'} placement="top">
                      <div className="dress-info-list-item">
                        <LengthIcon />
                        <span className="dress-info-list-text">{`${dress.length} ${strings.CM || 'cm'}`}</span>
                      </div>
                    </Tooltip>
                  </li>
                  <li className="dress-material">
                    <Tooltip title={strings.MATERIAL || 'Material'} placement="top">
                      <div className="dress-info-list-item">
                        <span className="dress-info-list-text">{helper.getDressMaterial(dress.material)}</span>
                      </div>
                    </Tooltip>
                  </li>
                  <li className="dress-rentals">
                    <Tooltip title={strings.RENTALS_COUNT || 'Times rented'} placement="top">
                      <div className="dress-info-list-item">
                        <span className="dress-info-list-text">{`${strings.RENTALS_COUNT || 'Times rented'}: ${dress.rentals || 0}`}</span>
                      </div>
                    </Tooltip>
                  </li>
                  <li className={dress.available ? 'dress-available' : 'dress-unavailable'}>
                    <Tooltip title={dress.available ? strings.DRESS_AVAILABLE_TOOLTIP : strings.DRESS_UNAVAILABLE_TOOLTIP}>
                      <div className="dress-info-list-item">
                        {dress.available ? <CheckIcon /> : <UncheckIcon />}
                        {dress.available ? <span className="dress-info-list-text">{strings.DRESS_AVAILABLE}</span> : <span className="dress-info-list-text">{strings.DRESS_UNAVAILABLE}</span>}
                      </div>
                    </Tooltip>
                  </li>
                  {dress.customizable && (
                    <li className="dress-customizable">
                      <Tooltip title={strings.CUSTOMIZABLE_TOOLTIP || 'This dress can be customized'} placement="top">
                        <div className="dress-info-list-item">
                          <CheckIcon className="available" />
                          <span className="dress-info-list-text">{strings.CUSTOMIZABLE || 'Customizable'}</span>
                        </div>
                      </Tooltip>
                    </li>
                  )}
                </ul>
              </div>
            </section>
            {edit && (
              <section className="buttons action">
                <Button variant="contained" className="btn-primary btn-margin btn-margin-bottom" size="small" onClick={() => navigate(`/update-dress?dr=${dress._id}`)}>
                  {commonStrings.UPDATE}
                </Button>
                <Button variant="contained" className="btn-margin-bottom" color="error" size="small" onClick={handleDelete}>
                  {commonStrings.DELETE}
                </Button>
              </section>
            )}
          </div>
          <div className="col-2">
            <BookingList
              containerClassName="dress"
              offset={offset}
              loggedUser={user}
              suppliers={suppliers}
              statuses={statuses}
              dress={dress._id}
              hideSupplierColumn
              hideDressColumn
              hideDates={env.isMobile}
              checkboxSelection={!env.isMobile}
            />
          </div>
        </div>
      )}

      <Dialog
        disableEscapeKeyDown
        maxWidth="xs"
        open={openDeleteDialog}
      >
        <DialogTitle className="dialog-header">{commonStrings.CONFIRM_TITLE}</DialogTitle>
        <DialogContent>{strings.DELETE_DRESS}</DialogContent>
        <DialogActions className="dialog-actions">
          <Button onClick={handleCancelDelete} variant="contained" className="btn-secondary">{commonStrings.CANCEL}</Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error">{commonStrings.DELETE}</Button>
        </DialogActions>
      </Dialog>

      {loading && <Backdrop text={commonStrings.LOADING} />}
      {error && <Error />}
      {noMatch && <NoMatch />}
    </Layout>
  )
}

export default Dress
