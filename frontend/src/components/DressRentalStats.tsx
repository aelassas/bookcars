import React, { useState, useEffect } from 'react'
import {
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material'
import { Dress } from ':bookcars-types'
import * as DressService from '../services/DressService'
import { strings } from '../lang/dresses'
import { strings as commonStrings } from '../lang/common'

interface DressRentalStatsProps {
  className?: string
}

const DressRentalStats: React.FC<DressRentalStatsProps> = ({ className }) => {
  const [loading, setLoading] = useState(true)
  const [dresses, setDresses] = useState<Dress[]>([])
  const [topDresses, setTopDresses] = useState<Dress[]>([])
  const [totalRentals, setTotalRentals] = useState(0)
  const [averageRentals, setAverageRentals] = useState(0)
  const [typeStats, setTypeStats] = useState<{ [key: string]: number }>({})
  const [sizeStats, setSizeStats] = useState<{ [key: string]: number }>({})

  useEffect(() => {
    fetchDresses()
  }, [])

  const fetchDresses = async () => {
    try {
      setLoading(true)
      const result = await DressService.getDresses(1, 100)
      const fetchedDresses = result.data.docs

      // Calculate total rentals
      const total = fetchedDresses.reduce((sum: number, dress: any) => sum + (dress.rentals || 0), 0)
      setTotalRentals(total)

      // Calculate average rentals
      const avg = fetchedDresses.length > 0 ? total / fetchedDresses.length : 0
      setAverageRentals(avg)

      // Get top 5 dresses by rentals
      const sorted = [...fetchedDresses].sort((a, b) => (b.rentals || 0) - (a.rentals || 0))
      setTopDresses(sorted.slice(0, 5))

      // Calculate rentals by dress type
      const typeData: { [key: string]: number } = {}
      fetchedDresses.forEach((dress: any) => {
        const type = dress.type
        if (!typeData[type]) {
          typeData[type] = 0
        }
        typeData[type] += dress.rentals || 0
      })
      setTypeStats(typeData)

      // Calculate rentals by dress size
      const sizeData: { [key: string]: number } = {}
      fetchedDresses.forEach((dress: any) => {
        const size = dress.size
        if (!sizeData[size]) {
          sizeData[size] = 0
        }
        sizeData[size] += dress.rentals || 0
      })
      setSizeStats(sizeData)

      setDresses(fetchedDresses)
    } catch (error) {
      console.error('Error fetching dresses:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDressTypeName = (type: string) => {
    switch (type) {
      case 'Wedding': return strings.WEDDING
      case 'Evening': return strings.EVENING
      case 'Cocktail': return strings.COCKTAIL
      case 'Prom': return strings.PROM
      default: return strings.OTHER
    }
  }

  const getDressSizeName = (size: string) => {
    switch (size) {
      case 'XS': return strings.SIZE_XS || 'XS'
      case 'S': return strings.SIZE_S || 'S'
      case 'M': return strings.SIZE_M || 'M'
      case 'L': return strings.SIZE_L || 'L'
      case 'XL': return strings.SIZE_XL || 'XL'
      case 'XXL': return strings.SIZE_XXL || 'XXL'
      default: return strings.SIZE_CUSTOM || 'Custom'
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Paper className={className} elevation={3} sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {strings.RENTAL_STATISTICS || 'Rental Statistics'}
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
        <Card sx={{ flex: '1 1 250px' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {strings.TOTAL_RENTALS || 'Total Rentals'}
            </Typography>
            <Typography variant="h3">{totalRentals}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: '1 1 250px' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {strings.AVERAGE_RENTALS || 'Average Rentals'}
            </Typography>
            <Typography variant="h3">{averageRentals.toFixed(1)}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: '1 1 250px' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {strings.TOTAL_DRESSES || 'Total Dresses'}
            </Typography>
            <Typography variant="h3">{dresses.length}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: '1 1 250px' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {strings.RENTED_DRESSES || 'Rented Dresses'}
            </Typography>
            <Typography variant="h3">
              {dresses.filter(d => (d.rentals || 0) > 0).length}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 400px' }}>
          <Typography variant="h5" gutterBottom>
            {strings.TOP_DRESSES || 'Top Dresses'}
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{strings.NAME}</TableCell>
                  <TableCell>{strings.DRESS_TYPE}</TableCell>
                  <TableCell align="right">{strings.RENTALS_COUNT || 'Rentals'}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topDresses.map((dress) => (
                  <TableRow key={dress._id}>
                    <TableCell>{dress.name}</TableCell>
                    <TableCell>{getDressTypeName(dress.type)}</TableCell>
                    <TableCell align="right">{dress.rentals || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
        <Box sx={{ flex: '1 1 400px' }}>
          <Typography variant="h5" gutterBottom>
            {strings.RENTALS_BY_TYPE || 'Rentals by Type'}
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{strings.DRESS_TYPE}</TableCell>
                  <TableCell align="right">{strings.RENTALS_COUNT || 'Rentals'}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(typeStats).map(([type, count]) => (
                  <TableRow key={type}>
                    <TableCell>{getDressTypeName(type)}</TableCell>
                    <TableCell align="right">{count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>
    </Paper>
  )
}

export default DressRentalStats
