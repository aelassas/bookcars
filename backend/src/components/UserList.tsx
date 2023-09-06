import React, { useState, useEffect } from 'react'
import Env from '../config/env.config'
import { strings as commonStrings } from '../lang/common'
import { strings } from '../lang/user-list'
import * as Helper from '../common/Helper'
import * as UserService from '../services/UserService'
import { DataGrid, frFR, enUS, GridColDef } from '@mui/x-data-grid'
import {
  Tooltip,
  IconButton,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Avatar,
  Badge,
  Box
} from '@mui/material'
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  AccountCircle, Check as VerifiedIcon
} from '@mui/icons-material'
import * as bookcarsTypes from 'bookcars-types'
import * as bookcarsHelper from 'bookcars-helper'

import '../assets/css/user-list.css'

const UserList = (
  {
    types: userListTypes,
    keyword: userListKeyword,
    reload: userListReload,
    user: userListUser,
    hideDesktopColumns,
    checkboxSelection,
    onLoad
  }: {
    types?: bookcarsTypes.UserType[]
    keyword?: string
    reload?: boolean
    user?: bookcarsTypes.User
    hideDesktopColumns?: boolean
    checkboxSelection?: boolean
    onLoad: bookcarsTypes.DataEvent<bookcarsTypes.User>
  }) => {
  const [user, setUser] = useState<bookcarsTypes.User>()
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(Env.PAGE_SIZE)
  const [columns, setColumns] = useState<GridColDef<bookcarsTypes.User>[]>([])
  const [rows, setRows] = useState<bookcarsTypes.User[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [types, setTypes] = useState<bookcarsTypes.UserType[]>(userListTypes || [])
  const [keyword, setKeyword] = useState(userListKeyword)
  const [reload, setReload] = useState(userListReload)
  const [reloadColumns, setReloadColumns] = useState(false)
  const [paginationModel, setPaginationModel] = useState({
    pageSize: Env.PAGE_SIZE,
    page: 0,
  })

  useEffect(() => {
    setPage(paginationModel.page)
    setPageSize(paginationModel.pageSize)
  }, [paginationModel])

  const _fetch = async (page: number, user?: bookcarsTypes.User) => {
    try {
      setLoading(true)

      const payload: bookcarsTypes.GetUsersBody =
      {
        user: (user && user._id) || '',
        types
      }

      const data = await UserService.getUsers(payload, keyword || '', page + 1, pageSize)
      const _data = data && data.length > 0 ? data[0] : { pageInfo: { totalRecord: 0 }, resultData: [] }
      if (!_data) {
        Helper.error()
        return
      }
      const totalRecords = Array.isArray(_data.pageInfo) && _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0
      const _rows = _data.resultData

      setRows(_rows)
      setRowCount(totalRecords)

      if (onLoad) {
        onLoad({ rows: _data.resultData, rowCount: totalRecords })
      }
    } catch (err) {
      Helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setTypes(userListTypes || [])
  }, [userListTypes])

  useEffect(() => {
    setKeyword(userListKeyword || '')
  }, [userListKeyword])

  useEffect(() => {
    setReload(userListReload || false)
  }, [userListReload])

  useEffect(() => {
    if (userListUser) {
      const columns = getColumns(userListUser)
      setColumns(columns)
      setUser(userListUser)
      _fetch(page, userListUser)
    }
  }, [userListUser, page, pageSize, types, keyword]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (reload) {
      setPage(0)
      _fetch(0, user)
    }
  }, [reload]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user && reloadColumns) {
      const columns = getColumns(user)
      setColumns(columns)
      setReloadColumns(false)
    }
  }, [user, selectedIds, reloadColumns]) // eslint-disable-line react-hooks/exhaustive-deps

  const getColumns = (user: bookcarsTypes.User) => {
    const columns = [
      {
        field: 'fullName',
        headerName: commonStrings.USER,
        flex: 1,
        renderCell: (params: any) => {
          const user = params.row
          let userAvatar

          if (user.avatar) {
            if (user.type === bookcarsTypes.RecordType.Company) {
              userAvatar = <img src={bookcarsHelper.joinURL(Env.CDN_USERS, params.row.avatar)} alt={params.row.fullName} />
            } else {
              const avatar = <Avatar src={bookcarsHelper.joinURL(Env.CDN_USERS, params.row.avatar)} className="avatar-small" />
              if (user.verified) {
                userAvatar = (
                  <Badge
                    overlap="circular"
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'right',
                    }}
                    badgeContent={
                      <Tooltip title={commonStrings.VERIFIED}>
                        <Box borderRadius="50%" className="user-avatar-verified-small">
                          <VerifiedIcon className="user-avatar-verified-icon-small" />
                        </Box>
                      </Tooltip>
                    }
                  >
                    {avatar}
                  </Badge>
                )
              } else {
                userAvatar = avatar
              }
            }
          } else {
            const avatar = <AccountCircle className="avatar-small" color="disabled" />

            if (user.verified) {
              userAvatar = (
                <Badge
                  overlap="circular"
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  badgeContent={
                    <Tooltip title={commonStrings.VERIFIED}>
                      <Box borderRadius="50%" className="user-avatar-verified-small">
                        <VerifiedIcon className="user-avatar-verified-icon-small" />
                      </Box>
                    </Tooltip>
                  }
                >
                  {avatar}
                </Badge>
              )
            } else {
              userAvatar = avatar
            }
          }

          return (
            <Link href={`/user?u=${params.row._id}`} className="us-user">
              <span className="us-avatar">{userAvatar}</span>
              <span>{params.value}</span>
            </Link>
          )
        },
        valueGetter: (params: any) => params.value,
      },
      {
        field: 'email',
        headerName: commonStrings.EMAIL,
        flex: 1,
        valueGetter: (params: any) => params.value,
      },
      {
        field: 'phone',
        headerName: commonStrings.PHONE,
        flex: 1,
        valueGetter: (params: any) => params.value,
      },
      {
        field: 'type',
        headerName: commonStrings.TYPE,
        flex: 1,
        renderCell: (params: any) => <span className={`bs us-${params.value}`}>{Helper.getUserType(params.value)}</span>,
        valueGetter: (params: any) => params.value,
      },
      {
        field: 'action',
        headerName: '',
        sortable: false,
        disableColumnMenu: true,
        renderCell: (params: any) => {
          const handleDelete = (e: React.MouseEvent<HTMLElement>) => {
            e.stopPropagation() // don't select this row after clicking
            setSelectedId(params.row._id)
            setOpenDeleteDialog(true)
          }

          const _user = params.row
          return user.type === bookcarsTypes.RecordType.Admin || _user.company === user._id ? (
            <div>
              <Tooltip title={commonStrings.UPDATE}>
                <IconButton href={`update-user?u=${params.row._id}`}>
                  <EditIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={commonStrings.DELETE}>
                <IconButton onClick={handleDelete}>
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </div>
          ) : (
            <></>
          )
        },
        renderHeader: () => {
          return selectedIds.length > 0 ? (
            <div>
              <div style={{ width: 40, display: 'inline-block' }}></div>
              <Tooltip title={strings.DELETE_SELECTION}>
                <IconButton
                  onClick={() => {
                    setOpenDeleteDialog(true)
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </div>
          ) : (
            <></>
          )
        },
      },
    ]

    if (hideDesktopColumns) {
      columns.splice(1, 3)
    }

    return columns
  }

  const handleCancelDelete = () => {
    setOpenDeleteDialog(false)
    setSelectedId('')
  }

  const handleConfirmDelete = async () => {
    try {
      const ids = selectedIds.length > 0 ? selectedIds : [selectedId]

      setOpenDeleteDialog(false)

      const status = await UserService.deleteUsers(ids)

      if (status === 200) {
        if (selectedIds.length > 0) {
          setRows(rows.filter((row) => !selectedIds.includes(row._id as string)))
        } else {
          setRows(rows.filter((row) => row._id !== selectedId))
        }
      } else {
        Helper.error()
      }
    } catch (err) {
      Helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="us-list">
      {user && columns.length > 0 && (
        <DataGrid
          checkboxSelection={checkboxSelection}
          getRowId={(row) => row._id as string}
          columns={columns}
          rows={rows}
          rowCount={rowCount}
          loading={loading}
          initialState={{
            pagination: { paginationModel: { pageSize: Env.PAGE_SIZE } },
          }}
          pageSizeOptions={[Env.PAGE_SIZE, 50, 100]}
          pagination
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          localeText={(user.language === 'fr' ? frFR : enUS).components.MuiDataGrid.defaultProps.localeText}
          // slots={{
          //   noRowsOverlay: () => '',
          // }}
          onRowSelectionModelChange={(selectedIds) => {
            setSelectedIds(Array.from(new Set(selectedIds)).map(id => id.toString()))
            setReloadColumns(true)
          }}
          getRowClassName={(params: any) => (params.row.blacklisted ? 'us-blacklisted' : '')}
          disableRowSelectionOnClick
        />
      )}

      <Dialog disableEscapeKeyDown maxWidth="xs" open={openDeleteDialog}>
        <DialogTitle className="dialog-header">{commonStrings.CONFIRM_TITLE}</DialogTitle>
        <DialogContent className="dialog-content">{selectedIds.length === 0 ? strings.DELETE_USER : strings.DELETE_USERS}</DialogContent>
        <DialogActions className="dialog-actions">
          <Button onClick={handleCancelDelete} variant="contained" className="btn-secondary">
            {commonStrings.CANCEL}
          </Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error">
            {commonStrings.DELETE}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default UserList
