import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search as SearchIcon, Edit, Trash2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import Layout from '@/components/Layout'
import PageContainer from '@/components/PageContainer'
import env from '@/config/env.config'
import { strings } from '@/lang/users'
import { strings as commonStrings } from '@/lang/common'
import * as helper from '@/utils/helper'
import * as UserService from '@/services/UserService'

import '@/assets/css/users.css'

const Users = () => {
  const navigate = useNavigate()

  const [user, setUser] = useState<bookcarsTypes.User>()
  const [admin, setAdmin] = useState(false)
  const [users, setUsers] = useState<bookcarsTypes.User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<bookcarsTypes.User[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [page] = useState(0)
  const [pageSize] = useState(20)

  const fetchUsers = async (_user: bookcarsTypes.User, _page: number = 0) => {
    try {
      setLoading(true)
      const _admin = helper.admin(_user)
      
      const _types = _admin
        ? helper.getUserTypes().map((userType) => userType.value)
        : [bookcarsTypes.UserType.Supplier, bookcarsTypes.UserType.User]

      const payload: bookcarsTypes.GetUsersBody = {
        user: _user._id || '',
        types: _types,
      }

      const data = await UserService.getUsers(payload, _page + 1, pageSize, '')
      const _data = data && data.length > 0 ? data[0] : { pageInfo: { totalRecord: 0 }, resultData: [] }
      
      if (!_data) {
        helper.error()
        return
      }
      
      const totalRecords = Array.isArray(_data.pageInfo) && _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0
      
      setUsers(_data.resultData)
      setFilteredUsers(_data.resultData)
      setTotalCount(totalRecords)
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  const onLoad = (_user?: bookcarsTypes.User) => {
    if (_user) {
      const _admin = helper.admin(_user)
      setUser(_user)
      setAdmin(_admin)
      fetchUsers(_user, 0)
    }
  }

  // Filter users based on search and type
  useEffect(() => {
    let filtered = [...users]

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((u) => {
        const fullName = u.fullName?.toLowerCase() || ''
        const email = u.email?.toLowerCase() || ''
        
        return fullName.includes(query) || email.includes(query)
      })
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((u) => u.type === typeFilter)
    }

    setFilteredUsers(filtered)
  }, [searchQuery, typeFilter, users])

  const getUserTypeBadge = (type: bookcarsTypes.UserType) => {
    switch (type) {
      case bookcarsTypes.UserType.Admin:
        return 'bg-purple-100 text-purple-700 hover:bg-purple-100'
      case bookcarsTypes.UserType.Supplier:
        return 'bg-blue-100 text-blue-700 hover:bg-blue-100'
      case bookcarsTypes.UserType.User:
        return 'bg-green-100 text-green-700 hover:bg-green-100'
      default:
        return 'bg-gray-100 text-gray-700 hover:bg-gray-100'
    }
  }

  const getUserTypeLabel = (type: bookcarsTypes.UserType) => {
    switch (type) {
      case bookcarsTypes.UserType.Admin:
        return 'Admin'
      case bookcarsTypes.UserType.Supplier:
        return 'Supplier'
      case bookcarsTypes.UserType.User:
        return 'Customer'
      default:
        return type
    }
  }

  return (
    <Layout onLoad={onLoad} strict>
      {user && (
        <PageContainer>
          {/* Page Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
              <p className="text-sm text-gray-500 mt-1">
                {totalCount} total user{totalCount !== 1 ? 's' : ''}
              </p>
            </div>
            <Button 
              onClick={() => navigate('/create-user')}
              className="gap-2"
              size="default"
            >
              <Plus className="h-4 w-4" />
              {strings.NEW_USER}
            </Button>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {admin && (
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value={bookcarsTypes.UserType.Admin}>Admin</SelectItem>
                  <SelectItem value={bookcarsTypes.UserType.Supplier}>Supplier</SelectItem>
                  <SelectItem value={bookcarsTypes.UserType.User}>Customer</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Table Card */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">USER</TableHead>
                    <TableHead className="font-semibold">TYPE</TableHead>
                    <TableHead className="font-semibold">EMAIL</TableHead>
                    <TableHead className="font-semibold">VERIFIED</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        Loading users...
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((u) => (
                      <TableRow 
                        key={u._id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/user?u=${u._id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                              {u.avatar ? (
                                <img 
                                  src={bookcarsHelper.joinURL(env.CDN_USERS, u.avatar)}
                                  alt={u.fullName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-gray-500 font-semibold">
                                  {u.fullName?.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <span className="font-semibold text-gray-900">{u.fullName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getUserTypeBadge(u.type as bookcarsTypes.UserType)}>
                            {getUserTypeLabel(u.type as bookcarsTypes.UserType)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-600">{u.email}</TableCell>
                        <TableCell>
                          {u.verified ? (
                            <div className="flex items-center gap-2 text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-sm">Verified</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">Not verified</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`/update-user?u=${u._id}`)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation()
                                // TODO: Implement delete functionality
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </PageContainer>
      )}
    </Layout>
  )
}

export default Users
