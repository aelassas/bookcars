import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Container,
  Typography,
  Button,
  Grid,
  Box,
  Paper,
  Divider
} from '@mui/material'
import { Add as AddIcon } from '@mui/icons-material'
import Layout from '../components/Layout'
import DressList from '../components/DressList'
import DressTypeFilter from '../components/DressTypeFilter'
import DressSizeFilter from '../components/DressSizeFilter'
import DressStyleFilter from '../components/DressStyleFilter'
import DepositFilter from '../components/DepositFilter'
// import AvailabilityFilter from '../components/AvailabilityFilter'
import RentalsCountFilter from '../components/RentalsCountFilter'
import SearchBox from '../components/SearchBox'
import * as helper from '../common/helper'
import { strings } from '../lang/dresses'
import { strings as commonStrings } from '../lang/common'

const Dresses: React.FC = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dressType, setDressType] = useState('')
  const [dressSize, setDressSize] = useState('')
  const [dressStyle, setDressStyle] = useState('')
  const [deposit, setDeposit] = useState<number>(0)
  const [availability, setAvailability] = useState('')
  const [rentalsCount, setRentalsCount] = useState('')
  const [keyword, setKeyword] = useState('')
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [reload, setReload] = useState(false)
  const [admin, setAdmin] = useState(false)

  useEffect(() => {
    const currentUser = helper.getUser()
    setUser(currentUser)
    setAdmin(helper.admin(currentUser))
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

  const handleDepositFilterChange = (value: number) => {
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

  const handleDressListLoad = (_data: any[]) => {
    setLoading(false)
    if (reload) {
      setReload(false)
    }
  }

  const handleDressDelete = () => {
    setReload(true)
  }

  const handleCreateDress = () => {
    navigate('/create-dress')
  }

  return (
    <Layout>
      {!loading && (
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h4" gutterBottom>
              {strings.DRESSES}
            </Typography>
            {user && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleCreateDress}
              >
                {strings.NEW_DRESS}
              </Button>
            )}
          </Box>

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
            <Box sx={{ width: { xs: '100%', md: '25%' } }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  {commonStrings.FILTERS}
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Box sx={{ mb: 2 }}>
                  <SearchBox
                    placeholder={commonStrings.SEARCH_PLACEHOLDER}
                    onChange={handleSearch}
                    className="dress-search"
                  />
                </Box>

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
                {/* {admin && (
                  <AvailabilityFilter
                    className="dress-filter"
                    onChange={handleAvailabilityFilterChange}
                  />
                )} */}
              </Paper>
            </Box>
            <Box sx={{ width: { xs: '100%', md: '75%' } }}>
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
            </Box>
          </Box>
        </Container>
      )}
    </Layout>
  )
}

export default Dresses
