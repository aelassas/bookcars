import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Container,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  FormControlLabel,
  Switch,
  Box,
  Snackbar,
  Alert
} from '@mui/material'
import { Dress } from ':bookcars-types'
import * as DressService from '../services/DressService'
import { strings } from '../lang/dresses'
import { strings as commonStrings } from '../lang/common'
import * as helper from '../common/helper'
import env from '../config/env.config'
import Layout from '../components/Layout'
import DressTypeList from '../components/DressTypeList'
import DressSizeList from '../components/DressSizeList'
import DressStyleList from '../components/DressStyleList'
import SupplierSelectList from '../components/SupplierSelectList'
import LocationSelectList from '../components/LocationSelectList'

const CreateDress: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<Dress>>({
    name: '',
    type: '',
    size: '',
    style: '',
    color: '',
    price: 0,
    deposit: 0,
    minimumAge: env.MINIMUM_AGE,
    available: true,
    locations: [],
    rentals: 0
  })
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const currentUser = helper.getUser()
    setUser(currentUser)

    if (currentUser && !helper.admin(currentUser)) {
      setFormData(prev => ({
        ...prev,
        supplier: currentUser._id
      }))
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleTypeChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      type: value
    }))
  }

  const handleSizeChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      size: value
    }))
  }

  const handleStyleChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      style: value
    }))
  }

  const handleSupplierChange = (values: bookcarsTypes.Option[]) => {
    const supplierId = values.length > 0 ? values[0]._id : ''
    setFormData(prev => ({
      ...prev,
      supplier: supplierId
    }))
  }

  const handleLocationsChange = (values: bookcarsTypes.Option[]) => {
    const locationIds = values.map(option => option._id)
    setFormData(prev => ({
      ...prev,
      locations: locationIds
    }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setImage(file)

      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target) {
          setImagePreview(event.target.result as string)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setLoading(true)
      setError(null)

      // Validate form data
      if (!formData.name || !formData.type || !formData.size || !formData.style || !formData.color ||
          !formData.supplier || !formData.locations || formData.locations.length === 0) {
        setError(commonStrings.REQUIRED_FIELDS)
        setLoading(false)
        return
      }

      // Create dress
      const result = await DressService.createDress(formData as Dress)
      const dressId = result.data._id

      // Upload image if selected
      if (image) {
        const formData = new FormData()
        formData.append('image', image)
        formData.append('id', dressId)
        await DressService.uploadDressImage(formData)
      }

      setSuccess(true)
      setTimeout(() => {
        navigate('/dresses')
      }, 2000)
    } catch (err) {
      console.error(err)
      setError(commonStrings.GENERIC_ERROR)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <Container maxWidth="md">
        <Paper elevation={3} sx={{ p: 4, mt: 4, mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            {strings.CREATE_DRESS}
          </Typography>

          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="dress-image-upload"
                    type="file"
                    onChange={handleImageChange}
                  />
                  <label htmlFor="dress-image-upload">
                    <Button variant="outlined" component="span" sx={{ mb: 2 }}>
                      {commonStrings.UPLOAD_IMAGE}
                    </Button>
                  </label>
                  {imagePreview && (
                    <Box sx={{ mt: 2 }}>
                      <img
                        src={imagePreview}
                        alt="Dress preview"
                        style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'cover' }}
                      />
                    </Box>
                  )}
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  name="name"
                  label={strings.NAME}
                  value={formData.name}
                  onChange={handleInputChange}
                  fullWidth
                  required
                />
              </Grid>

              {helper.admin(user) && (
                <Grid item xs={12} sm={6}>
                  <SupplierSelectList
                    label={commonStrings.SUPPLIER}
                    required
                    onChange={handleSupplierChange}
                  />
                </Grid>
              )}

              <Grid item xs={12} sm={6}>
                <DressTypeList
                  label={strings.DRESS_TYPE}
                  required
                  onChange={handleTypeChange}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <DressSizeList
                  label={strings.DRESS_SIZE}
                  required
                  onChange={handleSizeChange}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <DressStyleList
                  label={strings.DRESS_STYLE}
                  required
                  onChange={handleStyleChange}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  name="color"
                  label={strings.COLOR}
                  value={formData.color}
                  onChange={handleInputChange}
                  fullWidth
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  name="price"
                  label={strings.PRICE}
                  type="number"
                  value={formData.price}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  InputProps={{
                    startAdornment: <span>$</span>
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  name="deposit"
                  label={strings.DEPOSIT}
                  type="number"
                  value={formData.deposit}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  InputProps={{
                    startAdornment: <span>$</span>
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  name="minimumAge"
                  label={strings.MINIMUM_AGE}
                  type="number"
                  value={formData.minimumAge}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  InputProps={{
                    inputProps: { min: env.MINIMUM_AGE }
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <LocationSelectList
                  label={strings.LOCATIONS}
                  multiple
                  required
                  onChange={handleLocationsChange}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      name="available"
                      checked={formData.available}
                      onChange={handleInputChange}
                      color="primary"
                    />
                  }
                  label={strings.AVAILABLE}
                />
              </Grid>

              <Grid item xs={12}>
                <Box display="flex" justifyContent="flex-end" gap={2}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/dresses')}
                    disabled={loading}
                  >
                    {commonStrings.CANCEL}
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={loading}
                  >
                    {commonStrings.CREATE}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Container>
    </Layout>
  )
}

export default CreateDress
