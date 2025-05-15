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
  onLoad?: (data: Dress[]) => void
}

const DressList: React.FC<DressListProps> = ({ onLoad }) => {
  const navigate = useNavigate()
  const [dresses, setDresses] = useState<Dress[]>([])
  const [loading, setLoading] = useState(false)
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedDress, setSelectedDress] = useState<Dress | null>(null)

  useEffect(() => {
    fetchDresses()
  }, [])

  const fetchDresses = async () => {
    try {
      setLoading(true)
      const result = await DressService.getDresses(1, 100)
      setDresses(result.data.docs)
      if (onLoad) {
        onLoad(result.data.docs)
      }
    } catch (error) {
      console.error('Error fetching dresses:', error)
    } finally {
      setLoading(false)
    }
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
          case 'X
