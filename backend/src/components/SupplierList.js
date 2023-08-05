import React, { useState, useEffect } from 'react'
import Env from '../config/env.config'
import Const from '../config/const'
import { strings as commonStrings } from '../lang/common'
import { strings } from '../lang/company-list'
import * as SupplierService from '../services/SupplierService'
import * as Helper from '../common/Helper'
import { IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions, Tooltip, Card, CardContent, Typography } from '@mui/material'
import { Visibility as ViewIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import Pager from './Pager'

import '../assets/css/company-list.css'

const SupplierList = (props) => {
  const [keyword, setKeyword] = useState(props.keyword)
  const [reload, setReload] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fetch, setFetch] = useState(false)
  const [rows, setRows] = useState([])
  const [rowCount, setRowCount] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [page, setPage] = useState(1)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [companyId, setCompanyId] = useState('')
  const [companyIndex, setCompanyIndex] = useState(-1)

  const _fetch = async (page, keyword) => {
    try {
      setLoading(true)

      const data = await SupplierService.getCompanies(keyword, page, Env.PAGE_SIZE)
      const _data = Array.isArray(data) && data.length > 0 ? data[0] : { resultData: [] }
      const totalRecords = Array.isArray(_data.pageInfo) && _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0

      let _rows = []
      if (Env.PAGINATION_MODE === Const.PAGINATION_MODE.INFINITE_SCROLL || Env.isMobile()) {
        _rows = page === 1 ? _data.resultData : [...rows, ..._data.resultData]
      } else {
        _rows = _data.resultData
      }

      setRows(_rows)
      setRowCount((page - 1) * Env.PAGE_SIZE + _rows.length)
      setTotalRecords(totalRecords)
      setFetch(_data.resultData.length > 0)

      if (((Env.PAGINATION_MODE === Const.PAGINATION_MODE.INFINITE_SCROLL || Env.isMobile()) && page === 1) || (Env.PAGINATION_MODE === Const.PAGINATION_MODE.CLASSIC && !Env.isMobile())) {
        window.scrollTo(0, 0)
      }

      if (props.onLoad) {
        props.onLoad({ rows: _data.resultData, rowCount: totalRecords })
      }
    } catch (err) {
      Helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (props.keyword !== keyword) {
      _fetch(1, props.keyword)
    }
    setKeyword(props.keyword || '')
  }, [props.keyword, keyword]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (props.reload && !reload) {
      _fetch(1, '')
    }
    setReload(props.reload || false)
  }, [props.reload, reload]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (Env.PAGINATION_MODE === Const.PAGINATION_MODE.CLASSIC && !Env.isMobile()) {
      _fetch(page, keyword)
    }
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (Env.PAGINATION_MODE === Const.PAGINATION_MODE.INFINITE_SCROLL || Env.isMobile()) {
      const element = document.querySelector('body')

      if (element) {
        element.onscroll = () => {
          if (fetch && !loading && window.scrollY > 0 && window.scrollY + window.innerHeight >= document.body.scrollHeight) {
            const p = page + 1
            setPage(p)
            _fetch(p, keyword)
          }
        }
      }
    }
  }, [fetch, loading, page, keyword]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    _fetch(1, '')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = (e) => {
    const companyId = e.currentTarget.getAttribute('data-id')
    const companyIndex = e.currentTarget.getAttribute('data-index')

    setOpenDeleteDialog(true)
    setCompanyId(companyId)
    setCompanyIndex(companyIndex)
  }

  const handleConfirmDelete = async () => {
    try {
      if (companyId !== '' && companyIndex > -1) {
        setLoading(false)
        setOpenDeleteDialog(false)
        const status = await SupplierService.deleteCompany(companyId)
        if (status === 200) {
          const _rowCount = rowCount - 1
          rows.splice(companyIndex, 1)

          setRows(rows)
          setRowCount(_rowCount)
          setTotalRecords(totalRecords - 1)
          setCompanyId('')
          setCompanyIndex(-1)
          setLoading(false)

          if (props.onDelete) {
            props.onDelete(_rowCount)
          }
        } else {
          Helper.error()
          setCompanyId('')
          setCompanyIndex(-1)
          setLoading(false)
        }
      } else {
        Helper.error()
        setOpenDeleteDialog(false)
        setCompanyId('')
        setCompanyIndex(-1)
        setLoading(false)
      }
    } catch (err) {
      Helper.error(err)
    }
  }

  const handleCancelDelete = () => {
    setOpenDeleteDialog(false)
    setCompanyId('')
    setCompanyIndex(-1)
  }

  const admin = Helper.admin(props.user)

  return (
    <>
      <section className="company-list">
        {rows.length === 0
          ? !loading && (
              <Card variant="outlined" className="empty-list">
                <CardContent>
                  <Typography color="textSecondary">{strings.EMPTY_LIST}</Typography>
                </CardContent>
              </Card>
            )
          : rows.map((company, index) => {
              const edit = admin || (props.user && props.user._id === company._id)
              const canDelete = admin

              return (
                <article key={company._id}>
                  <div className="company-item">
                    <div className="company-item-avatar">
                      <img src={Helper.joinURL(Env.CDN_USERS, company.avatar)} alt={company.fullName} />
                    </div>
                    <span className="company-item-title">{company.fullName}</span>
                  </div>
                  <div className="company-actions">
                    {canDelete && (
                      <Tooltip title={commonStrings.DELETE}>
                        <IconButton data-id={company._id} data-index={index} onClick={handleDelete}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    {edit && (
                      <Tooltip title={commonStrings.UPDATE}>
                        <IconButton href={`/update-supplier?c=${company._id}`}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title={strings.VIEW_COMPANY}>
                      <IconButton href={`/supplier?c=${company._id}`}>
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                  </div>
                </article>
              )
            })}
        <Dialog disableEscapeKeyDown maxWidth="xs" open={openDeleteDialog}>
          <DialogTitle className="dialog-header">{commonStrings.CONFIRM_TITLE}</DialogTitle>
          <DialogContent>{strings.DELETE_COMPANY}</DialogContent>
          <DialogActions className="dialog-actions">
            <Button onClick={handleCancelDelete} variant="contained" className="btn-secondary">
              {commonStrings.CANCEL}
            </Button>
            <Button onClick={handleConfirmDelete} variant="contained" color="error">
              {commonStrings.DELETE}
            </Button>
          </DialogActions>
        </Dialog>
      </section>
      {Env.PAGINATION_MODE === Const.PAGINATION_MODE.CLASSIC && !Env.isMobile() && (
        <Pager page={page} pageSize={Env.PAGE_SIZE} rowCount={rowCount} totalRecords={totalRecords} onNext={() => setPage(page + 1)} onPrevious={() => setPage(page - 1)} />
      )}
    </>
  )
}

export default SupplierList
