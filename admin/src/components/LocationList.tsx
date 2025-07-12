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
} from '@mui/material'
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import env from '@/config/env.config'
import Const from '@/config/const'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/locations'
import * as LocationService from '@/services/LocationService'
import * as helper from '@/utils/helper'
import Pager from './Pager'
import Avatar from './Avatar'
import { UserContextType, useUserContext } from '@/context/UserContext'
import Progress from '@/components/Progress'

import '@/assets/css/location-list.css'

interface LocationListProps {
  keyword?: string
  onLoad: bookcarsTypes.DataEvent<bookcarsTypes.Location>
  onDelete: (rowCount: number) => void
}

const LocationList = ({
  keyword: locationKeyword,
  onLoad,
  onDelete
}: LocationListProps) => {
  const navigate = useNavigate()

  const { user } = useUserContext() as UserContextType
  const [keyword, setKeyword] = useState(locationKeyword)
  const [init, setInit] = useState(true)
  const [loading, setLoading] = useState(false)
  const [fetch, setFetch] = useState(false)
  const [rows, setRows] = useState<bookcarsTypes.Location[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [page, setPage] = useState(1)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [openInfoDialog, setOpenInfoDialog] = useState(false)
  const [locationId, setLocationId] = useState('')
  const [locationIndex, setLocationIndex] = useState(-1)

  const fetchData = async (_page: number, _keyword?: string) => {
    try {
      setLoading(true)

      const data = await LocationService.getLocations(_keyword || '', _page, env.PAGE_SIZE)
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
    if (locationKeyword !== keyword) {
      fetchData(1, locationKeyword)
    }
    setKeyword(locationKeyword || '')
  }, [locationKeyword, keyword]) // eslint-disable-line react-hooks/exhaustive-deps

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
      const _locationId = e.currentTarget.getAttribute('data-id') as string
      const _locationIndex = Number(e.currentTarget.getAttribute('data-index') as string)

      const status = await LocationService.check(_locationId)

      if (status === 204) {
        setOpenDeleteDialog(true)
        setLocationId(_locationId)
        setLocationIndex(_locationIndex)
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
      if (locationId !== '' && locationIndex > -1) {
        setLoading(true)
        setOpenDeleteDialog(false)

        const status = await LocationService.deleteLocation(locationId)

        if (status === 200) {
          const _rowCount = rowCount - 1

          rows.splice(locationIndex, 1)

          setRows(rows)
          setRowCount(_rowCount)
          setTotalRecords(totalRecords - 1)
          setLocationId('')
          setLocationIndex(-1)
          setLoading(false)

          if (onDelete) {
            onDelete(_rowCount)
          }
        } else {
          helper.error()
          setLocationId('')
          setLocationIndex(-1)
          setLoading(false)
        }
      } else {
        helper.error()
        setOpenDeleteDialog(false)
        setLocationId('')
        setLocationIndex(-1)
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const handleCancelDelete = () => {
    setOpenDeleteDialog(false)
    setLocationId('')
    setLocationIndex(-1)
  }

  return user && (
    <>
      <section className="location-list">
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
          <List className="location-list-items">
            {rows.map((location, index) => (
              <ListItem
                className="location-list-item"
                key={location._id}
                secondaryAction={
                  (helper.admin(user) || location.supplier?._id === user._id) && (
                    <div>
                      <Tooltip title={commonStrings.UPDATE}>
                        <IconButton edge="end" onClick={() => navigate(`/update-location?loc=${location._id}`)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={commonStrings.DELETE}>
                        <IconButton edge="end" data-id={location._id} data-index={index} onClick={handleDelete}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </div>
                  )
                }
              >
                <ListItemAvatar>
                  <Avatar
                    type={bookcarsTypes.RecordType.Location}
                    mode="update"
                    record={location}
                    size="medium"
                    readonly
                    color="disabled"
                    className="location-image"
                  />
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography className="location-title">{location.name}</Typography>
                  }
                  secondary={location.country?.name && location.country.name}
                />
              </ListItem>
            ))}
          </List>
        )}
        <Dialog disableEscapeKeyDown maxWidth="xs" open={openInfoDialog}>
          <DialogTitle className="dialog-header">{commonStrings.INFO}</DialogTitle>
          <DialogContent>{strings.CANNOT_DELETE_LOCATION}</DialogContent>
          <DialogActions className="dialog-actions">
            <Button onClick={handleCloseInfo} variant="contained" className="btn-secondary">
              {commonStrings.CLOSE}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog disableEscapeKeyDown maxWidth="xs" open={openDeleteDialog}>
          <DialogTitle className="dialog-header">{commonStrings.CONFIRM_TITLE}</DialogTitle>
          <DialogContent>{strings.DELETE_LOCATION}</DialogContent>
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

export default LocationList
