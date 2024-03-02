import React, { useState, useEffect } from 'react'
import {
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Card,
  CardContent,
  Typography
} from '@mui/material'
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material'
import * as bookcarsTypes from 'bookcars-types'
import * as bookcarsHelper from 'bookcars-helper'
import env from '../config/env.config'
import Const from '../config/const'
import { strings as commonStrings } from '../lang/common'
import { strings } from '../lang/company-list'
import * as SupplierService from '../services/SupplierService'
import * as helper from '../common/helper'
import Pager from './Pager'

import '../assets/css/company-list.css'

interface SupplierListProps {
  user?: bookcarsTypes.User
  keyword?: string
  reload?: boolean
  onLoad?: bookcarsTypes.DataEvent<bookcarsTypes.User>
  onDelete?: (rowCount: number) => void
}

const SupplierList = ({
  user,
  keyword: supplierListKeyword,
  reload: supplierListReload,
  onDelete,
  onLoad
}: SupplierListProps) => {
  const [keyword, setKeyword] = useState(supplierListKeyword)
  const [reload, setReload] = useState(false)
  const [init, setInit] = useState(true)
  const [loading, setLoading] = useState(false)
  const [fetch, setFetch] = useState(false)
  const [rows, setRows] = useState<bookcarsTypes.User[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [page, setPage] = useState(1)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [companyId, setCompanyId] = useState('')
  const [companyIndex, setCompanyIndex] = useState(-1)

  const fetchData = async (_page: number, _keyword?: string) => {
    try {
      setLoading(true)

      const data = await SupplierService.getSuppliers(_keyword || '', _page, env.PAGE_SIZE)
      const _data = data && data.length > 0 ? data[0] : { pageInfo: { totalRecord: 0 }, resultData: [] }
      if (!_data) {
        helper.error()
        return
      }
      const _totalRecords = Array.isArray(_data.pageInfo) && _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0

      let _rows = []
      if (env.PAGINATION_MODE === Const.PAGINATION_MODE.INFINITE_SCROLL || env.isMobile()) {
        _rows = _page === 1 ? _data.resultData : [...rows, ..._data.resultData]
      } else {
        _rows = _data.resultData
      }

      setRows(_rows)
      setRowCount((_page - 1) * env.PAGE_SIZE + _rows.length)
      setTotalRecords(_totalRecords)
      setFetch(_data.resultData.length > 0)

      if (((env.PAGINATION_MODE === Const.PAGINATION_MODE.INFINITE_SCROLL || env.isMobile()) && _page === 1) || (env.PAGINATION_MODE === Const.PAGINATION_MODE.CLASSIC && !env.isMobile())) {
        window.scrollTo(0, 0)
      }

      if (onLoad) {
        onLoad({ rows: _data.resultData, rowCount: _totalRecords })
      }
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
      setInit(false)
    }
  }

  useEffect(() => {
    if (supplierListKeyword !== keyword) {
      fetchData(1, supplierListKeyword)
    }
    setKeyword(supplierListKeyword || '')
  }, [supplierListKeyword, keyword]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (supplierListReload && !reload) {
      fetchData(1, '')
    }
    setReload(supplierListReload || false)
  }, [supplierListReload, reload]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData(page, keyword)
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (env.PAGINATION_MODE === Const.PAGINATION_MODE.INFINITE_SCROLL || env.isMobile()) {
      const element = document.querySelector('body')

      if (element) {
        element.onscroll = () => {
          if (fetch
            && !loading
            && window.scrollY > 0
            && window.scrollY + window.innerHeight + env.INFINITE_SCROLL_OFFSET >= document.body.scrollHeight) {
            setLoading(true)
            setPage(page + 1)
          }
        }
      }
    }
  }, [fetch, loading, page, keyword]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = (e: React.MouseEvent<HTMLElement>) => {
    const _companyId = e.currentTarget.getAttribute('data-id') as string
    const _companyIndex = Number(e.currentTarget.getAttribute('data-index') as string)

    setOpenDeleteDialog(true)
    setCompanyId(_companyId)
    setCompanyIndex(_companyIndex)
  }

  const handleConfirmDelete = async () => {
    try {
      if (companyId !== '' && companyIndex > -1) {
        setLoading(false)
        setOpenDeleteDialog(false)
        const status = await SupplierService.deleteSupplier(companyId)
        if (status === 200) {
          const _rowCount = rowCount - 1
          rows.splice(companyIndex, 1)

          setRows(rows)
          setRowCount(_rowCount)
          setTotalRecords(totalRecords - 1)
          setCompanyId('')
          setCompanyIndex(-1)
          setLoading(false)

          if (onDelete) {
            onDelete(_rowCount)
          }
        } else {
          helper.error()
          setCompanyId('')
          setCompanyIndex(-1)
          setLoading(false)
        }
      } else {
        helper.error()
        setOpenDeleteDialog(false)
        setCompanyId('')
        setCompanyIndex(-1)
        setLoading(false)
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const handleCancelDelete = () => {
    setOpenDeleteDialog(false)
    setCompanyId('')
    setCompanyIndex(-1)
  }

  const admin = helper.admin(user)

  return (
    <>
      <section className="company-list">
        {rows.length === 0
          ? !init
          && !loading
          && (
            <Card variant="outlined" className="empty-list">
              <CardContent>
                <Typography color="textSecondary">{strings.EMPTY_LIST}</Typography>
              </CardContent>
            </Card>
          )
          : rows.map((company, index) => {
            const edit = admin || (user && user._id === company._id)
            const canDelete = admin

            return (
              <article key={company._id}>
                <div className="company-item">
                  <div className="company-item-avatar">
                    <img src={bookcarsHelper.joinURL(env.CDN_USERS, company.avatar)} alt={company.fullName} />
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
      {env.PAGINATION_MODE === Const.PAGINATION_MODE.CLASSIC && !env.isMobile() && (
        <Pager
          page={page}
          pageSize={env.PAGE_SIZE}
          rowCount={rowCount}
          totalRecords={totalRecords}
          onNext={() => setPage(page + 1)}
          onPrevious={() => setPage(page - 1)}
        />
      )}
    </>
  )
}

export default SupplierList
