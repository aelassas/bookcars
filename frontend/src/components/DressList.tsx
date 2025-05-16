import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DataGrid,
  GridColDef,
  GridValueGetterParams,
  GridRenderCellParams,
} from '@mui/x-data-grid'
import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material'
import { Edit, Delete } from '@mui/icons-material'
import { strings } from '../lang/common'
import * as helper from '../common/helper'
import * as DressService from '../services/DressService'
import { Dress } from ':bookcars-types'

interface DressListProps {
  user?: any
  suppliers?: any[]
  dressType?: string
  dressSize?: string
  dressStyle?: string
  deposit?: string
  availability?: string
  rentalsCount?: string
  keyword?: string
  loading?: boolean
  onLoad?: (data: Dress[]) => void
  onDelete?: () => void
}

const DressList: React.FC<DressListProps> = ({
  user,
  suppliers,
  dressType,
  dressSize,
  dressStyle,
  deposit,
  availability,
  rentalsCount,
  keyword,
  loading: externalLoading,
  onLoad,
  onDelete
}) => {
  const navigate = useNavigate()
  const [dresses, setDresses] = useState<Dress[]>([])
  const [filteredDresses, setFilteredDresses] = useState<Dress[]>([])
  const [loading, setLoading] = useState(false)
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedDress, setSelectedDress] = useState<Dress | null>(null)
  const [sortModel, setSortModel] = useState([{ field: 'rentals', sort: 'desc' as 'asc' | 'desc' }])

  useEffect(() => {
    fetchDresses()
  }, [])

  useEffect(() => {
    if (dresses.length > 0) {
      filterDresses()
    }
  }, [dresses, dressType, dressSize, dressStyle, deposit, availability, rentalsCount, keyword])

  const fetchDresses = async () => {
    try {
      setLoading(true)
      const result = await DressService.getDresses(1, 100)
      const fetchedDresses = result.data.docs
      setDresses(fetchedDresses)
      setFilteredDresses(fetchedDresses)
      if (onLoad) {
        onLoad(fetchedDresses)
      }
    } catch (error) {
      console.error('Error fetching dresses:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterDresses = () => {
    let filtered = [...dresses]

    // Filter by dress type
    if (dressType) {
      filtered = filtered.filter(dress => dress.type === dressType)
    }

    // Filter by dress size
    if (dressSize) {
      filtered = filtered.filter(dress => dress.size === dressSize)
    }

    // Filter by dress style
    if (dressStyle) {
      filtered = filtered.filter(dress => dress.style === dressStyle)
    }

    // Filter by deposit
    if (deposit) {
      const depositValue = parseInt(deposit, 10)
      filtered = filtered.filter(dress => dress.deposit <= depositValue)
    }

    // Filter by availability
    if (availability) {
      filtered = filtered.filter(dress => dress.available === (availability === 'available'))
    }

    // Filter by rentals count
    if (rentalsCount) {
      if (rentalsCount === '0') {
        filtered = filtered.filter(dress => !dress.rentals || dress.rentals === 0)
      } else if (rentalsCount === '1-5') {
        filtered = filtered.filter(dress => dress.rentals && dress.rentals >= 1 && dress.rentals <= 5)
      } else if (rentalsCount === '6-10') {
        filtered = filtered.filter(dress => dress.rentals && dress.rentals >= 6 && dress.rentals <= 10)
      } else if (rentalsCount === '11-20') {
        filtered = filtered.filter(dress => dress.rentals && dress.rentals >= 11 && dress.rentals <= 20)
      } else if (rentalsCount === '20+') {
        filtered = filtered.filter(dress => dress.rentals && dress.rentals > 20)
      }
    }

    // Filter by keyword
    if (keyword) {
      const lowerKeyword = keyword.toLowerCase()
      filtered = filtered.filter(dress =>
        dress.name.toLowerCase().includes(lowerKeyword) ||
        (dress.supplier && typeof dress.supplier === 'object' && dress.supplier.fullName.toLowerCase().includes(lowerKeyword))
      )
    }

    setFilteredDresses(filtered)
  }

  const handleEdit = (id: string) => {
    navigate(`/dress/${id}`)
  }

  const handleDelete = (dress: Dress) => {
    setSelectedDress(dress)
    setOpenDialog(true)
  }

  const confirmDelete = async () => {
    if (!selectedDress) return

    try {
      await DressService.deleteDress(selectedDress._id!)
      setDresses(dresses.filter(d => d._id !== selectedDress._id))
      setOpenDialog(false)
    } catch (error) {
      console.error('Error deleting dress:', error)
    }
  }

  const columns: GridColDef[] = [
    {
      field: 'image',
      headerName: '',
      width: 70,
      renderCell: (params: GridRenderCellParams) => (
        <Avatar src={params.value} alt={params.row.name} />
      ),
    },
    { field: 'name', headerName: strings.NAME, width: 200 },
    {
      field: 'rentals',
      headerName: strings.RENTALS_COUNT || 'Rentals',
      width: 120,
      valueGetter: (params: GridValueGetterParams) => params.value || 0
    },
    {
      field: 'type',
      headerName: strings.DRESS_TYPE,
      width: 150,
      valueGetter: (params: GridValueGetterParams) => {
        const type = params.value
        switch (type) {
          case 'Wedding': return strings.WEDDING
          case 'Evening': return strings.EVENING
          case 'Cocktail': return strings.COCKTAIL
          case 'Prom': return strings.PROM
          default: return strings.OTHER
        }
      }
    },
    {
      field: 'size',
      headerName: strings.DRESS_SIZE,
      width: 120,
      valueGetter: (params: GridValueGetterParams) => {
        const size = params.value
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
    },
    {
      field: 'actions',
      headerName: strings.ACTIONS,
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <Button
            variant="text"
            color="primary"
            size="small"
            onClick={() => handleEdit(params.row._id)}
          >
            <Edit />
          </Button>
          <Button
            variant="text"
            color="error"
            size="small"
            onClick={() => handleDelete(params.row)}
          >
            <Delete />
          </Button>
        </Box>
      ),
    },
  ]

  return (
    <div style={{ height: 600, width: '100%' }}>
      <DataGrid
        rows={filteredDresses}
        columns={columns}
        getRowId={(row) => row._id}
        loading={loading || externalLoading}
        initialState={{
          sorting: {
            sortModel: [{ field: 'rentals', sort: 'desc' }],
          },
        }}
        sortingMode="client"
        disableRowSelectionOnClick
      />

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{strings.CONFIRM_DELETE}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {strings.DELETE_DRESS_CONFIRM}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} color="primary">
            {strings.CANCEL}
          </Button>
          <Button onClick={confirmDelete} color="error" autoFocus>
            {strings.DELETE}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
