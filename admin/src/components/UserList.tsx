import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
} from '@mui/x-data-grid'
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
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/user-list'
import * as helper from '@/utils/helper'
import * as UserService from '@/services/UserService'

import '@/assets/css/user-list.css'

interface UserListProps {
  types?: bookcarsTypes.UserType[]
  keyword?: string
  user?: bookcarsTypes.User
  hideDesktopColumns?: boolean
  checkboxSelection?: boolean
  onLoad?: bookcarsTypes.DataEvent<bookcarsTypes.User>
}

const UserList = ({
  types: userListTypes,
  keyword: userListKeyword,
  user: userListUser,
  hideDesktopColumns,
  checkboxSelection,
  onLoad
}: UserListProps) => {
  const navigate = useNavigate()

  const [user, setUser] = useState<bookcarsTypes.User>()
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(env.PAGE_SIZE)
  const [columns, setColumns] = useState<GridColDef<bookcarsTypes.User>[]>([])
  const [rows, setRows] = useState<bookcarsTypes.User[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [types, setTypes] = useState<bookcarsTypes.UserType[]>()
  const [keyword, setKeyword] = useState(userListKeyword)
  const [reloadColumns, setReloadColumns] = useState(false)
  const [paginationModel, setPaginationModel] = useState({
    pageSize: env.PAGE_SIZE,
    page: 0,
  })

  useEffect(() => {
    setPage(paginationModel.page)
    setPageSize(paginationModel.pageSize)
  }, [paginationModel])

  const fetchData = async (_page: number, _user?: bookcarsTypes.User) => {
    try {
      if (_user && types) {
        setLoading(true)

        const payload: bookcarsTypes.GetUsersBody = {
          user: (_user && _user._id) || '',
          types
        }

        const data = await UserService.getUsers(payload, keyword || '', _page + 1, pageSize)
        const _data = data && data.length > 0 ? data[0] : { pageInfo: { totalRecord: 0 }, resultData: [] }
        if (!_data) {
          helper.error()
          return
        }
        const totalRecords = Array.isArray(_data.pageInfo) && _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0
        const _rows = _data.resultData

        setRows(_rows)
        setRowCount(totalRecords)

        if (onLoad) {
          onLoad({ rows: _data.resultData, rowCount: totalRecords })
        }
      }
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setTypes(userListTypes)
  }, [userListTypes])

  useEffect(() => {
    setKeyword(userListKeyword || '')
  }, [userListKeyword])

  useEffect(() => {
    if (types) {
      fetchData(page, user)
    }
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (types) {
      if (page === 0) {
        fetchData(0, user)
      } else {
        const _paginationModel = bookcarsHelper.clone(paginationModel)
        _paginationModel.page = 0
        setPaginationModel(_paginationModel)
      }
    }
  }, [pageSize]) // eslint-disable-line react-hooks/exhaustive-deps

  const getColumns = (_user: bookcarsTypes.User): GridColDef<bookcarsTypes.User>[] => {
    const _columns: GridColDef<bookcarsTypes.User>[] = [
      {
        field: 'fullName',
        headerName: commonStrings.USER,
        flex: 1,
        renderCell: ({ row, value }: GridRenderCellParams<bookcarsTypes.User, string>) => {
          const __user = row
          let userAvatar

          if (__user.avatar) {
            if (__user.type === bookcarsTypes.RecordType.Supplier) {
              userAvatar = <img src={bookcarsHelper.joinURL(env.CDN_USERS, row.avatar)} alt={row.fullName} />
            } else {
              const userAvatarUrl = __user.avatar
                ? (__user.avatar.startsWith('http') ? __user.avatar : bookcarsHelper.joinURL(env.CDN_USERS, __user.avatar))
                : ''

              const avatar = <Avatar src={userAvatarUrl} className="avatar-small" />
              if (__user.verified) {
                userAvatar = (
                  <Badge
                    overlap="circular"
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'right',
                    }}
                    badgeContent={(
                      <Tooltip title={commonStrings.VERIFIED}>
                        <Box borderRadius="50%" className="user-avatar-verified-small">
                          <VerifiedIcon className="user-avatar-verified-icon-small" />
                        </Box>
                      </Tooltip>
                    )}
                  >
                    {avatar}
                  </Badge>
                )
              } else {
                userAvatar = (
                  <Badge
                    overlap="circular"
                  >
                    {avatar}
                  </Badge>
                )
              }
            }
          } else {
            const avatar = <AccountCircle className="avatar-small" color="disabled" />

            if (__user.verified) {
              userAvatar = (
                <Badge
                  overlap="circular"
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  badgeContent={(
                    <Tooltip title={commonStrings.VERIFIED}>
                      <Box borderRadius="50%" className="user-avatar-verified-small">
                        <VerifiedIcon className="user-avatar-verified-icon-small" />
                      </Box>
                    </Tooltip>
                  )}
                >
                  {avatar}
                </Badge>
              )
            } else {
              userAvatar = (
                <Badge
                  overlap="circular"
                >
                  {avatar}
                </Badge>
              )
            }
          }

          return (
            <Link href={`/user?u=${row._id}`} className="us-user">
              <span className="us-avatar">{userAvatar}</span>
              <span>{value}</span>
            </Link>
          )
        },
        valueGetter: (value: string) => value,
      },
      {
        field: 'email',
        headerName: commonStrings.EMAIL,
        flex: 1,
        valueGetter: (value: string) => value,
      },
      {
        field: 'phone',
        headerName: commonStrings.PHONE,
        flex: 1,
        valueGetter: (value: string) => value,
      },
      {
        field: 'type',
        headerName: commonStrings.TYPE,
        flex: 1,
        renderCell: ({ value }: GridRenderCellParams<bookcarsTypes.User, bookcarsTypes.UserType>) => <span className={`bs us-${value?.toLowerCase()}`}>{helper.getUserType(value)}</span>,
        valueGetter: (value: string) => value,
      },
      {
        field: 'action',
        headerName: '',
        sortable: false,
        disableColumnMenu: true,
        renderCell: ({ row }: GridRenderCellParams<bookcarsTypes.User>) => {
          const handleDelete = (e: React.MouseEvent<HTMLElement>) => {
            e.stopPropagation() // don't select this row after clicking
            setSelectedId(row._id || '')
            setOpenDeleteDialog(true)
          }

          const __user = row
          return _user.type === bookcarsTypes.RecordType.Admin || __user.supplier === _user._id ? (
            <div>
              <Tooltip title={commonStrings.UPDATE}>
                <IconButton onClick={() => navigate(`/update-user?u=${row._id}`)}>
                  <EditIcon />
                </IconButton>
              </Tooltip>
              {/* <Tooltip title={commonStrings.DELETE}>
                <IconButton onClick={handleDelete}>
                  <DeleteIcon />
                </IconButton>
              </Tooltip> */}
            </div>
          ) : (
            <></>
          )
        },
        renderHeader: () => (selectedIds.length > 0 ? (
          <div>
            <div style={{ width: 40, display: 'inline-block' }} />
            {/* <Tooltip title={strings.DELETE_SELECTION}>
              <IconButton
                onClick={() => {
                  setOpenDeleteDialog(true)
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip> */}
          </div>
        ) : (
          <></>
        )),
      },
    ]

    if (hideDesktopColumns) {
      _columns.splice(1, 3)
    }

    return _columns
  }

  useEffect(() => {
    if (userListUser && types) {
      setUser(userListUser)
      const _columns = getColumns(userListUser)
      setColumns(_columns)

      if (page === 0) {
        fetchData(0, userListUser)
      } else {
        const _paginationModel = bookcarsHelper.clone(paginationModel)
        _paginationModel.page = 0
        setPaginationModel(_paginationModel)
      }
    }
  }, [userListUser, types, keyword]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user && reloadColumns) {
      const _columns = getColumns(user)
      setColumns(_columns)
      setReloadColumns(false)
    }
  }, [user, selectedIds, reloadColumns]) // eslint-disable-line react-hooks/exhaustive-deps

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
        helper.error()
      }
    } catch (err) {
      helper.error(err)
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
            pagination: { paginationModel: { pageSize: env.PAGE_SIZE } },
          }}
          pageSizeOptions={[env.PAGE_SIZE, 50, 100]}
          pagination
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          onRowSelectionModelChange={(_selectedIds) => {
            setSelectedIds(Array.from(new Set(_selectedIds.ids)).map((id) => id.toString()))
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
