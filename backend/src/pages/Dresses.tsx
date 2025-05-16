import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  FormControl,
  InputLabel,
  Input,
  FormHelperText,
  Paper,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Tooltip,
  IconButton,
} from '@mui/material'
import {
  Add as AddIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Info as InfoIcon,
} from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/dresses'
import * as helper from '@/common/helper'
import * as SupplierService from '@/services/SupplierService'
import * as UserService from '@/services/UserService'
import Layout from '@/components/Layout'
import DressList from '@/components/DressList'
import DressTypeFilter from '@/components/DressTypeFilter'
import DressSizeFilter from '@/components/DressSizeFilter'
import DressStyleFilter from '@/components/DressStyleFilter'
import DepositFilter from '@/components/DepositFilter'
import AvailabilityFilter from '@/components/AvailabilityFilter'
import RentalsCountFilter from '@/components/RentalsCountFilter'
import SearchBox from '@/components/SearchBox'

import '../assets/css/dresses.css'

const Dresses = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState<bookcarsTypes.User>()
  const [admin, setAdmin] = useState(false)
  const [allSuppliers, setAllSuppliers] = useState<bookcarsTypes.User[]>([])
  const [suppliers, setSuppliers] = useState<string[]>([])
  const [dressType, setDressType] = useState('')
  const [dressSize, setDressSize] = useState('')
  const [dressStyle, setDressStyle] = useState('')
  const [deposit, setDeposit] = useState('')
  const [availability, setAvailability] = useState('')
  const [rentalsCount, setRentalsCount] = useState('')
  const [keyword, setKeyword] = useState('')
  const [reload, setReload] = useState(false)
  const [loading, setLoading] = useState(true)
  const [rowCount, setRowCount] = useState(0)

  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = UserService.getCurrentUser()
        if (currentUser) {
          const _admin = helper.admin(currentUser)
          setUser(currentUser)
          setAdmin(_admin)

          const _allSuppliers = await SupplierService.getAllSuppliers()
          const _suppliers = _admin ? _allSuppliers.map((supplier) => supplier._id) : [currentUser._id]
          setAllSuppliers(_allSuppliers)
          setSuppliers(_suppliers)
        }
      } catch (err) {
        helper.error(err)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [])

  const handleDressTypeFilterChange = (value: string) => {
    setDressType(value)
    setReload(true)
  }

  const handleDressSizeFilterChange = (value: string) => {
    setDressSize(value)
    setReload(true)
  }

  const handleDressStyleFilterChange = (value: string) => {
    setDressStyle(value)
    setReload(true)
  }

  const handleDepositFilterChange = (value: string) => {
    setDeposit(value)
    setReload(true)
  }

  const handleAvailabilityFilterChange = (value: string) => {
    setAvailability(value)
    setReload(true)
  }

  const handleRentalsCountFilterChange = (value: string) => {
    setRentalsCount(value)
    setReload(true)
  }

  const handleSearch = (newKeyword: string) => {
    setKeyword(newKeyword)
    setReload(true)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter') {
      setReload(true)
    }
  }

  const handleDressListLoad = (data: bookcarsTypes.DataEvent<bookcarsTypes.Dress>) => {
    if (data && data.rowCount !== undefined) {
      setRowCount(data.rowCount)
    }
  }

  const handleDressDelete = (_rowCount: number) => {
    setRowCount(_rowCount)
  }

  return (
    <Layout>
      {user && (
        <div className="dresses">
          <div className="col-1">
            <div className="col-1-container">
              <SearchBox
                className="dress-search"
                onSubmit={handleSearch}
              />

              <Button
                variant="contained"
                className="btn-primary new-dress"
                startIcon={<AddIcon />}
                onClick={() => {
                  navigate('/create-dress')
                }}
              >
                {strings.NEW_DRESS}
              </Button>

              <div className="dress-filters">
                <DressTypeFilter
                  className="dress-filter"
                  onChange={handleDressTypeFilterChange}
                />
                <DressSizeFilter
                  className="dress-filter"
                  onChange={handleDressSizeFilterChange}
                />
                <DressStyleFilter
                  className="dress-filter"
                  onChange={handleDressStyleFilterChange}
                />
                <DepositFilter
                  className="dress-filter"
                  onChange={handleDepositFilterChange}
                />
                <RentalsCountFilter
                  className="dress-filter"
                  onChange={handleRentalsCountFilterChange}
                />
                {admin && (
                  <AvailabilityFilter
                    className="dress-filter"
                    onChange={handleAvailabilityFilterChange}
                  />
                )}
              </div>
            </div>
          </div>
          <div className="col-2">
            <div className="col-2-container">
              <DressList
                user={user}
                suppliers={suppliers}
                dressType={dressType}
                dressSize={dressSize}
                dressStyle={dressStyle}
                deposit={deposit}
                availability={availability}
                rentalsCount={rentalsCount}
                keyword={keyword}
                loading={loading}
                onLoad={handleDressListLoad}
                onDelete={handleDressDelete}
              />
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default Dresses
