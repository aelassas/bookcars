import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
} from '@mui/material'
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Flag as CountryIcon
} from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import env from '@/config/env.config'
import Const from '@/config/const'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/countries'
import * as CountryService from '@/services/CountryService'
import * as helper from '@/utils/helper'
import Pager from './Pager'
import { UserContextType, useUserContext } from '@/context/UserContext'
import Progress from '@/components/Progress'

import '@/assets/css/country-list.css'

interface CountryListProps {
  keyword?: string
  onLoad: bookcarsTypes.DataEvent<bookcarsTypes.Country>
  onDelete: (rowCount: number) => void
}

const CountryList = ({
  keyword: countryKeyword,
  onLoad,
  onDelete
}: CountryListProps) => {
  const navigate = useNavigate()

  const { user } = useUserContext() as UserContextType
  const [keyword, setKeyword] = useState(countryKeyword)
  const [init, setInit] = useState(true)
  const [loading, setLoading] = useState(false)
  const [fetch, setFetch] = useState(false)
  const [rows, setRows] = useState<bookcarsTypes.Country[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [page, setPage] = useState(1)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [openInfoDialog, setOpenInfoDialog] = useState(false)
  const [countryId, setCountryId] = useState('')
  const [countryIndex, setCountryIndex] = useState(-1)

  const fetchData = async (_page: number, _keyword?: string) => {
    try {
      setLoading(true)

      const data = await CountryService.getCountries(_keyword || '', _page, env.PAGE_SIZE)
      const _data = data && data.length > 0 ? data[0] : { pageInfo: { totalRecord: 0 }, resultData: [] }
      if (!_data) {
        helper.error()
        return
      }
      const _totalRecords = Array.isArray(_data.pageInfo) && _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0

      let _rows = []
      if (env.PAGINATION_MODE === Const.PAGINATION_MODE.INFINITE_SCROLL || env.isMobile) {
        _rows = _page === 1 ? _data.resultData : [...rows, ..._data.resultData]
      } else {
        _rows = _data.resultData
      }

      setRows(_rows)
      setRowCount((_page - 1) * env.PAGE_SIZE + _rows.length)
      setTotalRecords(_totalRecords)
      setFetch(_data.resultData.length > 0)

      if (((env.PAGINATION_MODE === Const.PAGINATION_MODE.INFINITE_SCROLL || env.isMobile) && _page === 1)
        || (env.PAGINATION_MODE === Const.PAGINATION_MODE.CLASSIC && !env.isMobile)) {
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
    if (countryKeyword !== keyword) {
      fetchData(1, countryKeyword)
    }
    setKeyword(countryKeyword || '')
  }, [countryKeyword, keyword]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData(page, keyword)
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (env.PAGINATION_MODE === Const.PAGINATION_MODE.INFINITE_SCROLL || env.isMobile) {
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
  }, [fetch, loading, page, keyword])

  const handleDelete = async (e: React.MouseEvent<HTMLElement>) => {
    try {
      const _countryId = e.currentTarget.getAttribute('data-id') as string
      const _countryIndex = Number(e.currentTarget.getAttribute('data-index') as string)

      const status = await CountryService.check(_countryId)

      if (status === 204) {
        setOpenDeleteDialog(true)
        setCountryId(_countryId)
        setCountryIndex(_countryIndex)
      } else if (status === 200) {
        setOpenInfoDialog(true)
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const handleCloseInfo = () => {
    setOpenInfoDialog(false)
  }

  const handleConfirmDelete = async () => {
    try {
      if (countryId !== '' && countryIndex > -1) {
        setLoading(true)
        setOpenDeleteDialog(false)

        const status = await CountryService.deleteCountry(countryId)

        if (status === 200) {
          const _rowCount = rowCount - 1

          rows.splice(countryIndex, 1)

          setRows(rows)
          setRowCount(_rowCount)
          setTotalRecords(totalRecords - 1)
          setCountryId('')
          setCountryIndex(-1)
          setLoading(false)

          if (onDelete) {
            onDelete(_rowCount)
          }
        } else {
          helper.error()
          setCountryId('')
          setCountryIndex(-1)
          setLoading(false)
        }
      } else {
        helper.error()
        setOpenDeleteDialog(false)
        setCountryId('')
        setCountryIndex(-1)
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const handleCancelDelete = () => {
    setOpenDeleteDialog(false)
    setCountryId('')
    setCountryIndex(-1)
  }

  return user && (
    <>
      <section className="country-list">
        {rows.length === 0 ? (
          !init
          && !loading
          && (
            <Card variant="outlined" className="empty-list">
              <CardContent>
                <Typography color="textSecondary">{strings.EMPTY_LIST}</Typography>
              </CardContent>
            </Card>
          )
        ) : (
          <List className="country-list-items">
            {rows.map((country, index) => (
              <ListItem
                className="country-list-item"
                key={country._id}
                secondaryAction={
                  (helper.admin(user) || country.supplier?._id === user._id) && (
                    <div>
                      <Tooltip title={commonStrings.UPDATE}>
                        <IconButton edge="end" onClick={() => navigate(`/update-country?loc=${country._id}`)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={commonStrings.DELETE}>
                        <IconButton edge="end" data-id={country._id} data-index={index} onClick={handleDelete}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </div>
                  )
                }
              >
                <ListItemAvatar>
                  <Avatar>
                    <CountryIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText primary={<Typography className="country-title">{country.name}</Typography>} />
              </ListItem>
            ))}
          </List>
        )}
        <Dialog disableEscapeKeyDown maxWidth="xs" open={openInfoDialog}>
          <DialogTitle className="dialog-header">{commonStrings.INFO}</DialogTitle>
          <DialogContent>{strings.CANNOT_DELETE_COUNTRY}</DialogContent>
          <DialogActions className="dialog-actions">
            <Button onClick={handleCloseInfo} variant="contained" className="btn-secondary">
              {commonStrings.CLOSE}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog disableEscapeKeyDown maxWidth="xs" open={openDeleteDialog}>
          <DialogTitle className="dialog-header">{commonStrings.CONFIRM_TITLE}</DialogTitle>
          <DialogContent>{strings.DELETE_COUNTRY}</DialogContent>
          <DialogActions className="dialog-actions">
            <Button onClick={handleCancelDelete} variant="contained" className="btn-secondary">
              {commonStrings.CANCEL}
            </Button>
            <Button onClick={handleConfirmDelete} variant="contained" color="error">
              {commonStrings.DELETE}
            </Button>
          </DialogActions>
        </Dialog>

        {loading && <Progress />}
      </section>
      {env.PAGINATION_MODE === Const.PAGINATION_MODE.CLASSIC && !env.isMobile && (
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

export default CountryList
